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

export const USAGE_EVENT_NAMES = [
  'page_view',
  'chat_submitted',
  'chat_completed',
  'chat_failed',
  'game_started',
  'game_completed',
  'search_used',
  'share_clicked',
] as const;
export type UsageEventName = (typeof USAGE_EVENT_NAMES)[number];

export const USAGE_FEATURES = [
  'main_chat',
  'resume_chat',
  'sky_drop',
  'wordle',
  'beat_jev',
  'site_search',
  'share',
] as const;
export type UsageFeature = (typeof USAGE_FEATURES)[number];

export class UsageEventDto {
  @ApiProperty({ format: 'uuid', description: '재전송 중복 제거용 UUID v4' })
  @IsUUID('4')
  eventId: string;

  @ApiProperty({
    format: 'uuid',
    description: '브라우저에서 생성한 익명 UUID v4',
  })
  @IsUUID('4')
  visitorId: string;

  @ApiProperty({ format: 'uuid', description: '방문 세션의 익명 UUID v4' })
  @IsUUID('4')
  sessionId: string;

  @ApiProperty({ enum: USAGE_EVENT_NAMES })
  @IsIn(USAGE_EVENT_NAMES)
  eventName: UsageEventName;

  @ApiProperty({
    example: '/ko-KR/game/wordle',
    maxLength: 200,
    description:
      '알려진 웹 경로만 허용. query/hash 금지, 동적 식별자는 서버에서 제거',
  })
  @IsString()
  @MaxLength(200)
  @Matches(/^\/[^?#]*$/)
  path: string;

  @ApiPropertyOptional({
    enum: USAGE_FEATURES,
    description: 'page_view 외에는 이벤트에 대응하는 기능이 필수',
  })
  @IsOptional()
  @IsIn(USAGE_FEATURES)
  feature?: UsageFeature;

  @ApiPropertyOptional({ minimum: 0, maximum: 3600000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3600000)
  durationMs?: number;
}

export class UsageSummaryQueryDto {
  @ApiProperty({
    example: '2026-10-01',
    description: '조회 시작일, 한국 시간 00:00 포함 (YYYY-MM-DD)',
  })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from: string;

  @ApiProperty({
    example: '2026-11-01',
    description: '조회 종료일, 한국 시간 00:00 제외. 최대 93일',
  })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to: string;
}

export class UsageCountsDto {
  @ApiProperty({ minimum: 0 })
  events: number;

  @ApiProperty({ minimum: 0, description: '해당 범위의 고유 익명 브라우저 수' })
  visitors: number;

  @ApiProperty({ minimum: 0 })
  sessions: number;

  @ApiProperty({ minimum: 0 })
  pageViews: number;
}

export class UsageDailyDto extends UsageCountsDto {
  @ApiProperty({ example: '2026-10-15' })
  date: string;
}

export class UsageBreakdownDto {
  @ApiProperty({ description: '경로, 기능 또는 이벤트 이름' })
  value: string;

  @ApiProperty({ minimum: 0 })
  events: number;

  @ApiProperty({ minimum: 0 })
  visitors: number;

  @ApiProperty({ minimum: 0 })
  sessions: number;
}

export class UsageSummaryDto {
  @ApiProperty({ example: '2026-10-01' })
  from: string;

  @ApiProperty({ example: '2026-11-01' })
  to: string;

  @ApiProperty({ example: 'Asia/Seoul' })
  timezone: string;

  @ApiProperty({ type: UsageCountsDto })
  totals: UsageCountsDto;

  @ApiProperty({
    type: [UsageDailyDto],
    description: '활동이 있는 날짜만 반환',
  })
  daily: UsageDailyDto[];

  @ApiProperty({
    type: [UsageBreakdownDto],
    description: '이벤트 수 상위 100 경로',
  })
  paths: UsageBreakdownDto[];

  @ApiProperty({
    type: [UsageBreakdownDto],
    description: '기능이 있는 이벤트만 집계',
  })
  features: UsageBreakdownDto[];

  @ApiProperty({ type: [UsageBreakdownDto] })
  events: UsageBreakdownDto[];
}
