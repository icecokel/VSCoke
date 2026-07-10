import type { QueryRunner } from 'typeorm';
import { GameType } from '../game/enums/game-type.enum';
import { AddPokeLoungeGameType1793664000000 } from './1793664000000-add-poke-lounge-game-type';

describe('AddPokeLoungeGameType1793664000000', () => {
  it('creates the game enum with every current GameType value when it is missing', async () => {
    const query = await captureUpQuery();

    expect(query).toMatch(
      new RegExp(
        `CREATE TYPE "game_history_gametype_enum" AS ENUM \\(${Object.values(
          GameType,
        )
          .map((value) => `'${value}'`)
          .join(', ')}\\)`,
      ),
    );
  });

  it('adds POKE_LOUNGE without recreating an existing game enum', async () => {
    const query = await captureUpQuery();

    expect(query).toMatch(
      /ELSE\s+ALTER TYPE "game_history_gametype_enum" ADD VALUE IF NOT EXISTS 'POKE_LOUNGE'/,
    );
  });
});

async function captureUpQuery(): Promise<string> {
  const queries: string[] = [];
  const queryRunner = {
    query: (query: string): Promise<void> => {
      queries.push(query);

      return Promise.resolve();
    },
  } as unknown as QueryRunner;

  await new AddPokeLoungeGameType1793664000000().up(queryRunner);

  return queries[0];
}
