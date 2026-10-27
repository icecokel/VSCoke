import { Controller, Get, Header, Param, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiServiceUnavailableResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiErrorResponseDto } from '../common/dto/api-error-response.dto';
import {
  ResumeDetailDto,
  ResumeDetailSummaryDto,
  ResumeDocumentDto,
  ResumeQueryDto,
  ResumePreviewDto,
  ResumeSlugParamsDto,
} from './resume.dto';
import { ResumeService } from './resume.service';

@ApiTags('Resume')
@Controller('resume')
@ApiInternalServerErrorResponse({
  description: '이력서 조회 중 서버 오류',
  type: ApiErrorResponseDto,
})
export class ResumeController {
  constructor(private readonly resumeService: ResumeService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: '언어별 공개 이력서 조회' })
  @ApiOkResponse({ description: '이력서 조회 성공', type: ResumeDocumentDto })
  @ApiBadRequestResponse({
    description: '지원하지 않는 언어',
    type: ApiErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: '해당 언어의 이력서가 없음',
    type: ApiErrorResponseDto,
  })
  getDocument(@Query() query: ResumeQueryDto): Promise<ResumeDocumentDto> {
    return this.resumeService.getDocument(query.locale, query.resume);
  }

  @ApiServiceUnavailableResponse({
    description: '연결 상세를 구성할 수 없음. 다시 시도 필요',
    type: ApiErrorResponseDto,
  })
  @Get('preview')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: '선택 문서와 상세의 원자적 PDF 미리보기 조회' })
  @ApiOkResponse({
    description: '문서와 상세 snapshot 조회 성공',
    type: ResumePreviewDto,
  })
  @ApiNotFoundResponse({
    description: '공개 문서 또는 연결 상세 없음',
    type: ApiErrorResponseDto,
  })
  getPreview(@Query() query: ResumeQueryDto): Promise<ResumePreviewDto> {
    return this.resumeService.getPreview(query.locale, query.resume);
  }

  @Get('details')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: '경력기술서 요약 목록 조회' })
  @ApiOkResponse({
    description: 'slug 오름차순 경력기술서 요약 목록',
    type: [ResumeDetailSummaryDto],
  })
  getDetails(): Promise<ResumeDetailSummaryDto[]> {
    return this.resumeService.getDetails();
  }

  @Get('details/:slug')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: '경력기술서 상세 조회' })
  @ApiOkResponse({ description: '경력기술서 조회 성공', type: ResumeDetailDto })
  @ApiBadRequestResponse({
    description: 'slug 형식 또는 길이가 잘못됨',
    type: ApiErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: '해당 경력기술서가 없음',
    type: ApiErrorResponseDto,
  })
  getDetail(@Param() params: ResumeSlugParamsDto): Promise<ResumeDetailDto> {
    return this.resumeService.getDetail(params.slug);
  }
}
