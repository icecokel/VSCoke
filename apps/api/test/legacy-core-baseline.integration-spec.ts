import { randomUUID } from 'node:crypto';
import { DataSource, MigrationExecutor } from 'typeorm';
import { CreateLegacyCoreSchema1759999999999 } from '../src/migrations/1759999999999-create-legacy-core-schema';
import { AddPokeLoungeGameType1793664000000 } from '../src/migrations/1793664000000-add-poke-lounge-game-type';
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
    await dataSource.query('SET search_path TO public');
    await dataSource.query('DROP TABLE IF EXISTS public.migrations');
    await dataSource.query('DROP TABLE IF EXISTS public.typeorm_metadata');
    await dataSource.query('DROP TABLE IF EXISTS public.game_history CASCADE');
    await dataSource.query('DROP TABLE IF EXISTS public."user" CASCADE');
    await dataSource.query(
      'DROP TYPE IF EXISTS public.game_history_gametype_enum',
    );
    await dataSource.query('DROP SCHEMA IF EXISTS tenant CASCADE');
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

  it('rejects an all-absent schema when the later enum migration is already recorded', async () => {
    await createMigrationLedger(dataSource);
    await dataSource.query(`
      INSERT INTO public.migrations ("timestamp", "name")
      VALUES (1793664000000, 'AddPokeLoungeGameType1793664000000')
    `);

    const ledgerDataSource = new DataSource({
      type: 'postgres',
      url: disposableUrl.toString(),
      migrations: [CreateLegacyCoreSchema1759999999999],
      migrationsTableName: 'migrations',
      synchronize: false,
    });
    await ledgerDataSource.initialize();

    try {
      const migrationExecutor = new MigrationExecutor(ledgerDataSource);

      await expect(
        migrationExecutor.executePendingMigrations(),
      ).rejects.toThrow('Legacy core schema/ledger mismatch');

      await expect(readCoreObjectPresence(ledgerDataSource)).resolves.toEqual({
        user_table: false,
        game_table: false,
        enum: false,
      });
      await expect(
        ledgerDataSource.query<Array<{ timestamp: string; name: string }>>(`
          SELECT "timestamp"::text, "name"
          FROM public.migrations
          ORDER BY "timestamp"
        `),
      ).resolves.toEqual([
        {
          timestamp: '1793664000000',
          name: 'AddPokeLoungeGameType1793664000000',
        },
      ]);
    } finally {
      await ledgerDataSource.destroy();
    }
  });

  it('adopts an exact schema without changing existing data', async () => {
    await runBaseline(dataSource);
    await dataSource.query(`
      ALTER TYPE public.game_history_gametype_enum ADD VALUE 'POKE_LOUNGE'
    `);
    await dataSource.query(`
      ALTER TABLE public."user"
        RENAME CONSTRAINT "user_pkey" TO "legacy_user_primary"
    `);
    await dataSource.query(`
      ALTER TABLE public.game_history
        RENAME CONSTRAINT "game_history_pkey" TO "legacy_game_primary"
    `);
    await dataSource.query(`
      ALTER TABLE public.game_history
        RENAME CONSTRAINT "FK_game_history_user_id" TO "legacy_game_user_fk"
    `);
    await dataSource.query(`
      ALTER INDEX public."IDX_game_history_user_id"
        RENAME TO "legacy_game_user_idx"
    `);
    await dataSource.query(`
      INSERT INTO public."user" ("id", "email", "firstName", "lastName")
      VALUES ('legacy-user', 'legacy@example.com', 'Legacy', 'User')
    `);
    await dataSource.query(`
      INSERT INTO public.game_history ("score", "gameType", "userId")
      VALUES (42, 'POKE_LOUNGE', 'legacy-user')
    `);

    await runBaseline(dataSource);

    const users = await dataSource.query<Array<{ id: string }>>(
      'SELECT "id" FROM public."user"',
    );
    const games = await dataSource.query<
      Array<{ score: number; gameType: string; userId: string }>
    >('SELECT "score", "gameType", "userId" FROM public.game_history');

    expect(users).toEqual([{ id: 'legacy-user' }]);
    expect(games).toEqual([
      { score: 42, gameType: 'POKE_LOUNGE', userId: 'legacy-user' },
    ]);
  });

  it('adopts SKY_DROP-only when the migrations ledger is absent', async () => {
    await runBaseline(dataSource);

    await expect(runBaseline(dataSource)).resolves.toBeUndefined();
    await expect(readEnumLabels(dataSource)).resolves.toEqual(['SKY_DROP']);
  });

  it('adopts SKY_DROP-only when the later enum migration is not recorded', async () => {
    await runBaseline(dataSource);
    await createMigrationLedger(dataSource);

    await expect(runBaseline(dataSource)).resolves.toBeUndefined();
    await expect(readEnumLabels(dataSource)).resolves.toEqual(['SKY_DROP']);
  });

  it('adopts an already-added POKE_LOUNGE when the later enum migration is not recorded', async () => {
    await runBaseline(dataSource);
    await dataSource.query(`
      ALTER TYPE public.game_history_gametype_enum ADD VALUE 'POKE_LOUNGE'
    `);
    await createMigrationLedger(dataSource);

    await expect(runBaseline(dataSource)).resolves.toBeUndefined();
    await expect(readEnumLabels(dataSource)).resolves.toEqual([
      'SKY_DROP',
      'POKE_LOUNGE',
    ]);
  });

  it('rejects unknown enum labels even when the later migration is not recorded', async () => {
    await runBaseline(dataSource);
    await dataSource.query(`
      ALTER TYPE public.game_history_gametype_enum ADD VALUE 'UNKNOWN_GAME'
    `);

    await expect(runBaseline(dataSource)).rejects.toThrow(
      'Legacy core schema mismatch',
    );
  });

  it.each([
    {
      label: 'missing generated UUID default',
      mutation:
        'ALTER TABLE public.game_history ALTER COLUMN "id" DROP DEFAULT',
    },
    {
      label: 'wrong createdAt default',
      mutation: `ALTER TABLE public.game_history ALTER COLUMN "createdAt" SET DEFAULT TIMESTAMP '2000-01-01 00:00:00'`,
    },
  ])('rejects $label', async ({ mutation }) => {
    await runBaseline(dataSource);
    await dataSource.query(mutation);

    await expect(runBaseline(dataSource)).rejects.toThrow(
      'Legacy core schema mismatch',
    );
  });

  it('creates only public objects when tenant precedes public in search_path', async () => {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.query('CREATE SCHEMA tenant');
      await queryRunner.query('SET LOCAL search_path TO tenant, public');
      await new CreateLegacyCoreSchema1759999999999().up(queryRunner);

      const [presence] = await queryRunner.query<
        Array<{
          public_user: boolean;
          public_game: boolean;
          public_enum: boolean;
          public_index: boolean;
          tenant_user: boolean;
          tenant_game: boolean;
          tenant_enum: boolean;
        }>
      >(`
        SELECT
          to_regclass('public."user"') IS NOT NULL AS public_user,
          to_regclass('public.game_history') IS NOT NULL AS public_game,
          to_regtype('public.game_history_gametype_enum') IS NOT NULL AS public_enum,
          to_regclass('public."IDX_game_history_user_id"') IS NOT NULL AS public_index,
          to_regclass('tenant."user"') IS NOT NULL AS tenant_user,
          to_regclass('tenant.game_history') IS NOT NULL AS tenant_game,
          to_regtype('tenant.game_history_gametype_enum') IS NOT NULL AS tenant_enum
      `);

      expect(presence).toEqual({
        public_user: true,
        public_game: true,
        public_enum: true,
        public_index: true,
        tenant_user: false,
        tenant_game: false,
        tenant_enum: false,
      });
    } finally {
      await queryRunner.rollbackTransaction();
      await queryRunner.release();
    }
  });

  it('adds POKE_LOUNGE only to public through the migration chain with a tenant enum shadow', async () => {
    const chainDataSource = new DataSource({
      type: 'postgres',
      url: disposableUrl.toString(),
      schema: 'public',
      migrations: [
        CreateLegacyCoreSchema1759999999999,
        AddPokeLoungeGameType1793664000000,
      ],
      migrationsTableName: 'migrations',
      synchronize: false,
    });
    await chainDataSource.initialize();
    const queryRunner = chainDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.query('CREATE SCHEMA tenant');
      await queryRunner.query(`
        CREATE TYPE tenant.game_history_gametype_enum AS ENUM ('SKY_DROP')
      `);
      await queryRunner.query(`
        CREATE TABLE public.migrations (
          "id" serial PRIMARY KEY,
          "timestamp" bigint NOT NULL,
          "name" varchar NOT NULL
        )
      `);
      await queryRunner.query('SET LOCAL search_path TO tenant, public');

      const migrationExecutor = new MigrationExecutor(
        chainDataSource,
        queryRunner,
      );
      const executed = await migrationExecutor.executePendingMigrations();
      const labels = await queryRunner.query<
        Array<{ schema: string; label: string }>
      >(`
        SELECT namespace.nspname AS schema, enum_value.enumlabel AS label
        FROM pg_catalog.pg_enum enum_value
        JOIN pg_catalog.pg_type type_record
          ON type_record.oid = enum_value.enumtypid
        JOIN pg_catalog.pg_namespace namespace
          ON namespace.oid = type_record.typnamespace
        WHERE namespace.nspname IN ('public', 'tenant')
          AND type_record.typname = 'game_history_gametype_enum'
        ORDER BY namespace.nspname, enum_value.enumsortorder
      `);

      expect(executed.map((migration) => migration.name)).toEqual([
        'CreateLegacyCoreSchema1759999999999',
        'AddPokeLoungeGameType1793664000000',
      ]);
      expect(labels).toEqual([
        { schema: 'public', label: 'SKY_DROP' },
        { schema: 'public', label: 'POKE_LOUNGE' },
        { schema: 'tenant', label: 'SKY_DROP' },
      ]);
    } finally {
      await queryRunner.rollbackTransaction();
      await queryRunner.release();
      await chainDataSource.destroy();
    }
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
      INSERT INTO public."user" ("id", "email", "firstName", "lastName")
      VALUES ('preserved-user', 'preserved@example.com', 'Preserved', 'User')
    `);
    await dataSource.query(
      'ALTER TABLE public.game_history ALTER COLUMN "score" DROP NOT NULL',
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
      'SELECT "id" FROM public."user"',
    );

    expect(scoreColumn).toEqual([{ is_nullable: 'YES' }]);
    expect(users).toEqual([{ id: 'preserved-user' }]);
  });

  it.each([
    {
      label: 'deferrable primary key',
      mutate: async () => {
        await dataSource.query(`
          ALTER TABLE public.game_history
            DROP CONSTRAINT "game_history_pkey",
            ADD CONSTRAINT "legacy_game_pk" PRIMARY KEY ("id")
              DEFERRABLE INITIALLY DEFERRED
        `);
      },
    },
    {
      label: 'unvalidated deferred MATCH FULL foreign key',
      mutate: async () => {
        await dataSource.query(`
          ALTER TABLE public.game_history
            DROP CONSTRAINT "FK_game_history_user_id",
            ADD CONSTRAINT "legacy_game_user_fk"
              FOREIGN KEY ("userId") REFERENCES public."user" ("id")
              MATCH FULL ON DELETE NO ACTION ON UPDATE NO ACTION
              DEFERRABLE INITIALLY DEFERRED NOT VALID
        `);
      },
    },
  ])('rejects $label semantics', async ({ mutate }) => {
    await runBaseline(dataSource);
    await mutate();

    await expect(runBaseline(dataSource)).rejects.toThrow(
      'Legacy core schema mismatch',
    );
  });

  it.each([
    {
      label: 'missing userId index',
      replacement: '',
    },
    {
      label: 'unique userId index',
      replacement:
        'CREATE UNIQUE INDEX "legacy_user_idx" ON public.game_history ("userId")',
    },
    {
      label: 'partial userId index',
      replacement:
        'CREATE INDEX "legacy_user_idx" ON public.game_history ("userId") WHERE "score" > 0',
    },
    {
      label: 'expression userId index',
      replacement:
        'CREATE INDEX "legacy_user_idx" ON public.game_history (lower("userId"))',
    },
    {
      label: 'multi-column userId index',
      replacement:
        'CREATE INDEX "legacy_user_idx" ON public.game_history ("userId", "score")',
    },
    {
      label: 'hash userId index',
      replacement:
        'CREATE INDEX "legacy_user_idx" ON public.game_history USING hash ("userId")',
    },
    {
      label: 'non-default userId opclass',
      replacement:
        'CREATE INDEX "legacy_user_idx" ON public.game_history ("userId" varchar_pattern_ops)',
    },
    {
      label: 'non-default userId collation',
      replacement:
        'CREATE INDEX "legacy_user_idx" ON public.game_history ("userId" COLLATE "C")',
    },
    {
      label: 'descending nulls-first userId index',
      replacement:
        'CREATE INDEX "legacy_user_idx" ON public.game_history ("userId" DESC NULLS FIRST)',
    },
  ])('rejects $label', async ({ replacement }) => {
    await runBaseline(dataSource);
    await dataSource.query('DROP INDEX public."IDX_game_history_user_id"');
    if (replacement) {
      await dataSource.query(replacement);
    }

    await expect(runBaseline(dataSource)).rejects.toThrow(
      'Legacy core schema mismatch',
    );
  });

  it('executes and records only the pending older baseline through MigrationExecutor', async () => {
    await runBaseline(dataSource);
    await dataSource.query(`
      ALTER TYPE public.game_history_gametype_enum ADD VALUE 'POKE_LOUNGE'
    `);
    await dataSource.query(`
      INSERT INTO public."user" ("id", "email", "firstName", "lastName")
      VALUES ('ledger-user', 'ledger@example.com', 'Ledger', 'User')
    `);
    await dataSource.query(`
      INSERT INTO public.game_history ("score", "gameType", "userId")
      VALUES (77, 'POKE_LOUNGE', 'ledger-user')
    `);

    const ledgerDataSource = new DataSource({
      type: 'postgres',
      url: disposableUrl.toString(),
      migrations: [CreateLegacyCoreSchema1759999999999],
      migrationsTableName: 'migrations',
      synchronize: false,
    });
    await ledgerDataSource.initialize();

    try {
      const migrationExecutor = new MigrationExecutor(ledgerDataSource);
      await migrationExecutor.showMigrations();
      await ledgerDataSource.query(`
        INSERT INTO public.migrations ("timestamp", "name")
        VALUES (1793664000000, 'AddPokeLoungeGameType1793664000000')
      `);

      const executed = await migrationExecutor.executePendingMigrations();
      const ledger = await ledgerDataSource.query<
        Array<{ timestamp: string; name: string }>
      >(`
        SELECT "timestamp"::text, "name"
        FROM public.migrations
        ORDER BY "timestamp"
      `);
      const games = await ledgerDataSource.query<
        Array<{ score: number; gameType: string; userId: string }>
      >(`
        SELECT "score", "gameType", "userId"
        FROM public.game_history
      `);

      expect(executed.map((migration) => migration.name)).toEqual([
        'CreateLegacyCoreSchema1759999999999',
      ]);
      expect(ledger).toEqual([
        {
          timestamp: '1759999999999',
          name: 'CreateLegacyCoreSchema1759999999999',
        },
        {
          timestamp: '1793664000000',
          name: 'AddPokeLoungeGameType1793664000000',
        },
      ]);
      expect(games).toEqual([
        { score: 77, gameType: 'POKE_LOUNGE', userId: 'ledger-user' },
      ]);
    } finally {
      await ledgerDataSource.destroy();
    }
  });

  it('rejects a pending baseline when the later enum ledger row contradicts SKY_DROP-only', async () => {
    await runBaseline(dataSource);
    await dataSource.query(`
      INSERT INTO public."user" ("id", "email", "firstName", "lastName")
      VALUES ('ledger-mismatch-user', 'mismatch@example.com', 'Ledger', 'Mismatch')
    `);

    const ledgerDataSource = new DataSource({
      type: 'postgres',
      url: disposableUrl.toString(),
      migrations: [CreateLegacyCoreSchema1759999999999],
      migrationsTableName: 'migrations',
      synchronize: false,
    });
    await ledgerDataSource.initialize();

    try {
      const migrationExecutor = new MigrationExecutor(ledgerDataSource);
      await migrationExecutor.showMigrations();
      await ledgerDataSource.query(`
        INSERT INTO public.migrations ("timestamp", "name")
        VALUES (1793664000000, 'AddPokeLoungeGameType1793664000000')
      `);

      await expect(
        migrationExecutor.executePendingMigrations(),
      ).rejects.toThrow('Legacy core schema/ledger mismatch');

      const ledger = await ledgerDataSource.query<
        Array<{ timestamp: string; name: string }>
      >(`
        SELECT "timestamp"::text, "name"
        FROM public.migrations
        ORDER BY "timestamp"
      `);
      const users = await ledgerDataSource.query<Array<{ id: string }>>(`
        SELECT "id"
        FROM public."user"
      `);

      expect(ledger).toEqual([
        {
          timestamp: '1793664000000',
          name: 'AddPokeLoungeGameType1793664000000',
        },
      ]);
      expect(users).toEqual([{ id: 'ledger-mismatch-user' }]);
      await expect(readEnumLabels(ledgerDataSource)).resolves.toEqual([
        'SKY_DROP',
      ]);
    } finally {
      await ledgerDataSource.destroy();
    }
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

async function createMigrationLedger(dataSource: DataSource): Promise<void> {
  await dataSource.query(`
    CREATE TABLE public.migrations (
      "id" serial PRIMARY KEY,
      "timestamp" bigint NOT NULL,
      "name" varchar NOT NULL
    )
  `);
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
