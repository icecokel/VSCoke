import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  EspressoRecipeParametersDto,
  EspressoResultDto,
  EspressoRoundAnalysisDto,
} from './espresso-common.dto';

export class EspressoRoundResponseDto {
  @ApiProperty({ description: '라운드 ID', example: 'round-1' })
  id: string;

  @ApiProperty({ description: '라운드 번호', example: 1 })
  roundNumber: number;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: '추출 일자',
    example: '2026-06-16',
  })
  date?: string | null;

  @ApiProperty({
    type: EspressoRecipeParametersDto,
    description: '추출 레시피',
  })
  recipe: EspressoRecipeParametersDto;

  @ApiProperty({ type: EspressoResultDto, description: '추출 결과' })
  result: EspressoResultDto;

  @ApiPropertyOptional({
    type: EspressoRoundAnalysisDto,
    description: '라운드 분석',
  })
  analysis?: EspressoRoundAnalysisDto;

  @ApiProperty({ type: [String], description: '다음 액션' })
  nextActions: string[];
}
