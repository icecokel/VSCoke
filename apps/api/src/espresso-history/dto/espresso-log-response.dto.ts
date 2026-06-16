import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  EspressoAdjustmentGuideDto,
  EspressoCurrentAnalysisDto,
  EspressoNextTestDto,
} from './espresso-common.dto';
import { EspressoRoundResponseDto } from './espresso-round-response.dto';

export class EspressoLogResponseDto {
  @ApiProperty({
    description: '추출 로그 ID',
    example: 'fritz-jal-doeeo-gasina-log',
  })
  id: string;

  @ApiProperty({
    enum: ['espresso-log'],
    description: '로그 타입',
    example: 'espresso-log',
  })
  type: 'espresso-log';

  @ApiProperty({ description: '추출 로그 제목', example: '추출 세팅' })
  title: string;

  @ApiProperty({ type: [EspressoRoundResponseDto], description: '라운드 기록' })
  rounds: EspressoRoundResponseDto[];

  @ApiPropertyOptional({
    type: EspressoCurrentAnalysisDto,
    description: '현재 기준 분석',
  })
  currentAnalysis?: EspressoCurrentAnalysisDto;

  @ApiPropertyOptional({
    type: [EspressoAdjustmentGuideDto],
    description: '조건별 조정 가이드',
  })
  adjustmentGuide?: EspressoAdjustmentGuideDto[];

  @ApiPropertyOptional({ type: [String], description: '최종 가설' })
  finalHypothesis?: string[];

  @ApiPropertyOptional({
    type: EspressoNextTestDto,
    description: '다음 테스트 세팅',
  })
  nextTest?: EspressoNextTestDto;

  @ApiPropertyOptional({ type: [String], description: '다음 방향' })
  nextDirection?: string[];
}
