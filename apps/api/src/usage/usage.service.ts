import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type {
  UsageEventDto,
  UsageSummaryDto,
  UsageSummaryQueryDto,
} from './usage.dto';
import {
  getUsageDateRange,
  normalizeUsagePath,
  validateUsageFeature,
} from './usage-validation';

@Injectable()
export class UsageService {
  constructor(private readonly dataSource: DataSource) {}

  async record(event: UsageEventDto): Promise<void> {
    validateUsageFeature(event);
    const path = normalizeUsagePath(event.path);
    await this.dataSource.query(
      `INSERT INTO "usage_events"
        ("eventId", "visitorId", "sessionId", "eventName", "path", "feature", "durationMs")
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT ("eventId") DO NOTHING`,
      [
        event.eventId,
        event.visitorId,
        event.sessionId,
        event.eventName,
        path,
        event.feature ?? null,
        event.durationMs ?? null,
      ],
    );
  }

  async summarize(query: UsageSummaryQueryDto): Promise<UsageSummaryDto> {
    const range = getUsageDateRange(query);
    const [row] = await this.dataSource.query<
      { summary: Omit<UsageSummaryDto, 'from' | 'to' | 'timezone'> }[]
    >(
      `WITH filtered AS MATERIALIZED (
        SELECT * FROM "usage_events" WHERE "createdAt" >= $1 AND "createdAt" < $2
      ), daily AS (
        SELECT to_char("createdAt" AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD') AS date,
          count(*) AS events, count(DISTINCT "visitorId") AS visitors,
          count(DISTINCT "sessionId") AS sessions,
          count(*) FILTER (WHERE "eventName" = 'page_view') AS "pageViews"
        FROM filtered GROUP BY date ORDER BY date
      ), paths AS (
        SELECT path AS value, count(*) AS events,
          count(DISTINCT "visitorId") AS visitors, count(DISTINCT "sessionId") AS sessions
        FROM filtered GROUP BY path ORDER BY events DESC, value LIMIT 100
      ), features AS (
        SELECT feature AS value, count(*) AS events,
          count(DISTINCT "visitorId") AS visitors, count(DISTINCT "sessionId") AS sessions
        FROM filtered WHERE feature IS NOT NULL
        GROUP BY feature ORDER BY events DESC, value LIMIT 100
      ), events AS (
        SELECT "eventName" AS value, count(*) AS events,
          count(DISTINCT "visitorId") AS visitors, count(DISTINCT "sessionId") AS sessions
        FROM filtered GROUP BY "eventName" ORDER BY events DESC, value LIMIT 100
      )
      SELECT json_build_object(
        'totals', (SELECT json_build_object(
          'events', count(*), 'visitors', count(DISTINCT "visitorId"),
          'sessions', count(DISTINCT "sessionId"),
          'pageViews', count(*) FILTER (WHERE "eventName" = 'page_view')
        ) FROM filtered),
        'daily', COALESCE((SELECT json_agg(daily ORDER BY date) FROM daily), '[]'::json),
        'paths', COALESCE((SELECT json_agg(paths ORDER BY events DESC, value) FROM paths), '[]'::json),
        'features', COALESCE((SELECT json_agg(features ORDER BY events DESC, value) FROM features), '[]'::json),
        'events', COALESCE((SELECT json_agg(event_rows ORDER BY event_rows.events DESC, event_rows.value) FROM events AS event_rows), '[]'::json)
      ) AS summary`,
      [range.from, range.to],
    );
    return {
      from: query.from,
      to: query.to,
      timezone: 'Asia/Seoul',
      ...row.summary,
    };
  }
}
