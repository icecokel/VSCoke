import { getMetadataArgsStorage } from 'typeorm';
import { PokeLoungeCompetitiveAction } from './competitive-action.entity';

describe('PokeLoungeCompetitiveAction', () => {
  it.each([
    'actorAccountId',
    'action',
    'canonicalAction',
    'requestHash',
    'response',
  ])('does not select private receipt field %s by default', (propertyName) => {
    const column = getMetadataArgsStorage().columns.find(
      (candidate) =>
        candidate.target === PokeLoungeCompetitiveAction &&
        candidate.propertyName === propertyName,
    );
    expect(column?.options.select).toBe(false);
  });
});
