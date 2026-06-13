import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GeekNewsController } from './geeknews.controller';
import { GeekNewsService } from './geeknews.service';
import { GeekNewsCrawlerService } from './geeknews.crawler.service';
import { GeekNewsTranslationService } from './geeknews.translation.service';
import { GeekNewsSchedulerService } from './geeknews.scheduler.service';
import { GeekNewsArticle } from './entities/geeknews-article.entity';

@Module({
  imports: [TypeOrmModule.forFeature([GeekNewsArticle])],
  controllers: [GeekNewsController],
  providers: [
    GeekNewsService,
    GeekNewsCrawlerService,
    GeekNewsTranslationService,
    GeekNewsSchedulerService,
  ],
  exports: [GeekNewsService],
})
export class GeekNewsModule {}
