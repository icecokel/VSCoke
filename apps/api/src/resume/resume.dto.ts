import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsDefined,
  IsArray,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export const resumeLocales = ['ko-KR', 'en-US', 'ja-JP'] as const;
export type ResumeLocale = (typeof resumeLocales)[number];

export class ResumeContactDto {
  @ApiProperty({ type: String })
  @IsString()
  @MaxLength(20000)
  email: string;

  @ApiProperty({ type: String })
  @IsString()
  @MaxLength(20000)
  phone: string;
}

export class ResumeProjectDescriptionDto {
  @ApiProperty({ type: String })
  @IsString()
  @MaxLength(20000)
  subtitle: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  detail?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  skills?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @MaxLength(10000, { each: true })
  tasks?: string[];

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  achievement?: string;
}

export class ResumeProjectDto {
  @ApiProperty({ type: String })
  @IsString()
  @MaxLength(20000)
  id: string;

  @ApiProperty({ type: String })
  @IsString()
  @MaxLength(20000)
  title: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  period?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  @MaxLength(160)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  fileRef?: string;

  @ApiProperty({ type: [ResumeProjectDescriptionDto] })
  @IsArray()
  @ArrayMaxSize(200)
  @IsDefined()
  @IsObject({ each: true })
  @ValidateNested({ each: true })
  @Type(() => ResumeProjectDescriptionDto)
  descriptions: ResumeProjectDescriptionDto[];
}

export class ResumeCareerDto {
  @ApiProperty({ type: String })
  @IsString()
  @MaxLength(20000)
  id: string;

  @ApiProperty({ type: String })
  @IsString()
  @MaxLength(20000)
  company: string;

  @ApiProperty({ type: String })
  @IsString()
  @MaxLength(20000)
  period: string;

  @ApiProperty({ type: String })
  @IsString()
  @MaxLength(20000)
  employmentType: string;

  @ApiProperty({ type: String })
  @IsString()
  @MaxLength(20000)
  role: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  achievement?: string;

  @ApiProperty({ type: [ResumeProjectDto] })
  @IsArray()
  @ArrayMaxSize(200)
  @IsDefined()
  @IsObject({ each: true })
  @ValidateNested({ each: true })
  @Type(() => ResumeProjectDto)
  projects: ResumeProjectDto[];
}

export class ResumeEducationDto {
  @ApiProperty({ type: String })
  @IsString()
  @MaxLength(20000)
  school: string;

  @ApiProperty({ type: String })
  @IsString()
  @MaxLength(20000)
  period: string;

  @ApiProperty({ type: String })
  @IsString()
  @MaxLength(20000)
  status: string;

  @ApiProperty({ type: String })
  @IsString()
  @MaxLength(20000)
  major: string;
}

export class ResumeCertificationDto {
  @ApiProperty({ type: String })
  @IsString()
  @MaxLength(20000)
  name: string;

  @ApiProperty({ type: String })
  @IsString()
  @MaxLength(20000)
  date: string;

  @ApiProperty({ type: String })
  @IsString()
  @MaxLength(20000)
  type: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @MaxLength(10000, { each: true })
  details: string[];
}

export class ResumePersonalProjectDto {
  @ApiProperty({ type: String })
  @IsString()
  @MaxLength(20000)
  id: string;

  @ApiProperty({ type: String })
  @IsString()
  @MaxLength(20000)
  title: string;

  @ApiProperty({ type: String })
  @IsString()
  @MaxLength(20000)
  description: string;

  @ApiProperty({ type: String })
  @IsString()
  @MaxLength(20000)
  @MaxLength(160)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  fileRef: string;
}

export class ResumeContentDto {
  @ApiProperty({ type: String })
  @IsString()
  @MaxLength(20000)
  name: string;

  @ApiProperty({ type: String })
  @IsString()
  @MaxLength(20000)
  title: string;

  @ApiProperty({ type: ResumeContactDto })
  @IsDefined()
  @IsObject()
  @ValidateNested({ each: false })
  @Type(() => ResumeContactDto)
  contact: ResumeContactDto;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @MaxLength(10000, { each: true })
  introduction: string[];

  @ApiProperty({ type: String })
  @IsString()
  @MaxLength(20000)
  totalExperience: string;

  @ApiProperty({ type: String, description: '이력서 내용 최종 갱신 연월' })
  @IsString()
  @MaxLength(20000)
  lastUpdated: string;

  @ApiProperty({ type: [ResumeCareerDto] })
  @IsArray()
  @ArrayMaxSize(200)
  @IsDefined()
  @IsObject({ each: true })
  @ValidateNested({ each: true })
  @Type(() => ResumeCareerDto)
  careers: ResumeCareerDto[];

  @ApiProperty({ type: [ResumeEducationDto] })
  @IsArray()
  @ArrayMaxSize(200)
  @IsDefined()
  @IsObject({ each: true })
  @ValidateNested({ each: true })
  @Type(() => ResumeEducationDto)
  education: ResumeEducationDto[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @MaxLength(10000, { each: true })
  skills: string[];

  @ApiProperty({ type: [ResumeCertificationDto] })
  @IsArray()
  @ArrayMaxSize(200)
  @IsDefined()
  @IsObject({ each: true })
  @ValidateNested({ each: true })
  @Type(() => ResumeCertificationDto)
  certifications: ResumeCertificationDto[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @MaxLength(10000, { each: true })
  links: string[];

  @ApiProperty({ type: [ResumePersonalProjectDto] })
  @IsArray()
  @ArrayMaxSize(200)
  @IsDefined()
  @IsObject({ each: true })
  @ValidateNested({ each: true })
  @Type(() => ResumePersonalProjectDto)
  personalProjects: ResumePersonalProjectDto[];
}

export class ResumeDocumentDto extends ResumeContentDto {
  @ApiProperty({ enum: resumeLocales })
  locale: ResumeLocale;
  @ApiProperty() documentId: string;
  @ApiProperty() key: string;
  @ApiProperty() versionId: string;
  @ApiProperty() versionName: string;
  @ApiProperty() contentHash: string;
}

export class ResumeDetailSummaryDto {
  @ApiProperty({ type: String })
  @IsString()
  @MaxLength(20000)
  slug: string;

  @ApiProperty({ type: String })
  @IsString()
  @MaxLength(20000)
  title: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  startDate?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  endDate?: string;
}

export class ResumeDetailDto extends ResumeDetailSummaryDto {
  @ApiProperty({ description: '운영자가 관리하는 신뢰된 MDX 본문' })
  @IsString()
  @MaxLength(20000)
  content: string;
}

export class ResumePreviewDto {
  @ApiProperty({ type: ResumeDocumentDto }) document: ResumeDocumentDto;
  @ApiProperty({ type: [ResumeDetailDto] }) details: ResumeDetailDto[];
}

export class ResumeQueryDto {
  @ApiPropertyOptional({
    default: 'pe',
    maxLength: 80,
    pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
  })
  @IsString()
  @MaxLength(80)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  resume: string = 'pe';
  @ApiPropertyOptional({ enum: resumeLocales, default: 'ko-KR' })
  @IsIn(resumeLocales)
  locale: ResumeLocale = 'ko-KR';
}

export class ResumeSlugParamsDto {
  @ApiProperty({ maxLength: 160, pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' })
  @IsString()
  @MaxLength(160)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @IsString()
  @MaxLength(20000)
  slug: string;
}
