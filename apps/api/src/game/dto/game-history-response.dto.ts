import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GameType } from '../enums/game-type.enum';

export class GameHistoryUserDto {
  @ApiProperty({ description: '사용자 닉네임', example: '홍길동' })
  displayName: string;
}

export class GameHistoryResponseDto {
  @ApiProperty({
    description: '게임 기록 ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({ type: 'integer', description: '점수', example: 100 })
  score: number;

  @ApiProperty({
    description: '게임 타입',
    enum: GameType,
    example: GameType.SKY_DROP,
  })
  gameType: GameType;

  @ApiProperty({
    description: '생성 일시',
    example: '2024-01-30T12:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({ description: '사용자 정보', type: GameHistoryUserDto })
  user: GameHistoryUserDto;

  @ApiPropertyOptional({
    description:
      '이번 판보다 높은 사용자별 최고점 개수 + 1. 본인의 과거 최고점도 비교하며 Top 10 밖도 숫자. 공개 결과 조회에서는 생략',
    example: 1,
    type: 'integer',
  })
  rank?: number;

  @ApiPropertyOptional({
    description: '유저의 역대 최고 점수',
    example: 1200,
    type: 'integer',
  })
  bestScore?: number;

  @ApiPropertyOptional({
    description: '전체 기간 랭킹',
    example: 42,
    type: 'integer',
  })
  allTimeRank?: number;

  @ApiPropertyOptional({
    description: '금주 랭킹 (KST 월요일 0시 ~ 일요일 24시 기준)',
    example: 5,
    type: 'integer',
  })
  weeklyRank?: number;
}
