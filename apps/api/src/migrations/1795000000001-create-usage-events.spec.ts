import type { QueryRunner } from 'typeorm';
import { CreateUsageEvents1795000000001 } from './1795000000001-create-usage-events';

describe('CreateUsageEvents1795000000001', () => {
  it('creates only bounded anonymous fields, server timestamps, deduplication and query indexes', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    await new CreateUsageEvents1795000000001().up({
      query,
    } as unknown as QueryRunner);
    const sql = query.mock.calls.flat().join('\n');
    expect(sql).toContain('"eventId" uuid PRIMARY KEY');
    expect(sql).toContain('"createdAt" timestamptz NOT NULL DEFAULT now()');
    expect(sql).toContain('"durationMs" BETWEEN 0 AND 3600000');
    expect(sql).toContain('ON "usage_events" ("createdAt")');
    expect(sql).toContain('ON "usage_events" ("eventName", "createdAt")');
    expect(sql).not.toMatch(/"(?:email|ip|question|metadata|userId)"/);
  });

  it('can be reverted explicitly', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    await new CreateUsageEvents1795000000001().down({
      query,
    } as unknown as QueryRunner);
    expect(query).toHaveBeenCalledWith('DROP TABLE "usage_events"');
  });
});
