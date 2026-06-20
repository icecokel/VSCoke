import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { GameType } from '../enums/game-type.enum';
import { SKY_DROP_SCORE_POLICY } from '../game-score-policy';

export class CreateGameHistoryDto {
  @ApiProperty({
    description: '게임별 서버 정책 범위 안의 정수 점수',
    example: 8500,
    minimum: SKY_DROP_SCORE_POLICY.minScore,
    maximum: SKY_DROP_SCORE_POLICY.maxScore,
  })
  @IsInt()
  @Min(SKY_DROP_SCORE_POLICY.minScore)
  @Max(SKY_DROP_SCORE_POLICY.maxScore)
  score: number;

  @ApiPropertyOptional({
    description:
      '플레이 시간(초). 제출되면 점수 대비 비정상 속도 검증에 사용된다.',
    example: 120,
    minimum: SKY_DROP_SCORE_POLICY.minPlayTimeSeconds,
    maximum: SKY_DROP_SCORE_POLICY.maxPlayTimeSeconds,
  })
  @IsInt()
  @Min(SKY_DROP_SCORE_POLICY.minPlayTimeSeconds)
  @Max(SKY_DROP_SCORE_POLICY.maxPlayTimeSeconds)
  @IsOptional()
  playTime?: number;

  @ApiProperty({
    enum: GameType,
    enumName: 'GameType',
    example: GameType.SKY_DROP,
  })
  @IsEnum(GameType)
  gameType: GameType;
}
