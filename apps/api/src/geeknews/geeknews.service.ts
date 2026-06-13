import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { GeekNewsCrawlerService } from './geeknews.crawler.service';
import { GeekNewsTranslationService } from './geeknews.translation.service';
import {
  GeekNewsArticleRecord,
  GeekNewsSyncResult,
  GeekNewsTopicDetail,
  GeekNewsTranslationStatus,
} from './geeknews.types';
import { GeekNewsArticle } from './entities/geeknews-article.entity';

@Injectable()
export class GeekNewsService {
  private readonly logger = new Logger(GeekNewsService.name);
  private isSyncing = false;

  constructor(
    @InjectRepository(GeekNewsArticle)
    private readonly geekNewsArticleRepository: Repository<GeekNewsArticle>,
    private readonly geekNewsCrawlerService: GeekNewsCrawlerService,
    private readonly geekNewsTranslationService: GeekNewsTranslationService,
    private readonly configService: ConfigService,
  ) {}

  async getLatestArticles(limit = 20): Promise<GeekNewsArticleRecord[]> {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const articles = await this.geekNewsArticleRepository.find({
      order: {
        postedAt: 'DESC',
        createdAt: 'DESC',
      },
      take: safeLimit,
    });

    return articles.map((article) => this.toArticleRecord(article));
  }

  async getArticleById(id: string): Promise<GeekNewsArticleRecord> {
    const article = await this.geekNewsArticleRepository.findOne({
      where: { id },
    });

    if (!article) {
      throw new NotFoundException('GeekNews article not found');
    }

    return this.toArticleRecord(article);
  }

  async syncLatestTopics(): Promise<GeekNewsSyncResult> {
    if (this.isSyncing) {
      return {
        status: 'skipped',
        reason: 'sync_in_progress',
        crawledPages: 0,
        crawledTopics: 0,
        createdTopics: 0,
        updatedTopics: 0,
        skippedTopics: 0,
        translatedTopics: 0,
        pendingTopics: 0,
        failedTopics: 0,
        articles: [],
      };
    }

    this.isSyncing = true;

    try {
      const configuredPageLimit = this.configService.get<string | number>(
        'GEEKNEWS_CRAWL_PAGE_LIMIT',
        3,
      );
      const pageLimit = Number(configuredPageLimit) || 3;
      const processedArticles: GeekNewsArticleRecord[] = [];
      let crawledPages = 0;
      let crawledTopics = 0;
      let createdTopics = 0;
      let updatedTopics = 0;
      let skippedTopics = 0;
      let translatedTopics = 0;
      let pendingTopics = 0;
      let failedTopics = 0;

      for (let page = 1; page <= pageLimit; page += 1) {
        const topics = await this.geekNewsCrawlerService.crawlLatestPage(page);

        if (topics.length === 0) {
          break;
        }

        crawledPages += 1;
        crawledTopics += topics.length;

        const existingArticles = await this.geekNewsArticleRepository.find({
          where: {
            sourceTopicId: In(topics.map((topic) => topic.topicId)),
          },
        });
        const existingByTopicId = new Map(
          existingArticles.map((article) => [article.sourceTopicId, article]),
        );
        let pageCreatedTopics = 0;

        for (const topic of topics) {
          const existingArticle = existingByTopicId.get(topic.topicId);

          if (existingArticle) {
            this.mergeTopicSnapshot(existingArticle, topic);
            await this.geekNewsArticleRepository.save(existingArticle);
            updatedTopics += 1;
            skippedTopics += 1;
            continue;
          }

          pageCreatedTopics += 1;
          createdTopics += 1;

          try {
            const detail =
              await this.geekNewsCrawlerService.crawlTopicDetail(topic);
            const article = this.geekNewsArticleRepository.create(
              await this.buildArticleEntity(detail),
            );
            const savedArticle =
              await this.geekNewsArticleRepository.save(article);

            switch (savedArticle.translationStatus) {
              case 'translated':
                translatedTopics += 1;
                break;
              case 'failed':
                failedTopics += 1;
                break;
              default:
                pendingTopics += 1;
                break;
            }

            processedArticles.push(this.toArticleRecord(savedArticle));
          } catch (error) {
            failedTopics += 1;
            createdTopics -= 1;
            pageCreatedTopics -= 1;
            this.logger.error(
              `GeekNews 저장 실패: topicId=${topic.topicId}, error=${error instanceof Error ? error.message : '알 수 없는 오류'}`,
            );
          }
        }

        if (pageCreatedTopics === 0) {
          break;
        }
      }

      return {
        status: 'completed',
        crawledPages,
        crawledTopics,
        createdTopics,
        updatedTopics,
        skippedTopics,
        translatedTopics,
        pendingTopics,
        failedTopics,
        articles: processedArticles,
      };
    } finally {
      this.isSyncing = false;
    }
  }

