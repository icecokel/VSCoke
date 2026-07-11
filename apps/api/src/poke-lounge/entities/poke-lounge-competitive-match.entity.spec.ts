import { getMetadataArgsStorage } from 'typeorm';
import { PokeLoungeCompetitiveMatch } from './poke-lounge-competitive-match.entity';

describe('PokeLoungeCompetitiveMatch', () => {
  it.each([
    'roomId',
    'roomCode',
    'assignmentRevision',
    'playerAccounts',
    'rulesetVersion',
    'rulesetHash',
    'serverSeed',
    'initialState',
    'initialStateHash',
  ])(
    'marks assignment field %s immutable for repository updates',
    (propertyName) => {
      const column = getMetadataArgsStorage().columns.find(
        (candidate) =>
          candidate.target === PokeLoungeCompetitiveMatch &&
          candidate.propertyName === propertyName,
      );

      expect(column?.options.update).toBe(false);
    },
  );

  it.each(['serverSeed', 'initialState', 'currentState', 'terminalResult'])(
    'does not select private field %s by default',
    (propertyName) => {
      const column = getMetadataArgsStorage().columns.find(
        (candidate) =>
          candidate.target === PokeLoungeCompetitiveMatch &&
          candidate.propertyName === propertyName,
      );

      expect(column?.options.select).toBe(false);
    },
  );
});
