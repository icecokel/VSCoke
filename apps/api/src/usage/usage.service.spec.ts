import type { DataSource } from 'typeorm';
import { UsageService } from './usage.service';
import type { UsageEventDto } from './usage.dto';

const event: UsageEventDto = {
  eventId: 'a5fa93a9-5f91-44f0-9f6e-02e4360a1594',
  visitorId: 'b5fa93a9-5f91-44f0-9f6e-02e4360a1594',
  sessionId: 'c5fa93a9-5f91-44f0-9f6e-02e4360a1594',
  eventName: 'page_view',
  path: '/ko-KR/share/private-token',
};

describe('UsageService', () => {
  it('uses bound parameters, removes dynamic IDs, and ignores only eventId conflicts', async () => {
    const query = jest.fn().mockResolvedValue([]);
    const service = new UsageService({ query } as unknown as DataSource);
    await service.record(event);
    await service.record(event);
    expect(query).toHaveBeenCalledTimes(2);
    const [sql, parameters] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('ON CONFLICT ("eventId") DO NOTHING');
    expect(sql).not.toContain('private-token');
    expect(parameters).toEqual([
      event.eventId,
      event.visitorId,
      event.sessionId,
      event.eventName,
      '/ko-KR/share/:id',
      null,
      null,
    ]);
    expect(query.mock.calls[1]).toEqual(query.mock.calls[0]);
  });

  it('does not silently accept storage failures', async () => {
    const failure = new Error('database unavailable');
    const query = jest.fn().mockRejectedValue(failure);
    await expect(
      new UsageService({ query } as unknown as DataSource).record(event),
    ).rejects.toBe(failure);
  });

  it('rejects unsupported paths and invalid feature pairs without touching the database', async () => {
    const query = jest.fn();
    const service = new UsageService({ query } as unknown as DataSource);
    await expect(
      service.record({ ...event, path: '/ko-KR/private/secret' }),
    ).rejects.toThrow();
    await expect(
      service.record({ ...event, eventName: 'chat_failed', feature: 'wordle' }),
    ).rejects.toThrow();
    expect(query).not.toHaveBeenCalled();
  });

  it('aggregates one consistent snapshot with range-wide distinct counts and KST days', async () => {
    const summary = {
      totals: { events: 3, visitors: 1, sessions: 2, pageViews: 2 },
      daily: [
        {
          date: '2026-10-01',
          events: 2,
          visitors: 1,
          sessions: 1,
          pageViews: 1,
        },
        {
          date: '2026-10-02',
          events: 1,
          visitors: 1,
          sessions: 1,
          pageViews: 1,
        },
      ],
      paths: [],
      features: [],
      events: [],
    };
    const query = jest.fn().mockResolvedValue([{ summary }]);
    const result = await new UsageService({
      query,
    } as unknown as DataSource).summarize({
      from: '2026-10-01',
      to: '2026-10-03',
    });
    expect(result).toEqual({
      from: '2026-10-01',
      to: '2026-10-03',
      timezone: 'Asia/Seoul',
      ...summary,
    });
    expect(query).toHaveBeenCalledTimes(1);
    const [sql, parameters] = query.mock.calls[0] as [string, Date[]];
    expect(parameters).toEqual([
      new Date('2026-09-30T15:00:00Z'),
      new Date('2026-10-02T15:00:00Z'),
    ]);
    expect(sql).toContain('"createdAt" >= $1 AND "createdAt" < $2');
    expect(sql).toContain("AT TIME ZONE 'Asia/Seoul'");
    expect(sql).toContain('count(DISTINCT "visitorId")');
    expect(sql).toMatch(
      /'totals',[\s\S]*count\(DISTINCT "visitorId"\)[\s\S]*FROM filtered/,
    );
    expect(sql.match(/LIMIT 100/g)).toHaveLength(3);
    expect(sql).toContain('json_agg(event_rows ORDER BY event_rows.events');
    expect(JSON.stringify(result)).not.toContain(event.visitorId);
  });

  it('validates the range before querying', async () => {
    const query = jest.fn();
    await expect(
      new UsageService({ query } as unknown as DataSource).summarize({
        from: '2026-10-01',
        to: '2026-10-01',
      }),
    ).rejects.toThrow();
    expect(query).not.toHaveBeenCalled();
  });
});
