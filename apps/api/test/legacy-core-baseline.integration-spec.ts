import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { CreateLegacyCoreSchema1759999999999 } from '../src/migrations/1759999999999-create-legacy-core-schema';
import { requireTestDatabaseUrl } from '../src/test-data-source';

describe('legacy core production baseline migration', () => {
  const guardedTestUrl = new URL(requireTestDatabaseUrl());
  const databaseName = `vscoke_legacy_core_${randomUUID().replaceAll('-', '')}_test`;
  const adminUrl = new URL(guardedTestUrl);
  const disposableUrl = new URL(guardedTestUrl);
  let adminDataSource: DataSource;
  let dataSource: DataSource;

  adminUrl.pathname = '/postgres';
  disposableUrl.pathname = `/${databaseName}`;

  beforeAll(async () => {
    assertDisposableDatabaseName(databaseName);

    adminDataSource = new DataSource({
      type: 'postgres',
      url: adminUrl.toString(),
    });
    await adminDataSource.initialize();
    await adminDataSource.query(`CREATE DATABASE "${databaseName}"`);

    dataSource = new DataSource({
      type: 'postgres',
      url: disposableUrl.toString(),
      synchronize: false,
    });
    await dataSource.initialize();
  });

  beforeEach(async () => {
    await dataSource.query('DROP TABLE IF EXISTS "game_history" CASCADE');
    await dataSource.query('DROP TABLE IF EXISTS "user" CASCADE');
    await dataSource.query('DROP TYPE IF EXISTS "game_history_gametype_enum"');
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }

    if (adminDataSource?.isInitialized) {
      assertDisposableDatabaseName(databaseName);
      await adminDataSource.query(
        `DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`,
      );
      await adminDataSource.destroy();
    }
  });

  it('creates the canonical schema on a fresh PostgreSQL database', async () => {
    await runBaseline(dataSource);

    const columns = await dataSource.query<
      Array<{ table_name: string; column_name: string }>
    >(`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN ('user', 'game_history')
      ORDER BY table_name, ordinal_position
    `);
    const enumLabels = await readEnumLabels(dataSource);

    expect(columns).toEqual([
      { table_name: 'game_history', column_name: 'id' },
      { table_name: 'game_history', column_name: 'score' },
      { table_name: 'game_history', column_name: 'gameType' },
      { table_name: 'game_history', column_name: 'playTime' },
      { table_name: 'game_history', column_name: 'createdAt' },
      { table_name: 'game_history', column_name: 'userId' },
      { table_name: 'user', column_name: 'id' },
      { table_name: 'user', column_name: 'email' },
      { table_name: 'user', column_name: 'firstName' },
      { table_name: 'user', column_name: 'lastName' },
      { table_name: 'user', column_name: 'accessToken' },
    ]);
    expect(enumLabels).toEqual(['SKY_DROP']);
  });

  it('adopts an exact schema without changing existing data', async () => {
    await runBaseline(dataSource);
    await dataSource.query(`
      ALTER TYPE "game_history_gametype_enum" ADD VALUE 'POKE_LOUNGE'
    `);
    await dataSource.query(`
      INSERT INTO "user" ("id", "email", "firstName", "lastName")
      VALUES ('legacy-user', 'legacy@example.com', 'Legacy', 'User')
    `);
    await dataSource.query(`
      INSERT INTO "game_history" ("score", "gameType", "userId")
      VALUES (42, 'POKE_LOUNGE', 'legacy-user')
    `);

    await runBaseline(dataSource);

    const users = await dataSource.query<Array<{ id: string }>>(
      'SELECT "id" FROM "user"',
    );
    const games = await dataSource.query<
      Array<{ score: number; gameType: string; userId: string }>
    >('SELECT "score", "gameType", "userId" FROM "game_history"');

    expect(users).toEqual([{ id: 'legacy-user' }]);
    expect(games).toEqual([
      { score: 42, gameType: 'POKE_LOUNGE', userId: 'legacy-user' },
    ]);
  });

  it('rejects a partial schema without creating the missing objects', async () => {
    await dataSource.query(`
      CREATE TABLE "user" (
        "id" varchar PRIMARY KEY,
        "email" varchar NOT NULL,
        "firstName" varchar NOT NULL,
        "lastName" varchar NOT NULL,
        "accessToken" varchar
      )
    `);

    await expect(runBaseline(dataSource)).rejects.toThrow(
      'Legacy core schema is partial',
    );

    const objects = await readCoreObjectPresence(dataSource);
    expect(objects).toEqual({
      user_table: true,
      game_table: false,
      enum: false,
    });
  });

  it('rejects a mismatch without repairing schema or deleting data', async () => {
    await runBaseline(dataSource);
    await dataSource.query(`
      INSERT INTO "user" ("id", "email", "firstName", "lastName")
      VALUES ('preserved-user', 'preserved@example.com', 'Preserved', 'User')
    `);
    await dataSource.query(
      'ALTER TABLE "game_history" ALTER COLUMN "score" DROP NOT NULL',
    );

    await expect(runBaseline(dataSource)).rejects.toThrow(
      'Legacy core schema mismatch',
    );

    const scoreColumn = await dataSource.query<Array<{ is_nullable: string }>>(`
      SELECT is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'game_history'
        AND column_name = 'score'
    `);
    const users = await dataSource.query<Array<{ id: string }>>(
      'SELECT "id" FROM "user"',
    );

    expect(scoreColumn).toEqual([{ is_nullable: 'YES' }]);
    expect(users).toEqual([{ id: 'preserved-user' }]);
  });

  it('fails explicitly when asked to roll back the baseline', async () => {
    const queryRunner = dataSource.createQueryRunner();

    try {
      await expect(
        new CreateLegacyCoreSchema1759999999999().down(queryRunner),
      ).rejects.toThrow('Legacy core baseline is irreversible');
    } finally {
      await queryRunner.release();
    }
  });
});

