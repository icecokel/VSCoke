import { Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { GeekNewsTopicDetail, GeekNewsTopicSummary } from './geeknews.types';

@Injectable()
export class GeekNewsCrawlerService {
  private readonly baseUrl = 'https://news.hada.io';
  private readonly requestTimeoutMs = 10000;

  async crawlLatestPage(page: number): Promise<GeekNewsTopicSummary[]> {
    const html = await this.fetchHtml(`/new?page=${page}`);
    const $ = cheerio.load(html);
    const rows = $('.topic_row').toArray();

    return rows
      .map((row, index) => {
        const root = $(row);
        const topicId = Number.parseInt(
          root.attr('data-topic-state-id') ?? '',
          10,
        );

        if (!Number.isFinite(topicId)) {
          return null;
        }

        const titleAnchor = root.find('.topictitle > a').first();
        const summaryAnchor = root.find('.topicdesc a').first();
        const title = this.normalizeText(
          titleAnchor.find('h1').text() || titleAnchor.text(),
        );
        const summary = this.normalizeText(summaryAnchor.text());
        const author = this.normalizeText(
          root.find('.topicinfo a[href^="/@"]').first().text(),
        );
        const points = Number.parseInt(
          this.normalizeText(
            root.find('.topicinfo span[id^="tp"]').first().text(),
          ),
          10,
        );
        const commentText = this.normalizeText(
          root.find('.topicinfo a[href*="go=comments"]').first().text(),
        );
        const topicInfoText = this.normalizeText(
          root.find('.topicinfo').text(),
        );

        return {
          topicId,
          topicUrl: this.toAbsoluteUrl(
            summaryAnchor.attr('href') || `/topic?id=${topicId}`,
          ),
          sourceUrl: this.toAbsoluteUrlOrNull(titleAnchor.attr('href')),
          title,
          summary,
          author,
          points: Number.isFinite(points) ? points : 0,
          commentCount: Number.parseInt(
            commentText.match(/\d+/)?.[0] ?? '0',
            10,
          ),
          rank: (page - 1) * rows.length + index + 1,
          listedAtText: this.extractListedAtText(topicInfoText, author),
        };
      })
      .filter((item): item is GeekNewsTopicSummary => item !== null);
  }

  async crawlTopicDetail(
    topic: GeekNewsTopicSummary,
  ): Promise<GeekNewsTopicDetail> {
    const html = await this.fetchHtml(`/topic?id=${topic.topicId}`);
    const $ = cheerio.load(html);
    const jsonLd = this.findDiscussionPostingJsonLd($);

    const title = this.normalizeText(
      jsonLd?.headline ||
        $('meta[property="og:title"]').attr('content') ||
        topic.title,
    );
    const content = this.normalizeText(
      jsonLd?.text ||
        $('meta[name="description"]').attr('content') ||
        topic.summary,
    );
    const postedAt = this.parseDate(
      jsonLd?.datePublished ||
        $('meta[property="article:published_time"]').attr('content') ||
        null,
    );

    return {
      ...topic,
      title,
      content,
      postedAt,
    };
  }

  private async fetchHtml(path: string): Promise<string> {
    const url = this.toAbsoluteUrl(path);
    const response = await fetch(url, {
      headers: {
        'user-agent':
          'Mozilla/5.0 (compatible; vscoke-api/1.0; +https://news.hada.io)',
        'accept-language': 'ko-KR,ko;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(this.requestTimeoutMs),
    });

    if (!response.ok) {
      throw new Error(`GeekNews responded with ${response.status} for ${url}`);
    }

    return response.text();
  }

  private findDiscussionPostingJsonLd(
    $: cheerio.CheerioAPI,
  ): Record<string, string> | null {
    const scripts = $('script[type="application/ld+json"]').toArray();

    for (const script of scripts) {
      const content = $(script).html();
      if (!content) {
        continue;
      }

      const parsed = this.parseJsonLd(content);
      const entries = Array.isArray(parsed) ? parsed : [parsed];
      const discussionPosting = entries.find(
        (entry) =>
          entry &&
          typeof entry === 'object' &&
          entry['@type'] === 'DiscussionForumPosting',
      );

      if (discussionPosting && typeof discussionPosting === 'object') {
        return discussionPosting as Record<string, string>;
      }
    }

    return null;
  }

  private parseJsonLd(content: string): unknown {
    try {
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  private extractListedAtText(topicInfoText: string, author: string): string {
    if (!topicInfoText || !author) {
      return '';
    }

    const escapedAuthor = author.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = topicInfoText.match(
      new RegExp(`points by ${escapedAuthor}\\s+(.+?)(?:\\s*\\||$)`),
    );

    return this.normalizeText(match?.[1] ?? '');
  }

  private toAbsoluteUrl(path: string): string {
    return new URL(path, this.baseUrl).toString();
  }

  private toAbsoluteUrlOrNull(path?: string): string | null {
    if (!path) {
      return null;
    }

    return this.toAbsoluteUrl(path);
  }

  private parseDate(value: string | null): Date | null {
    if (!value) {
      return null;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private normalizeText(value: string): string {
    return value.replace(/\s+/g, ' ').trim();
  }
}
