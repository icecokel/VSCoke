import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const espressoUnits = ['g', 'sec', 'celsius', 'bar'] as const;

export class EspressoMeasurementDto {
  @ApiPropertyOptional({ description: '단일 측정값', example: 20 })
  value?: number;

  @ApiPropertyOptional({ description: '범위 최소값', example: 25 })
  min?: number;

  @ApiPropertyOptional({ description: '범위 최대값', example: 30 })
  max?: number;

  @ApiProperty({
    enum: espressoUnits,
    description: '측정 단위',
    example: 'g',
  })
  unit: (typeof espressoUnits)[number];
}

export class EspressoEquipmentDto {
  @ApiPropertyOptional({
    description: '에스프레소 머신',
    example: 'CRM 3605 PWM 2버전',
  })
  machine?: string;

  @ApiPropertyOptional({ description: '그라인더', example: 'DF64 Gen2' })
  grinder?: string;

  @ApiPropertyOptional({ description: '바스켓', example: 'IMS 20g' })
  basket?: string;

  @ApiPropertyOptional({ description: '도징 쉐이커', example: '도징쉐이커' })
  dosingShaker?: string;

  @ApiPropertyOptional({ description: '탬퍼', example: '58.5mm tamper' })
  tamper?: string;
}

export class EspressoRecipeParametersDto {
  @ApiPropertyOptional({ type: EspressoMeasurementDto })
  dose?: EspressoMeasurementDto;

  @ApiPropertyOptional({ type: EspressoMeasurementDto })
  yield?: EspressoMeasurementDto;

  @ApiPropertyOptional({ type: EspressoMeasurementDto })
  temperature?: EspressoMeasurementDto;

  @ApiPropertyOptional({ type: EspressoMeasurementDto })
  preinfusion?: EspressoMeasurementDto;

  @ApiPropertyOptional({ type: EspressoMeasurementDto })
  extractionTime?: EspressoMeasurementDto;

  @ApiPropertyOptional({ type: EspressoMeasurementDto })
  targetExtractionTime?: EspressoMeasurementDto;

  @ApiPropertyOptional({ type: EspressoMeasurementDto })
  pressure?: EspressoMeasurementDto;

  @ApiPropertyOptional({ description: '유량 조건', example: '기본 유량' })
  flow?: string;

  @ApiPropertyOptional({ description: '분쇄도 조건', example: '2.4' })
  grind?: string;
}

export class EspressoResultDto {
  @ApiPropertyOptional({ type: EspressoMeasurementDto })
  extractionTime?: EspressoMeasurementDto;

  @ApiPropertyOptional({ type: EspressoMeasurementDto })
  pressure?: EspressoMeasurementDto;

  @ApiPropertyOptional({ type: [String], description: '맛 기록' })
  taste?: string[];

  @ApiPropertyOptional({ type: [String], description: '추가 메모' })
  notes?: string[];
}

export class EspressoRoundAnalysisDto {
  @ApiPropertyOptional({ type: [String], description: '변경 사항' })
  changes?: string[];

  @ApiPropertyOptional({ type: [String], description: '기록 메모' })
  notes?: string[];

  @ApiPropertyOptional({ type: [String], description: '판단' })
  judgments?: string[];

  @ApiPropertyOptional({ type: [String], description: '추론' })
  inferences?: string[];

  @ApiPropertyOptional({ type: [String], description: '결론' })
  conclusions?: string[];

  @ApiPropertyOptional({ type: [String], description: '비교 예정 항목' })
  plannedComparisons?: string[];
}

export class EspressoCurrentAnalysisDto {
  @ApiPropertyOptional({ type: [String], description: '현재 조건' })
  conditions?: string[];

  @ApiPropertyOptional({ type: [String], description: '추정 문제' })
  suspectedIssues?: string[];
}

export class EspressoAdjustmentGuideDto {
  @ApiProperty({ description: '조정 조건', example: '여전히 20초 이하' })
  condition: string;

  @ApiProperty({
    description: '조정 액션',
    example: '분쇄도 아주 조금만 가늘게',
  })
  action: string;
}

export class EspressoMethodStepDto {
  @ApiProperty({ description: '추출 시점', example: '0-5초' })
  time: string;

  @ApiProperty({ type: [String], description: '수행 단계' })
  steps: string[];
}

export class EspressoNextTestDto {
  @ApiPropertyOptional({ description: '목표 라운드 번호', example: 5 })
  targetRoundNumber?: number;

  @ApiProperty({ type: [String], description: '다음 테스트 목표' })
  goals: string[];

  @ApiProperty({ type: EspressoRecipeParametersDto })
  recipe: EspressoRecipeParametersDto;

  @ApiProperty({ type: [EspressoMethodStepDto] })
  method: EspressoMethodStepDto[];

  @ApiProperty({ type: [String], description: '예상 결과' })
  expectedResult: string[];
}
