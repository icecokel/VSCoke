import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GameType } from '../enums/game-type.enum';

export class GameRankingUserDto {
  @ApiProperty({ description: '사용자 Google ID' })
  id: string;

  @ApiProperty({ description: '사용자 이메일' })
  email: string;

  @ApiProperty({ description: '사용자 이름', example: 'Gil' })
  firstName: string;

  @ApiProperty({ description: '사용자 성', example: 'Dong' })
  lastName: string;
}

export class GameRankingHistoryDto {
  @ApiProperty({
    description: '게임 기록 ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({ description: '점수', example: 100 })
  score: number;

  @ApiProperty({
    description: '게임 타입',
    enum: GameType,
    example: GameType.SKY_DROP,
  })
  gameType: GameType;

  @ApiPropertyOptional({ description: '플레이 시간(ms)', example: 60000 })
  playTime?: number;

  @ApiProperty({
    description: '생성 일시',
    example: '2024-01-30T12:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({ description: '사용자 ID' })
  userId: string;

  @ApiProperty({ description: '사용자 정보', type: GameRankingUserDto })
  user: GameRankingUserDto;
}
