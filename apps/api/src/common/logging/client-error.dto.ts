import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class ClientErrorDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  eventId: string;

  @ApiProperty({ enum: ['browser', 'web-server'] })
  @IsIn(['browser', 'web-server'])
  source: 'browser' | 'web-server';

  @ApiProperty({ enum: ['runtime', 'rejection', 'react', 'api', 'server'] })
  @IsIn(['runtime', 'rejection', 'react', 'api', 'server'])
  kind: 'runtime' | 'rejection' | 'react' | 'api' | 'server';

  @ApiProperty({ example: '/ko-KR/game/wordle' })
  @IsString()
  @MaxLength(200)
  @Matches(/^\/[^?#]*$/)
  path: string;

  @ApiProperty({ example: 'TypeError' })
  @IsString()
  @MaxLength(100)
  errorName: string;

  @ApiProperty({ maxLength: 500 })
  @IsString()
  @MaxLength(500)
  message: string;

  @ApiPropertyOptional({ maxLength: 4000 })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  stack?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  relatedRequestId?: string;

  @ApiPropertyOptional({ minimum: 400, maximum: 599 })
  @IsOptional()
  @IsInt()
  @Min(400)
  @Max(599)
  statusCode?: number;
}
