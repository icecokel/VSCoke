import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiOkResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiErrorResponseDto } from '../common/dto/api-error-response.dto';
import { ResumeSlugParamsDto } from '../resume/resume.dto';
import { CareerDataGuard } from './career-data.guard';
import { CareerDataService } from './career-data.service';
import {
  CareerDataSnapshotDto,
  CareerDataUpsertDto,
  CareerDetailResultDto,
  CareerPublishResultDto,
  ManagedResumeDto,
  ResumeDetailSaveDto,
  ResumeSaveResultDto,
  ResumeVersionSaveDto,
  ResumeVisibilityDto,
  RevisionDto,
} from './career-data.dto';

@ApiTags('Career management')
@ApiBearerAuth()
@UseGuards(CareerDataGuard)
@ApiUnauthorizedResponse({
  description: '관리 Bearer 인증 실패',
  type: ApiErrorResponseDto,
})
@ApiServiceUnavailableResponse({
  description: '관리 키 미설정',
  type: ApiErrorResponseDto,
})
@ApiBadRequestResponse({
  description: '관리 입력 또는 JSON 구조 오류',
  type: ApiErrorResponseDto,
})
@ApiConflictResponse({
  description: 'revision, 현재 버전 또는 공개 조건 충돌',
  type: ApiErrorResponseDto,
})
@ApiInternalServerErrorResponse({
  description: '원본 저장 또는 조회 실패',
  type: ApiErrorResponseDto,
})
@ApiNotFoundResponse({
  description: '대상 원본 없음',
  type: ApiErrorResponseDto,
})
@Controller('career-data')
export class CareerDataController {
  constructor(private readonly service: CareerDataService) {}
  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: '내부 경력 원본 6개 테이블 조회 (snake_case)' })
  @ApiOkResponse({
    description: '관리 요청 처리 성공',
    type: CareerDataSnapshotDto,
  })
  getData(): Promise<CareerDataSnapshotDto> {
    return this.service.getData();
  }
  @Put()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: '경력 원본과 불렛 관계 원자적 upsert' })
  @ApiOkResponse({
    description: '관리 요청 처리 성공',
    type: CareerDataSnapshotDto,
  })
  upsert(@Body() body: CareerDataUpsertDto): Promise<CareerDataSnapshotDto> {
    return this.service.upsertData(body);
  }
  @Post('facts/:id/publish')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: '현재 공개·확인된 사실을 독립 RAG 원문으로 등록' })
  @ApiOkResponse({
    description: '관리 요청 처리 성공',
    type: CareerPublishResultDto,
  })
  publish(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RevisionDto,
  ): Promise<CareerPublishResultDto> {
    return this.service.publishFact(id, body.expectedRevision);
  }
}

@ApiTags('Career management')
@ApiBearerAuth()
@UseGuards(CareerDataGuard)
@ApiUnauthorizedResponse({
  description: '관리 Bearer 인증 실패',
  type: ApiErrorResponseDto,
})
@ApiServiceUnavailableResponse({
  description: '관리 키 미설정',
  type: ApiErrorResponseDto,
})
@ApiBadRequestResponse({
  description: '관리 입력 또는 JSON 구조 오류',
  type: ApiErrorResponseDto,
})
@ApiConflictResponse({
  description: 'revision, 현재 버전 또는 공개 조건 충돌',
  type: ApiErrorResponseDto,
})
@ApiInternalServerErrorResponse({
  description: '문서 저장 또는 조회 실패',
  type: ApiErrorResponseDto,
})
@ApiNotFoundResponse({
  description: '대상 문서 없음',
  type: ApiErrorResponseDto,
})
@Controller('resume-management')
export class ResumeManagementController {
  constructor(private readonly service: CareerDataService) {}
  @Get('resumes')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: '내부 문서 목록과 현재 revision 조회' })
  @ApiOkResponse({
    description: '관리 요청 처리 성공',
    type: [ManagedResumeDto],
  })
  list(): Promise<ManagedResumeDto[]> {
    return this.service.listResumes();
  }
  @Post('versions')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: '불변 완성 버전과 현재 포인터를 함께 저장' })
  @ApiOkResponse({
    description: '관리 요청 처리 성공',
    type: ResumeSaveResultDto,
  })
  save(@Body() body: ResumeVersionSaveDto): Promise<ResumeSaveResultDto> {
    return this.service.saveVersion(body);
  }
  @Patch('resumes/:id')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: '문서 공개 범위 CAS 변경' })
  @ApiOkResponse({ description: '관리 요청 처리 성공', type: ManagedResumeDto })
  visibility(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ResumeVisibilityDto,
  ): Promise<ManagedResumeDto> {
    return this.service.setVisibility(id, body);
  }
  @Put('details/:slug')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: '상세 본문·의존성·검색 원문 원자적 upsert' })
  @ApiOkResponse({
    description: '관리 요청 처리 성공',
    type: CareerDetailResultDto,
  })
  detail(
    @Param() params: ResumeSlugParamsDto,
    @Body() body: ResumeDetailSaveDto,
  ): Promise<CareerDetailResultDto> {
    return this.service.saveDetail(params.slug, body);
  }
}
