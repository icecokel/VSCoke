import { randomUUID } from 'node:crypto';
import type { CanonicalTerminalResult } from '@vscoke/poke-lounge-battle';
import { DataSource } from 'typeorm';
import { User } from '../src/auth/entities/user.entity';
import { GameHistory } from '../src/game/entities/game-history.entity';
import { GamePokeLoungeState } from '../src/game/entities/game-poke-lounge-state.entity';
import { GameType } from '../src/game/enums/game-type.enum';
import { GameService } from '../src/game/game.service';
import { VerifiedPokeLoungeHistoryWriter } from '../src/game/verified-poke-lounge-history-writer.service';
import { CreateLegacyCoreSchema1759999999999 } from '../src/migrations/1759999999999-create-legacy-core-schema';
import { AddPokeLoungeGameType1793664000000 } from '../src/migrations/1793664000000-add-poke-lounge-game-type';
import { AddGameResultTrust1794355200000 } from '../src/migrations/1794355200000-add-game-result-trust';
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
    expect(ranking.map(({ userId, score }) => ({ userId, score }))).toEqual([
      { userId: 'account-a', score: 100 },
      { userId: 'account-b', score: 50 },
    ]);
    await expect(
      service.getUserRank('account-b', 50, GameType.POKE_LOUNGE),
    ).resolves.toBe(2);
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
  } finally {
    await queryRunner.release();
  }
}

async function runUp(dataSource: DataSource): Promise<void> {
  const queryRunner = dataSource.createQueryRunner();
  try {
    await new AddGameResultTrust1794355200000().up(queryRunner);
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
