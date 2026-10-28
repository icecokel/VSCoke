import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsDefined,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
  registerDecorator,
} from 'class-validator';
import {
  ResumeContentDto,
  resumeLocales,
  type ResumeLocale,
} from '../resume/resume.dto';

export const isBoundedJson = (value: unknown, depth = 0): boolean => {
  if (depth > 16) return false;
  if (value === null || typeof value === 'boolean') return true;
  if (typeof value === 'string') return value.length <= 100000;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value))
    return (
      value.length <= 500 &&
      value.every((entry: unknown) => isBoundedJson(entry, depth + 1))
    );
  if (
    typeof value !== 'object' ||
    Object.getPrototypeOf(value) !== Object.prototype
  )
    return false;
  return (
    Object.entries(value).length <= 100 &&
    Object.entries(value).every(
      ([key, entry]) =>
        key.length <= 160 &&
        !['__proto__', 'constructor', 'prototype'].includes(key) &&
        isBoundedJson(entry, depth + 1),
    )
  );
};
const text = (value: unknown): boolean =>
  typeof value === 'string' && value.trim().length > 0;
const jsonRule =
  (name: string, check: (value: unknown) => boolean): PropertyDecorator =>
  (target, property) =>
    registerDecorator({
      name,
      target: target.constructor,
      propertyName: String(property),
      validator: {
        validate: (value: unknown) => isBoundedJson(value) && check(value),
        defaultMessage: () =>
          `${String(property)} has an invalid JSON structure`,
      },
    });
const object = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);
export const validEvidence = (value: unknown): boolean =>
  Array.isArray(value) &&
  value.length <= 100 &&
  value.every((source: unknown) => {
    if (
      !object(source) ||
      ![
        'code',
        'git',
        'document',
        'user_statement',
        'external_report',
        'inference',
      ].includes(String(source.kind)) ||
      !text(source.locator) ||
      typeof source.as_of !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(source.as_of)
    )
      return false;
    const date = new Date(source.as_of);
    return (
      !Number.isNaN(date.getTime()) &&
      date.toISOString().slice(0, 10) === source.as_of
    );
  });
export const validMetric = (value: unknown): boolean =>
  value === null ||
  (object(value) &&
    ((typeof value.value === 'number' && Number.isFinite(value.value)) ||
      text(value.value)) &&
    text(value.unit) &&
    ['measured_by', 'environment', 'period', 'conditions'].every(
      (key) => value[key] === null || text(value[key]),
    ));

