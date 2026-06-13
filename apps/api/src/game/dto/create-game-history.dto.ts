import { IsNumber, IsOptional, IsEnum } from 'class-validator';
import { GameType } from '../enums/game-type.enum';

export class CreateGameHistoryDto {
  @IsNumber()
  score: number;

  @IsNumber()
  @IsOptional()
  playTime?: number;

  @IsEnum(GameType)
  gameType: GameType;
}
