import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { CreateLegacyCoreSchema1759999999999 } from '../src/migrations/1759999999999-create-legacy-core-schema';
import { AddArcadeBasketball1795250000000 } from '../src/migrations/1795250000000-add-arcade-basketball';
import { GameHistory } from '../src/game/entities/game-history.entity';
import { GameService } from '../src/game/game.service';
import { GameType } from '../src/game/enums/game-type.enum';
import { User } from '../src/auth/entities/user.entity';
import { requireTestDatabaseUrl } from '../src/test-data-source';

describe('농구 랭킹 PostgreSQL 저장과 조회', () => {
  const configuredUrl = new URL(requireTestDatabaseUrl());
  const databaseName = `vscoke_basketball_${randomUUID().replaceAll('-', '')}_test`;
  let admin: DataSource;
  let source: DataSource;

  beforeAll(async () => {
    const adminUrl = new URL(configuredUrl);
    adminUrl.pathname = '/postgres';
    admin = new DataSource({ type: 'postgres', url: adminUrl.toString() });
    await admin.initialize();
    await admin.query(`CREATE DATABASE "${databaseName}"`);
    const url = new URL(configuredUrl);
    url.pathname = `/${databaseName}`;
    source = new DataSource({
      type: 'postgres',
      url: url.toString(),
      entities: [GameHistory, User],
      synchronize: false,
    });
    await source.initialize();
    const runner = source.createQueryRunner();
    try {
      await new CreateLegacyCoreSchema1759999999999().up(runner);
      await new AddArcadeBasketball1795250000000().up(runner);
    } finally {
      await runner.release();
    }
  });

  afterAll(async () => {
    if (source?.isInitialized) await source.destroy();
    if (admin?.isInitialized) {
      await admin.query(
        `DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`,
      );
      await admin.destroy();
    }
  });

  it('농구 기록이 없으면 enum을 되돌린 뒤 재적용할 수 있다', async () => {
    const runner = source.createQueryRunner();
    const migration = new AddArcadeBasketball1795250000000();
    try {
      await migration.down(runner);
      const labels = await source.query<Array<{ enumlabel: string }>>(
        `SELECT enumlabel FROM pg_enum WHERE enumtypid = 'public.game_history_gametype_enum'::regtype ORDER BY enumsortorder`,
      );
      expect(labels.map((row) => row.enumlabel)).toEqual(['SKY_DROP']);
      await migration.up(runner);
    } finally {
      await runner.release();
    }
  });

  it('개인 최고 점수 하나로 순위를 만들고 Sky Drop 기록을 구분한다', async () => {
    const users = await source.getRepository(User).save([
      {
        id: 'basketball-one',
        email: 'one@example.test',
        firstName: 'One',
        lastName: 'Player',
      },
      {
        id: 'basketball-two',
        email: 'two@example.test',
        firstName: 'Two',
        lastName: 'Player',
      },
    ]);
    const service = new GameService(source.getRepository(GameHistory));
    for (const score of [8, 12]) {
      await service.createHistory(users[0], {
        score,
        playTime: 30,
        gameType: GameType.ARCADE_BASKETBALL,
      });
    }
    await service.createHistory(users[1], {
      score: 15,
      playTime: 30,
      gameType: GameType.ARCADE_BASKETBALL,
    });
    await service.createHistory(users[0], {
      score: 500,
      playTime: 30,
      gameType: GameType.SKY_DROP,
    });
    const ranking = await service.getRanking(GameType.ARCADE_BASKETBALL);
    expect(
      ranking.map(({ rank, score, user }) => ({
        rank,
        score,
        name: user.displayName,
      })),
    ).toEqual([
      { rank: 1, score: 15, name: 'Two Player' },
      { rank: 2, score: 12, name: 'One Player' },
    ]);
    await expect(
      service.getUserRank(users[0].id, 12, GameType.ARCADE_BASKETBALL),
    ).resolves.toBe(2);
    await expect(
      service.getUserBestScore(users[0].id, GameType.ARCADE_BASKETBALL),
    ).resolves.toBe(12);
    await expect(
      service.createHistory(users[0], {
        score: 43,
        playTime: 30,
        gameType: GameType.ARCADE_BASKETBALL,
      }),
    ).rejects.toThrow();
    const runner = source.createQueryRunner();
    try {
      await expect(
        new AddArcadeBasketball1795250000000().down(runner),
      ).rejects.toThrow('Basketball ranking records exist');
    } finally {
      await runner.release();
    }
  });
});