export class RevisionDto {
  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  @Max(2147483646)
  expectedRevision: number;
}
export class CareerIdentityDto extends RevisionDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() id: string;
}
export class CareerExperienceDto extends CareerIdentityDto {
  @ApiProperty() @IsString() @Matches(/\S/) @MaxLength(500) company: string;
  @ApiProperty() @IsString() @Matches(/\S/) @MaxLength(500) title: string;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/\S/)
  @MaxLength(500)
  project: string | null = null;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/\S/)
  @MaxLength(500)
  publicTitle: string | null = null;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  periodStart: string | null = null;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  periodEnd: string | null = null;
}
export class CareerFactDto extends CareerIdentityDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() experienceId: string;
  @ApiProperty({
    enum: [
      'context',
      'decision',
      'action',
      'ownership',
      'collaboration',
      'validation',
      'result',
      'limitation',
    ],
  })
  @IsIn([
    'context',
    'decision',
    'action',
    'ownership',
    'collaboration',
    'validation',
    'result',
    'limitation',
  ])
  kind: string;
  @ApiProperty() @IsString() @Matches(/\S/) @MaxLength(20000) content: string;
  @ApiProperty({
    enum: ['confirmed', 'needs_confirmation', 'retracted'],
    default: 'needs_confirmation',
  })
  @IsIn(['confirmed', 'needs_confirmation', 'retracted'])
  verificationStatus: string = 'needs_confirmation';
  @ApiProperty({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
    description:
      'kind, locator, as_of(YYYY-MM-DD) 필수. 추가 내부 JSON 필드 보존',
  })
  @jsonRule('evidence', validEvidence)
  evidence: Record<string, unknown>[];
  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    nullable: true,
    description:
      'value, unit, measured_by, environment, period, conditions 필수. 미확인 측정 조건은 null',
  })
  @jsonRule('metric', validMetric)
  metric: Record<string, unknown> | null = null;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/\S/)
  @MaxLength(5000)
  claimBoundary: string | null = null;
  @ApiProperty({ enum: ['private', 'public'], default: 'private' })
  @IsIn(['private', 'public'])
  visibility: string = 'private';
}
export class CareerBulletFactDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() factId: string;
  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  @Max(2147483647)
  factRevision: number;
}
export class CareerBulletDto extends CareerIdentityDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() experienceId: string;
  @ApiProperty() @IsString() @Matches(/\S/) @MaxLength(20000) text: string;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/\S/)
  @MaxLength(1000)
  focus: string | null = null;
  @ApiProperty({
    enum: ['draft', 'ready', 'needs_review', 'retired'],
    default: 'draft',
  })
  @IsIn(['draft', 'ready', 'needs_review', 'retired'])
  status: string = 'draft';
  @ApiProperty({ enum: ['private', 'public'], default: 'private' })
  @IsIn(['private', 'public'])
  visibility: string = 'private';
  @ApiPropertyOptional({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
  })
  @jsonRule(
    'sourceRefs',
    (value) => Array.isArray(value) && value.every(object),
  )
  sourceRefs: Record<string, unknown>[] = [];
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  @Matches(/\S/)
  reviewNote: string | null = null;
  @ApiProperty({ type: [CareerBulletFactDto] })
  @IsArray()
  @ArrayMaxSize(200)
  @ArrayUnique((link: unknown) => (object(link) ? link.factId : link))
  @IsObject({ each: true })
  @ValidateNested({ each: true })
  @Type(() => CareerBulletFactDto)
  facts: CareerBulletFactDto[];
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(200)
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  keywordIds: string[];
}
export class CareerKeywordDto extends CareerIdentityDto {
  @ApiProperty()
  @IsString()
  @MaxLength(80)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  key: string;
  @ApiProperty() @IsString() @Matches(/\S/) @MaxLength(500) label: string;
  @ApiProperty({ enum: ['technology', 'task', 'competency'] })
  @IsIn(['technology', 'task', 'competency'])
  kind: string;
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @Matches(/\S/, { each: true })
  @MaxLength(500, { each: true })
  aliases: string[];
}
export class CareerDataUpsertDto {
  @ApiProperty({ type: [CareerExperienceDto] })
  @IsArray()
  @ArrayMaxSize(200)
  @ArrayUnique((row: unknown) => (object(row) ? row.id : row))
  @IsObject({ each: true })
  @ValidateNested({ each: true })
  @Type(() => CareerExperienceDto)
  experiences: CareerExperienceDto[];
  @ApiProperty({ type: [CareerFactDto] })
  @IsArray()
  @ArrayMaxSize(500)
  @ArrayUnique((row: unknown) => (object(row) ? row.id : row))
  @IsObject({ each: true })
  @ValidateNested({ each: true })
  @Type(() => CareerFactDto)
  facts: CareerFactDto[];
  @ApiProperty({ type: [CareerBulletDto] })
  @IsArray()
  @ArrayMaxSize(500)
  @ArrayUnique((row: unknown) => (object(row) ? row.id : row))
  @IsObject({ each: true })
  @ValidateNested({ each: true })
  @Type(() => CareerBulletDto)
  bullets: CareerBulletDto[];
  @ApiProperty({ type: [CareerKeywordDto] })
  @IsArray()
  @ArrayMaxSize(200)
  @ArrayUnique((row: unknown) => (object(row) ? row.id : row))
  @IsObject({ each: true })
  @ValidateNested({ each: true })
  @Type(() => CareerKeywordDto)
  keywords: CareerKeywordDto[];
}
export class CareerDependencyDto {
  @ApiProperty({ enum: ['experience', 'fact', 'bullet', 'keyword'] })
  @IsIn(['experience', 'fact', 'bullet', 'keyword'])
  kind: 'experience' | 'fact' | 'bullet' | 'keyword';
  @ApiProperty({ format: 'uuid' }) @IsUUID() id: string;
  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  @Max(2147483647)
  revision: number;
}
export class ResumeVersionSaveDto extends RevisionDto {
  @ApiProperty()
  @IsString()
  @MaxLength(80)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  key: string;
  @ApiProperty({ enum: ['base', 'targeted'] })
  @IsIn(['base', 'targeted'])
  kind: string;
  @ApiProperty({ enum: ['front-end', 'product-engineer'] })
  @IsIn(['front-end', 'product-engineer'])
  track: string;
  @ApiProperty({ enum: resumeLocales })
  @IsIn(resumeLocales)
  locale: ResumeLocale;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/\S/)
  @MaxLength(80)
  targetKey: string | null = null;
  @ApiProperty({ enum: ['private', 'public'], default: 'private' })
  @IsIn(['private', 'public'])
  visibility: string = 'private';
  @ApiProperty({ type: String, nullable: true, format: 'uuid' })
  @ValidateIf((_object, value: unknown) => value !== null)
  @IsUUID()
  expectedCurrentVersionId: string | null;
  @ApiProperty() @IsString() @Matches(/\S/) @MaxLength(120) versionName: string;
  @ApiPropertyOptional({ type: String, nullable: true, format: 'uuid' })
  @IsOptional()
  @IsUUID()
  parentVersionId: string | null = null;
  @ApiProperty({ type: ResumeContentDto })
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => ResumeContentDto)
  content: ResumeContentDto;
  @ApiProperty({ type: [CareerDependencyDto] })
  @IsArray()
  @ArrayMaxSize(1000)
  @ArrayUnique((row: unknown) =>
    object(row) && typeof row.kind === 'string' && typeof row.id === 'string'
      ? `${row.kind}/${row.id}`
      : row,
  )
  @IsObject({ each: true })
  @ValidateNested({ each: true })
  @Type(() => CareerDependencyDto)
  dependencies: CareerDependencyDto[];
  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    nullable: true,
  })
  @jsonRule('sourceRef', (value) => value === null || object(value))
  sourceRef: Record<string, unknown> | null = null;
}
export class ResumeVisibilityDto extends RevisionDto {
  @ApiProperty({ enum: ['private', 'public'] })
  @IsIn(['private', 'public'])
  visibility: 'private' | 'public';
}
export class ResumeDetailSaveDto extends RevisionDto {
  @ApiProperty() @IsString() @Matches(/\S/) @MaxLength(500) title: string;
  @ApiProperty() @IsString() @MaxLength(100000) content: string;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  startDate: string | null = null;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  endDate: string | null = null;
  @ApiProperty({ enum: ['private', 'public'], default: 'private' })
  @IsIn(['private', 'public'])
  visibility: string = 'private';
  @ApiProperty({ type: [CareerDependencyDto] })
  @IsArray()
  @ArrayMaxSize(1000)
  @ArrayUnique((row: unknown) =>
    object(row) && typeof row.kind === 'string' && typeof row.id === 'string'
      ? `${row.kind}/${row.id}`
      : row,
  )
  @IsObject({ each: true })
  @ValidateNested({ each: true })
  @Type(() => CareerDependencyDto)
  dependencies: CareerDependencyDto[];
}
export class ResumeSaveResultDto {
  @ApiProperty() documentId: string;
  @ApiProperty() key: string;
  @ApiProperty() locale: string;
  @ApiProperty() revision: number;
  @ApiProperty() versionId: string;
  @ApiProperty() versionName: string;
  @ApiProperty({ type: String, nullable: true, format: 'uuid' })
  currentVersionId: string | null;
  @ApiProperty() contentHash: string;
}
export class CareerDeleteResultDto {
  @ApiProperty({ description: '원본/문서/버전 ID 또는 상세 slug' }) id: string;
  @ApiProperty({
    description: '삭제 후 revision. 버전 삭제는 소유 문서 revision',
  })
  revision: number;
  @ApiProperty({ type: String, format: 'date-time' }) deletedAt: string;
}
export class ManagedResumeDto {
  @ApiProperty({ type: String, nullable: true, format: 'date-time' })
  deletedAt: string | null;
  @ApiProperty() id: string;
  @ApiProperty() key: string;
  @ApiProperty() locale: string;
  @ApiProperty() kind: string;
  @ApiProperty() track: string;
  @ApiProperty({ type: String, nullable: true }) targetKey: string | null;
  @ApiProperty() visibility: string;
  @ApiProperty() revision: number;
  @ApiProperty({ type: String, nullable: true, format: 'uuid' })
  currentVersionId: string | null;
}
export class CareerDataSnapshotDto {
  @ApiProperty({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
  })
  experiences: Record<string, unknown>[];
  @ApiProperty({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
  })
  facts: Record<string, unknown>[];
  @ApiProperty({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
  })
  bullets: Record<string, unknown>[];
  @ApiProperty({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
  })
  bulletFacts: Record<string, unknown>[];
  @ApiProperty({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
  })
  keywords: Record<string, unknown>[];
  @ApiProperty({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
  })
  bulletKeywords: Record<string, unknown>[];
}
export class CareerPublishResultDto {
  @ApiProperty() sourceItemId: string;
}
export class CareerDetailResultDto {
  @ApiProperty() slug: string;
  @ApiProperty() revision: number;
}
