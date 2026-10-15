import { BadRequestException } from '@nestjs/common';
import type {
  UsageEventDto,
  UsageFeature,
  UsageSummaryQueryDto,
} from './usage.dto';

const DAY_MS = 24 * 60 * 60 * 1000;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const localePattern = '(?:ko-KR|en-US|ja-JP)';
const staticRoutePattern = new RegExp(
  `^/${localePattern}(?:/(?:package|readme|blog|blog/dashboard|game|game/(?:beat-jev|sky-drop|wordle|poke-lounge)|hobby/(?:espresso|recipes)|resume/(?:preview|question)))?$`,
);
const dynamicRoutePattern = new RegExp(
  `^(/${localePattern})/(share|hobby/espresso|resume|blog(?:/preview)?)/([A-Za-z0-9_-]{1,100}(?:/[A-Za-z0-9_-]{1,100})*)$`,
);
const canonicalRoutePattern = new RegExp(
  `^/${localePattern}/(?:share/:id|hobby/espresso/:id|resume/:slug|blog(?:/preview)?/:slug)$`,
);
const eventFeatures: Record<string, readonly UsageFeature[]> = {
  chat_submitted: ['main_chat', 'resume_chat'],
  chat_completed: ['main_chat', 'resume_chat'],
  chat_failed: ['main_chat', 'resume_chat'],
  game_started: ['sky_drop', 'wordle', 'beat_jev'],
  game_completed: ['sky_drop', 'wordle', 'beat_jev'],
  search_used: ['site_search'],
  share_clicked: ['share'],
};

export const normalizeUsagePath = (path: string): string => {
  const normalized = path.length > 1 ? path.replace(/\/$/, '') : path;
  if (
    normalized === '/' ||
    staticRoutePattern.test(normalized) ||
    canonicalRoutePattern.test(normalized)
  )
    return normalized;

  const dynamicRoute = dynamicRoutePattern.exec(normalized);
  if (dynamicRoute) {
    const [, locale, route, slug] = dynamicRoute;
    if (route.startsWith('blog')) return `${locale}/${route}/:slug`;
    if (!slug.includes('/')) {
      return `${locale}/${route}/${route === 'resume' ? ':slug' : ':id'}`;
    }
  }

  throw new BadRequestException('집계할 수 없는 웹 경로입니다.');
};

export const validateUsageFeature = (event: UsageEventDto): void => {
  if (event.eventName === 'page_view') return;
  if (
    !event.feature ||
    !eventFeatures[event.eventName]?.includes(event.feature)
  ) {
    throw new BadRequestException('이벤트에 대응하는 기능을 지정해야 합니다.');
  }
};

const parseKstDate = (date: string): Date => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new BadRequestException('날짜는 YYYY-MM-DD 형식이어야 합니다.');
  }
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date
  ) {
    throw new BadRequestException('유효하지 않은 날짜입니다.');
  }
  return new Date(parsed.getTime() - KST_OFFSET_MS);
};

export const getUsageDateRange = (
  query: UsageSummaryQueryDto,
): { from: Date; to: Date } => {
  const from = parseKstDate(query.from);
  const to = parseKstDate(query.to);
  const days = (to.getTime() - from.getTime()) / DAY_MS;
  if (days <= 0 || days > 93) {
    throw new BadRequestException('집계 기간은 1일부터 93일까지여야 합니다.');
  }
  return { from, to };
};
