import type { DataSource, MigrationInterface, QueryRunner } from 'typeorm';

// 운영 migration의 업무 스냅샷을 격리 검증 DB에 적재하지 않는다.
export const createLegacyResumeTables = async (
  runner: QueryRunner,
): Promise<void> => {
  await runner.query(`CREATE TABLE IF NOT EXISTS resume_documents (
    locale varchar(5) PRIMARY KEY CHECK (locale IN ('ko-KR','en-US','ja-JP')),
    content jsonb NOT NULL
  ); CREATE TABLE IF NOT EXISTS resume_details (
    slug varchar(160) PRIMARY KEY CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    title text NOT NULL, start_date text, end_date text, content text NOT NULL
  )`);
};

export class SyntheticResumeContentMigration implements MigrationInterface {
  name = 'CreateResumeContent1795000000003';

  up(runner: QueryRunner): Promise<void> {
    return createLegacyResumeTables(runner);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(
      'DROP TABLE resume_details; DROP TABLE resume_documents',
    );
  }
}

// initialize() 뒤 runMigrations() 전에 적용해 나머지 migration과 history는 그대로 검증한다.
export const useSyntheticResumeMigration = (dataSource: DataSource): void => {
  if (!dataSource.isInitialized) {
    throw new Error('Initialize the disposable test DataSource first');
  }
  const options = dataSource.options;
  const url =
    'url' in options && typeof options.url === 'string'
      ? options.url
      : undefined;
  const databaseUrl = url ? new URL(url) : undefined;
  if (
    options.type !== 'postgres' ||
    !databaseUrl ||
    !['postgres:', 'postgresql:'].includes(databaseUrl.protocol) ||
    databaseUrl.search ||
    !decodeURIComponent(databaseUrl.pathname).endsWith('_test')
  ) {
    throw new Error(
      'Synthetic migrations require a disposable PostgreSQL _test database URL',
    );
  }
  const targetName = 'CreateResumeContent1795000000003';
  const targets = dataSource.migrations.filter(
    (migration) => migration.name === targetName,
  );
  if (targets.length !== 1) {
    throw new Error('Expected exactly one legacy resume snapshot migration');
  }
  dataSource.migrations.splice(
    dataSource.migrations.indexOf(targets[0]),
    1,
    new SyntheticResumeContentMigration(),
  );
};
