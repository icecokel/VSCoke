import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsString, Matches, MaxLength } from 'class-validator';

export const resumeLocales = ['ko-KR', 'en-US', 'ja-JP'] as const;
export type ResumeLocale = (typeof resumeLocales)[number];

export class ResumeContactDto {
  @ApiProperty({ type: String })
  email: string;

  @ApiProperty({ type: String })
  phone: string;
}

export class ResumeProjectDescriptionDto {
  @ApiProperty({ type: String })
  subtitle: string;

  @ApiPropertyOptional({ type: String })
  detail?: string;

  @ApiPropertyOptional({ type: String })
  skills?: string;

  @ApiPropertyOptional({ type: [String] })
  tasks?: string[];

  @ApiPropertyOptional({ type: String })
  achievement?: string;
}

export class ResumeProjectDto {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  title: string;

  @ApiPropertyOptional({ type: String })
  period?: string;

  @ApiPropertyOptional({ type: String })
  fileRef?: string;

  @ApiProperty({ type: [ResumeProjectDescriptionDto] })
  descriptions: ResumeProjectDescriptionDto[];
}

export class ResumeCareerDto {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  company: string;

  @ApiProperty({ type: String })
  period: string;

  @ApiProperty({ type: String })
  employmentType: string;

  @ApiProperty({ type: String })
  role: string;

  @ApiPropertyOptional({ type: String })
  achievement?: string;

  @ApiProperty({ type: [ResumeProjectDto] })
  projects: ResumeProjectDto[];
}

export class ResumeEducationDto {
  @ApiProperty({ type: String })
  school: string;

  @ApiProperty({ type: String })
  period: string;

  @ApiProperty({ type: String })
  status: string;

  @ApiProperty({ type: String })
  major: string;
}

export class ResumeCertificationDto {
  @ApiProperty({ type: String })
  name: string;

  @ApiProperty({ type: String })
  date: string;

  @ApiProperty({ type: String })
  type: string;

  @ApiProperty({ type: [String] })
  details: string[];
}

export class ResumePersonalProjectDto {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  title: string;

  @ApiProperty({ type: String })
  description: string;

  @ApiProperty({ type: String })
  fileRef: string;
}

export class ResumeDocumentDto {
  @ApiProperty({ enum: resumeLocales })
  locale: ResumeLocale;

  @ApiProperty({ type: String })
  name: string;

  @ApiProperty({ type: String })
  title: string;

  @ApiProperty({ type: ResumeContactDto })
  contact: ResumeContactDto;

  @ApiProperty({ type: [String] })
  introduction: string[];

  @ApiProperty({ type: String })
  totalExperience: string;

  @ApiProperty({ type: String, description: '이력서 내용 최종 갱신 연월' })
  lastUpdated: string;

  @ApiProperty({ type: [ResumeCareerDto] })
  careers: ResumeCareerDto[];

  @ApiProperty({ type: [ResumeEducationDto] })
  education: ResumeEducationDto[];

  @ApiProperty({ type: [String] })
  skills: string[];

  @ApiProperty({ type: [ResumeCertificationDto] })
  certifications: ResumeCertificationDto[];

  @ApiProperty({ type: [String] })
  links: string[];

  @ApiProperty({ type: [ResumePersonalProjectDto] })
  personalProjects: ResumePersonalProjectDto[];
}

export class ResumeDetailSummaryDto {
  @ApiProperty({ type: String })
  slug: string;

  @ApiProperty({ type: String })
  title: string;

  @ApiPropertyOptional({ type: String })
  startDate?: string;

  @ApiPropertyOptional({ type: String })
  endDate?: string;
}

export class ResumeDetailDto extends ResumeDetailSummaryDto {
  @ApiProperty({ description: '운영자가 관리하는 신뢰된 MDX 본문' })
  content: string;
}

export class ResumeQueryDto {
  @ApiPropertyOptional({ enum: resumeLocales, default: 'ko-KR' })
  @IsIn(resumeLocales)
  locale: ResumeLocale = 'ko-KR';
}

export class ResumeSlugParamsDto {
  @ApiProperty({ maxLength: 160, pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' })
  @IsString()
  @MaxLength(160)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug: string;
}
