import { randomUUID } from 'node:crypto';
import type { CanonicalTerminalResult } from '@vscoke/poke-lounge-battle';
import { ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { User } from '../src/auth/entities/user.entity';
import { GameHistory } from '../src/game/entities/game-history.entity';
import { GamePokeLoungeState } from '../src/game/entities/game-poke-lounge-state.entity';
import { GameType } from '../src/game/enums/game-type.enum';
import { GameService } from '../src/game/game.service';
import { VerifiedPokeLoungeHistoryWriter } from '../src/game/verified-poke-lounge-history-writer.service';
import { CreateLegacyCoreSchema1759999999999 } from '../src/migrations/1759999999999-create-legacy-core-schema';
import { AddPokeLoungeGameType1793664000000 } from '../src/migrations/1793664000000-add-poke-lounge-game-type';
import { CreateGamePokeLoungeState1793750400000 } from '../src/migrations/1793750400000-create-game-poke-lounge-state';
import { AddGameResultTrust1794355200000 } from '../src/migrations/1794355200000-add-game-result-trust';
import { AddGamePokeLoungeStateRevision1794700800000 } from '../src/migrations/1794700800000-add-game-poke-lounge-state-revision';
import { requireTestDatabaseUrl } from '../src/test-data-source';

describe('game result trust PostgreSQL integration', () => {
  const guardedTestUrl = new URL(requireTestDatabaseUrl());
  const databaseName = `vscoke_game_trust_${randomUUID().replaceAll('-', '')}_test`;
  const adminUrl = new URL(guardedTestUrl);
  const disposableUrl = new URL(guardedTestUrl);
  const migration = new AddGameResultTrust1794355200000();
  const writer = new VerifiedPokeLoungeHistoryWriter();
  let adminDataSource: DataSource;
  let dataSource: DataSource;

  adminUrl.pathname = '/postgres';
  disposableUrl.pathname = `/${databaseName}`;

  beforeAll(async () => {
    adminDataSource = new DataSource({
      type: 'postgres',
      url: adminUrl.toString(),
    });
    await adminDataSource.initialize();
    await adminDataSource.query(`CREATE DATABASE "${databaseName}"`);

    dataSource = new DataSource({
      type: 'postgres',
      url: disposableUrl.toString(),
      entities: [User, GameHistory, GamePokeLoungeState],
      synchronize: false,
    });
    await dataSource.initialize();
  });

  beforeEach(async () => {
    await resetLegacySchema(dataSource);
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
    if (adminDataSource?.isInitialized) {
      await adminDataSource.query(
        `DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`,
      );
      await adminDataSource.destroy();
    }
  });

  it('migrates legacy rows, preserves non-Poke null trust, and creates enforcing indexes', async () => {
    await seedUsers(dataSource, ['account-a', 'account-b']);
    await dataSource.query(`
      INSERT INTO game_history (score, "gameType", "userId")
      VALUES (300, 'POKE_LOUNGE', 'account-a'), (900, 'SKY_DROP', 'account-b')
    `);

    await runUp(dataSource);

    await expect(
      dataSource.query(`
        SELECT score, "gameType", "resultTrust", "sourceKey"
        FROM game_history
        ORDER BY score
      `),
    ).resolves.toEqual([
      {
        score: 300,
        gameType: GameType.POKE_LOUNGE,
        resultTrust: 'client-asserted',
        sourceKey: null,
      },
      {
        score: 900,
        gameType: GameType.SKY_DROP,
        resultTrust: null,
        sourceKey: null,
      },
    ]);

    await expect(
      dataSource.query(`
        UPDATE game_history SET "resultTrust" = 'browser-verified' WHERE score = 300
      `),
    ).rejects.toThrow(/CHK_game_history_result_trust/);

    const indexes = await dataSource.query<Array<{ indexdef: string }>>(`
      SELECT indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname IN ('UQ_game_history_source_key', 'IDX_game_history_verified_ranking')
      ORDER BY indexname
    `);
    expect(indexes.map(({ indexdef }) => indexdef).join('\n')).toContain(
      'WHERE ("sourceKey" IS NOT NULL)',
    );
    expect(indexes.map(({ indexdef }) => indexdef).join('\n')).toContain(
      '"gameType", "resultTrust", "userId", score DESC, "createdAt", id',
    );
  });

  it('writes and reuses exactly one verified result per account and rejects changed results', async () => {
    await seedUsers(dataSource, ['account-a', 'account-b']);
    await runUp(dataSource);

    const input = verifiedInput();
    const first = await dataSource.transaction((manager) =>
      writer.write(manager, input),
    );
    const retry = await dataSource.transaction((manager) =>
      writer.write(manager, input),
    );

    expect(retry.map((row) => row.id)).toEqual(first.map((row) => row.id));
    await expect(dataSource.getRepository(GameHistory).count()).resolves.toBe(
      2,
    );

    await expect(
      dataSource.transaction((manager) =>
        writer.write(manager, {
          ...input,
          terminalResult: {
            ...input.terminalResult,
            winnerPlayerId: 'player-b',
            loserPlayerId: 'player-a',
            scoreByPlayerId: { 'player-a': 50, 'player-b': 100 },
          },
        }),
      ),
    ).rejects.toThrow(/conflicts with the persisted server result/);
  });

  it('rolls back both verified histories with the caller transaction', async () => {
    await seedUsers(dataSource, ['account-a', 'account-b']);
    await runUp(dataSource);

    await expect(
      dataSource.transaction(async (manager) => {
        await writer.write(manager, verifiedInput());
        throw new Error('abort transaction');
      }),
    ).rejects.toThrow('abort transaction');

    await expect(dataSource.getRepository(GameHistory).count()).resolves.toBe(
      0,
    );
  });

  it('fails down without dropping populated trust columns', async () => {
    await seedUsers(dataSource, ['account-a']);
    await dataSource.query(`
      INSERT INTO game_history (score, "gameType", "userId")
      VALUES (300, 'POKE_LOUNGE', 'account-a')
    `);
    await runUp(dataSource);

    const queryRunner = dataSource.createQueryRunner();
    try {
      await expect(migration.down(queryRunner)).rejects.toThrow(
        /Cannot remove game result trust columns/,
      );
    } finally {
      await queryRunner.release();
    }

    await expect(
      dataSource.query(`
        SELECT "resultTrust" FROM game_history WHERE "userId" = 'account-a'
      `),
    ).resolves.toEqual([{ resultTrust: 'client-asserted' }]);
  });

  it('ranks only verified Poke results before selecting each user best score', async () => {
    await seedUsers(dataSource, ['account-a', 'account-b', 'account-c']);
    await dataSource.query(
      `UPDATE "user" SET "accessToken" = 'sentinel-access-token'`,
    );
    await runUp(dataSource);
    await dataSource.transaction((manager) =>
      writer.write(manager, verifiedInput()),
    );
    await dataSource.query(`
      INSERT INTO game_history
        (score, "gameType", "userId", "resultTrust", "sourceKey")
      VALUES
        (1000, 'POKE_LOUNGE', 'account-b', 'client-asserted', NULL),
        (1000, 'POKE_LOUNGE', 'account-c', 'client-asserted', NULL)
    `);

    const service = new GameService(
      dataSource.getRepository(GameHistory),
      dataSource.getRepository(GamePokeLoungeState),
    );

    const ranking = await service.getRanking(GameType.POKE_LOUNGE);
    expect(ranking).toEqual([
      expect.objectContaining({ score: 100, rank: 1 }),
      expect.objectContaining({ score: 50, rank: 2 }),
    ]);
    expect(JSON.stringify(ranking)).not.toMatch(
      /resultTrust|sourceKey|email|accessToken|sentinel/,
    );
    await expect(
      service.getUserRank('account-b', 50, GameType.POKE_LOUNGE),
    ).resolves.toBe(2);
  });

  it('allows exactly one concurrent state save for the same expected revision', async () => {
    await seedUsers(dataSource, ['account-a']);
    await runUp(dataSource);
    const user = await dataSource.getRepository(User).findOneByOrFail({
      id: 'account-a',
    });
    const service = new GameService(
      dataSource.getRepository(GameHistory),
      dataSource.getRepository(GamePokeLoungeState),
    );

    const concurrent = await Promise.allSettled([
      service.savePokeLoungeState(user, {
        state: { marker: 'device-a' },
        expectedRevision: 0,
      }),
      service.savePokeLoungeState(user, {
        state: { marker: 'device-b' },
        expectedRevision: 0,
      }),
    ]);

    expect(
      concurrent.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      concurrent.filter((result) => result.status === 'rejected'),
    ).toHaveLength(1);
    const stored = await dataSource
      .getRepository(GamePokeLoungeState)
      .findOneByOrFail({ userId: user.id });
    expect(stored.revision).toBe(1);
    expect(['device-a', 'device-b']).toContain(stored.state.marker);

    await expect(
      service.savePokeLoungeState(user, {
        state: { marker: 'device-c' },
        expectedRevision: 1,
      }),
    ).resolves.toMatchObject({ revision: 2, state: { marker: 'device-c' } });
  });

  it('allows a legacy insert but rejects a later legacy overwrite regardless of clientUpdatedAt', async () => {
    await seedUsers(dataSource, ['account-a']);
    await runUp(dataSource);
    const user = await dataSource.getRepository(User).findOneByOrFail({
      id: 'account-a',
    });
    const service = new GameService(
      dataSource.getRepository(GameHistory),
      dataSource.getRepository(GamePokeLoungeState),
    );

    await expect(
      service.savePokeLoungeState(user, {
        state: { marker: 'legacy-first' },
        clientUpdatedAt: '2099-01-01T00:00:00.000Z',
      }),
    ).resolves.toMatchObject({
      revision: 1,
      state: { marker: 'legacy-first' },
    });

    const conflict = await service
      .savePokeLoungeState(user, {
        state: { marker: 'legacy-future-overwrite' },
        clientUpdatedAt: '2199-01-01T00:00:00.000Z',
      })
      .catch((caught: unknown) => caught);
    expect(conflict).toBeInstanceOf(ConflictException);
    expect((conflict as ConflictException).getStatus()).toBe(409);

    await expect(
      dataSource
        .getRepository(GamePokeLoungeState)
        .findOneByOrFail({ userId: user.id }),
    ).resolves.toMatchObject({
      revision: 1,
      state: { marker: 'legacy-first' },
      clientUpdatedAt: new Date('2099-01-01T00:00:00.000Z'),
    });
  });

  it('atomically lets only one legacy or CAS writer transition a migrated revision 0 row', async () => {
    await seedUsers(dataSource, ['account-a']);
    await dataSource.query(`
      INSERT INTO game_poke_lounge_state
        ("userId", "state", "clientUpdatedAt")
      VALUES
        ('account-a', '{"marker":"pre-revision"}'::jsonb, '2026-07-19T00:00:00.000Z')
    `);
    await runUp(dataSource);
    const user = await dataSource.getRepository(User).findOneByOrFail({
      id: 'account-a',
    });
    const repository = dataSource.getRepository(GamePokeLoungeState);
    const service = new GameService(
      dataSource.getRepository(GameHistory),
      repository,
    );
    await expect(
      repository.findOneByOrFail({ userId: user.id }),
    ).resolves.toMatchObject({
      revision: 0,
      state: { marker: 'pre-revision' },
    });

    const concurrent = await Promise.allSettled([
      service.savePokeLoungeState(user, {
        state: { marker: 'legacy-writer' },
        clientUpdatedAt: '2199-01-01T00:00:00.000Z',
      }),
      service.savePokeLoungeState(user, {
        state: { marker: 'cas-writer' },
        expectedRevision: 0,
        clientUpdatedAt: '2026-07-19T00:00:01.000Z',
      }),
    ]);

    const fulfilled = concurrent.filter(
      (result): result is PromiseFulfilledResult<GamePokeLoungeState> =>
        result.status === 'fulfilled',
    );
    const rejected = concurrent.filter(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );
    expect(fulfilled).toHaveLength(1);
    expect(fulfilled[0]?.value.revision).toBe(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.reason).toBeInstanceOf(ConflictException);
    expect((rejected[0]?.reason as ConflictException).getStatus()).toBe(409);

    const storedAfterRace = await repository.findOneByOrFail({
      userId: user.id,
    });
    expect(storedAfterRace.revision).toBe(1);
    expect(['legacy-writer', 'cas-writer']).toContain(
      storedAfterRace.state.marker,
    );

    await expect(
      service.savePokeLoungeState(user, {
        state: { marker: 'future-legacy-retry' },
        clientUpdatedAt: '2299-01-01T00:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      repository.findOneByOrFail({ userId: user.id }),
    ).resolves.toMatchObject({
      revision: 1,
      state: storedAfterRace.state,
      clientUpdatedAt: storedAfterRace.clientUpdatedAt,
    });
  });
});

async function resetLegacySchema(dataSource: DataSource): Promise<void> {
  await dataSource.query('DROP TABLE IF EXISTS game_poke_lounge_state CASCADE');
  await dataSource.query('DROP TABLE IF EXISTS game_history CASCADE');
  await dataSource.query('DROP TABLE IF EXISTS "user" CASCADE');
  await dataSource.query('DROP TYPE IF EXISTS game_history_gametype_enum');

  const queryRunner = dataSource.createQueryRunner();
  try {
    await new CreateLegacyCoreSchema1759999999999().up(queryRunner);
    await new AddPokeLoungeGameType1793664000000().up(queryRunner);
    await new CreateGamePokeLoungeState1793750400000().up(queryRunner);
  } finally {
    await queryRunner.release();
  }
}

async function runUp(dataSource: DataSource): Promise<void> {
  const queryRunner = dataSource.createQueryRunner();
  try {
    await new AddGameResultTrust1794355200000().up(queryRunner);
    await new AddGamePokeLoungeStateRevision1794700800000().up(queryRunner);
  } finally {
    await queryRunner.release();
  }
}

async function seedUsers(dataSource: DataSource, ids: string[]): Promise<void> {
  for (const id of ids) {
    await dataSource.query(
      `
      INSERT INTO "user" (id, email, "firstName", "lastName")
      VALUES ($1, $2, 'Test', 'User')
      `,
      [id, `${id}@example.com`],
    );
  }
}

function verifiedInput() {
  const terminalResult: CanonicalTerminalResult = {
    winnerPlayerId: 'player-a',
    loserPlayerId: 'player-b',
    reason: 'faint',
    scoreByPlayerId: { 'player-a': 100, 'player-b': 50 },
  };

  return {
    gameType: GameType.POKE_LOUNGE,
    terminalResult,
    playerAccounts: [
      { playerId: 'player-a', accountId: 'account-a' },
      { playerId: 'player-b', accountId: 'account-b' },
    ] as [
      { playerId: string; accountId: string },
      { playerId: string; accountId: string },
    ],
    source: { roomId: 'room-1', matchId: 'match-1' },
  };
}
