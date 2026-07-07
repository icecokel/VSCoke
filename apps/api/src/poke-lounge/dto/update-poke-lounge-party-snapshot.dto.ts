import { Type } from 'class-transformer';
import {
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type {
  PokeLoungePartySnapshot,
  UpdatePokeLoungePartySnapshotInput,
} from './../poke-lounge-room.types';

class PokeLoungeRepresentativePokemonDto implements NonNullable<
  PokeLoungePartySnapshot['representativePokemon']
> {
  @ApiProperty({ example: 25 })
  @IsInt()
  @Min(1)
  speciesId!: number;

  @ApiProperty({ example: 'Pikachu' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 12 })
  @IsInt()
  @Min(1)
  level!: number;

  @ApiProperty({ example: 18 })
  @IsInt()
  @Min(0)
  currentHp!: number;

  @ApiProperty({ example: 30 })
  @IsInt()
  @Min(0)
  maxHp!: number;
}

export class UpdatePokeLoungePartySnapshotDto implements UpdatePokeLoungePartySnapshotInput {
  @ApiProperty({ example: 'player-a' })
  @IsString()
  playerId!: string;

  @ApiPropertyOptional({ example: 'Player A' })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({ type: PokeLoungeRepresentativePokemonDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PokeLoungeRepresentativePokemonDto)
  representativePokemon?: PokeLoungeRepresentativePokemonDto;

  @ApiPropertyOptional({ example: 1720000002000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  nowMs?: number;
}