async function runBaseline(dataSource: DataSource): Promise<void> {
  const queryRunner = dataSource.createQueryRunner();

  try {
    await new CreateLegacyCoreSchema1759999999999().up(queryRunner);
  } finally {
    await queryRunner.release();
  }
}

async function readEnumLabels(dataSource: DataSource): Promise<string[]> {
  const rows = await dataSource.query<Array<{ enumlabel: string }>>(`
    SELECT enum_value.enumlabel
    FROM pg_catalog.pg_enum enum_value
    JOIN pg_catalog.pg_type type_record
      ON type_record.oid = enum_value.enumtypid
    JOIN pg_catalog.pg_namespace namespace
      ON namespace.oid = type_record.typnamespace
    WHERE namespace.nspname = 'public'
      AND type_record.typname = 'game_history_gametype_enum'
    ORDER BY enum_value.enumsortorder
  `);

  return rows.map((row) => row.enumlabel);
}

async function readCoreObjectPresence(dataSource: DataSource): Promise<{
  user_table: boolean;
  game_table: boolean;
  enum: boolean;
}> {
  const [presence] = await dataSource.query<
    Array<{ user_table: boolean; game_table: boolean; enum: boolean }>
  >(`
    SELECT
      to_regclass('public."user"') IS NOT NULL AS user_table,
      to_regclass('public.game_history') IS NOT NULL AS game_table,
      EXISTS (
        SELECT 1
        FROM pg_catalog.pg_type type_record
        JOIN pg_catalog.pg_namespace namespace
          ON namespace.oid = type_record.typnamespace
        WHERE namespace.nspname = 'public'
          AND type_record.typname = 'game_history_gametype_enum'
      ) AS enum
  `);

  return presence;
}

function assertDisposableDatabaseName(databaseName: string): void {
  if (!/^vscoke_legacy_core_[a-f0-9]{32}_test$/.test(databaseName)) {
    throw new Error('Refusing to manage a non-disposable PostgreSQL database');
  }
}