  private async buildArticleEntity(
    detail: GeekNewsTopicDetail,
  ): Promise<Partial<GeekNewsArticle>> {
    let translationStatus: GeekNewsTranslationStatus = 'pending';
    let translatedTitle: string | null = null;
    let translatedContent: string | null = null;
    let translatedLanguage: string | null =
      this.geekNewsTranslationService.getTargetLanguage();
    let translationProvider: string | null = null;
    let translationModel: string | null = null;
    let translationError: string | null = null;
    let translatedAt: Date | null = null;

    try {
      const translation =
        await this.geekNewsTranslationService.translateContent({
          title: detail.title,
          content: detail.content,
          sourceLanguage: 'ko',
          targetLanguage: this.geekNewsTranslationService.getTargetLanguage(),
        });

      if (translation) {
        translationStatus = 'translated';
        translatedTitle = translation.translatedTitle;
        translatedContent = translation.translatedContent;
        translatedLanguage = translation.targetLanguage;
        translationProvider = translation.provider;
        translationModel = translation.model;
        translatedAt = new Date();
      }
    } catch (error) {
      translationStatus = 'failed';
      translationError =
        error instanceof Error ? error.message : '알 수 없는 번역 오류';
      this.logger.error(
        `GeekNews 번역 실패: topicId=${detail.topicId}, error=${translationError}`,
      );
    }

    return {
      sourceTopicId: detail.topicId,
      topicUrl: detail.topicUrl,
      sourceUrl: detail.sourceUrl,
      title: detail.title,
      content: detail.content,
      author: detail.author,
      points: detail.points,
      commentCount: detail.commentCount,
      rank: detail.rank,
      listedAtText: detail.listedAtText,
      postedAt: detail.postedAt,
      sourceLanguage: 'ko',
      translatedLanguage,
      translatedTitle,
      translatedContent,
      translationStatus,
      translationProvider,
      translationModel,
      translationError,
      translatedAt,
    };
  }

  private mergeTopicSnapshot(
    article: GeekNewsArticle,
    topic: Pick<
      GeekNewsTopicDetail,
      | 'topicUrl'
      | 'sourceUrl'
      | 'title'
      | 'author'
      | 'points'
      | 'commentCount'
      | 'rank'
      | 'listedAtText'
    >,
  ): void {
    article.topicUrl = topic.topicUrl;
    article.sourceUrl = topic.sourceUrl;
    article.title = topic.title;
    article.author = topic.author;
    article.points = topic.points;
    article.commentCount = topic.commentCount;
    article.rank = topic.rank;
    article.listedAtText = topic.listedAtText;
  }

  private toArticleRecord(article: GeekNewsArticle): GeekNewsArticleRecord {
    return {
      id: article.id,
      sourceTopicId: article.sourceTopicId,
      topicUrl: article.topicUrl,
      sourceUrl: article.sourceUrl,
      title: article.title,
      content: article.content,
      translatedTitle: article.translatedTitle,
      translatedContent: article.translatedContent,
      author: article.author,
      points: article.points,
      commentCount: article.commentCount,
      rank: article.rank,
      listedAtText: article.listedAtText,
      postedAt: article.postedAt,
      sourceLanguage: article.sourceLanguage,
      translatedLanguage: article.translatedLanguage,
      translationStatus: article.translationStatus,
      translationProvider: article.translationProvider,
      translationModel: article.translationModel,
      translationError: article.translationError,
      translatedAt: article.translatedAt,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
    };
  }
}
