import {
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GeekNewsService } from './geeknews.service';
import { GeekNewsArticleResponseDto } from './dto/geeknews-article-response.dto';
import { GeekNewsSyncResponseDto } from './dto/geeknews-sync-response.dto';

@ApiTags('GeekNews')
@Controller('geeknews')
export class GeekNewsController {
  constructor(private readonly geekNewsService: GeekNewsService) {}

  @Post('sync')
  @ApiOperation({ summary: '긱뉴스 최신 글을 수동으로 동기화' })
  @ApiOkResponse({ type: GeekNewsSyncResponseDto })
  async syncLatestTopics(): Promise<GeekNewsSyncResponseDto> {
    return this.geekNewsService.syncLatestTopics();
  }

  @Get('articles')
  @ApiOperation({ summary: '저장된 긱뉴스 번역 결과 조회' })
  @ApiOkResponse({ type: [GeekNewsArticleResponseDto] })
  async getLatestArticles(
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ): Promise<GeekNewsArticleResponseDto[]> {
    return this.geekNewsService.getLatestArticles(limit);
  }

  @Get('articles/:id')
  @ApiOperation({ summary: '저장된 긱뉴스 번역 결과 상세 조회' })
  @ApiOkResponse({ type: GeekNewsArticleResponseDto })
  async getArticleById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<GeekNewsArticleResponseDto> {
    return this.geekNewsService.getArticleById(id);
  }
}
