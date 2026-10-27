import type { DataSource, MigrationInterface, QueryRunner } from 'typeorm';
import {
  SyntheticResumeContentMigration,
  useSyntheticResumeMigration,
} from './support/synthetic-resume-migration';

describe('합성 검증 migration baseline', () => {
  it('업무 INSERT 없이 기존 테이블만 만들고 migration history 이름을 보존한다', async () => {
    const query = jest
      .fn<Promise<unknown>, [string]>()
      .mockResolvedValue(undefined);
    const migration = new SyntheticResumeContentMigration();
    await migration.up({ query } as unknown as QueryRunner);
    expect(migration.name).toBe('CreateResumeContent1795000000003');
    expect(query.mock.calls[0][0]).toContain(
      'CREATE TABLE IF NOT EXISTS resume_documents',
    );
    expect(query.mock.calls[0][0]).toContain(
      'CREATE TABLE IF NOT EXISTS resume_details',
    );
    expect(query.mock.calls[0][0]).not.toMatch(/INSERT/i);
  });
  it('초기화된 격리 DataSource에서 seed migration 하나만 대체한다', () => {
    const unaffected: MigrationInterface = {
      name: 'CreateSharedCareerData1795000000004',
      up: jest.fn(),
      down: jest.fn(),
    };
    const legacy: MigrationInterface = {
      name: 'CreateResumeContent1795000000003',
      up: jest.fn(),
      down: jest.fn(),
    };
    const db = {
      isInitialized: true,
      options: {
        type: 'postgres',
        url: 'postgresql://tester@127.0.0.1/disposable_test',
      },
      migrations: [legacy, unaffected],
    } as unknown as DataSource;
    useSyntheticResumeMigration(db);
    expect(db.migrations[0]).toBeInstanceOf(SyntheticResumeContentMigration);
    expect(db.migrations[1]).toBe(unaffected);
  });
  it('일반 DB URL에서는 대체 migration을 허용하지 않는다', () => {
    expect(() =>
      useSyntheticResumeMigration({
        isInitialized: true,
        options: {
          type: 'postgres',
          url: 'postgresql://tester@127.0.0.1/regular',
        },
        migrations: [],
      } as unknown as DataSource),
    ).toThrow('_test');
  });
  it('초기화 전 또는 baseline 누락은 실행하지 않는다', () => {
    expect(() =>
      useSyntheticResumeMigration({ isInitialized: false } as DataSource),
    ).toThrow('Initialize');
    expect(() =>
      useSyntheticResumeMigration({
        isInitialized: true,
        options: {
          type: 'postgres',
          url: 'postgresql://tester@127.0.0.1/disposable_test',
        },
        migrations: [],
      } as unknown as DataSource),
    ).toThrow('exactly one');
  });
});
