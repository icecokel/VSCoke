import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  Validate,
  ValidateNested,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { CanonicalCompetitiveAction } from '@vscoke/poke-lounge-battle';

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export class CompetitiveActionDto {
  @ApiProperty({ enum: ['move', 'switch'] })
  @IsIn(['move', 'switch'])
  kind!: CanonicalCompetitiveAction['kind'];

  @ApiPropertyOptional({ example: 'steady-strike' })
  @ValidateIf((value: CompetitiveActionDto) => value.kind === 'move')
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  moveId?: string;

  @ApiPropertyOptional({ minimum: 0 })
  @ValidateIf((value: CompetitiveActionDto) => value.kind === 'switch')
  @IsInt()
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER)
  slotIndex?: number;
}

@ValidatorConstraint({ name: 'competitiveActionShape', async: false })
class CompetitiveActionShapeConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (!value || typeof value !== 'object') {
      return false;
    }
    const record = value as Record<string, unknown>;
    const keys = Object.entries(record)
      .filter(([, entry]) => entry !== undefined)
      .map(([key]) => key)
      .sort();

    return record.kind === 'move'
      ? keys.join(',') === 'kind,moveId'
      : record.kind === 'switch' && keys.join(',') === 'kind,slotIndex';
  }

  defaultMessage(): string {
    return 'action must contain exactly one legal move or switch variant';
  }
}

export class SubmitCompetitiveActionDto {
  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER)
  assignmentRevision!: number;

  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER)
  turn!: number;

  @ApiProperty({ format: 'uuid' })
  @IsString()
  @Matches(UUID_V4_PATTERN)
  clientCommandId!: string;

  @ApiProperty({ type: CompetitiveActionDto })
  @Validate(CompetitiveActionShapeConstraint)
  @ValidateNested()
  @Type(() => CompetitiveActionDto)
  action!: CompetitiveActionDto;
}

export function toCanonicalCompetitiveAction(
  action: CompetitiveActionDto,
): CanonicalCompetitiveAction {
  return action.kind === 'move'
    ? { kind: 'move', moveId: action.moveId ?? '' }
    : { kind: 'switch', slotIndex: action.slotIndex ?? -1 };
}
