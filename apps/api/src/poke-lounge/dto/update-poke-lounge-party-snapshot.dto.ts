import { Type } from 'class-transformer';
import {
  IsInt,
  IsArray,
  IsIn,
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

class PokeLoungePartyMoveDto {
  @ApiProperty({ example: 33 })
  @IsInt()
  @Min(1)
  moveId!: number;

  @ApiProperty({ example: 'Tackle' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 35 })
  @IsInt()
  @Min(0)
  pp!: number;

  @ApiProperty({ example: 35 })
  @IsInt()
  @Min(1)
  maxPp!: number;
}

class PokeLoungePartyPokemonDto {
  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  slotIndex!: number;

  @ApiProperty({ example: 7 })
  @IsInt()
  @Min(1)
  speciesId!: number;

  @ApiProperty({ example: 'Squirtle' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 11 })
  @IsInt()
  @Min(1)
  level!: number;

  @ApiProperty({ example: 24 })
  @IsInt()
  @Min(0)
  currentHp!: number;

  @ApiProperty({ example: 30 })
  @IsInt()
  @Min(1)
  maxHp!: number;

  @ApiProperty({ example: 22 })
  @IsInt()
  @Min(1)
  attack!: number;

  @ApiProperty({ example: 25 })
  @IsInt()
  @Min(1)
  defense!: number;

  @ApiProperty({ example: 18 })
  @IsInt()
  @Min(1)
  speed!: number;

  @ApiProperty({ example: 'normal' })
  @IsIn(['none', 'paralyzed', 'poisoned', 'burned', 'fainted'])
  status!: 'none' | 'paralyzed' | 'poisoned' | 'burned' | 'fainted';

  @ApiProperty({ type: [PokeLoungePartyMoveDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PokeLoungePartyMoveDto)
  moves!: PokeLoungePartyMoveDto[];
}

export class UpdatePokeLoungePartySnapshotDto implements UpdatePokeLoungePartySnapshotInput {
  @ApiProperty({ example: 'player-a' })
  @IsString()
  playerId!: string;

  @ApiProperty({ example: 'session-a' })
  @IsString()
  sessionId!: string;

  @ApiPropertyOptional({ example: 'Player A' })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  activePartySlotIndex?: number;

  @ApiPropertyOptional({ type: [PokeLoungePartyPokemonDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PokeLoungePartyPokemonDto)
  party?: PokeLoungePartyPokemonDto[];

  @ApiPropertyOptional({ type: PokeLoungeRepresentativePokemonDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PokeLoungeRepresentativePokemonDto)
  representativePokemon?: PokeLoungeRepresentativePokemonDto;
}
