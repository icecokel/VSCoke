import { hashCompetitiveActionRequest } from './postgres-competitive-action.repository';

describe('hashCompetitiveActionRequest', () => {
  it('is canonical for the same command and changes with authoritative fields', () => {
    const input = {
      matchId: 'match-1',
      assignmentRevision: 1,
      turn: 0,
      clientCommandId: '00000000-0000-4000-8000-000000000001',
      action: { kind: 'move' as const, moveId: 'steady-strike' },
    };
    const hash = hashCompetitiveActionRequest(input);

    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashCompetitiveActionRequest({ ...input })).toBe(hash);
    expect(
      hashCompetitiveActionRequest({
        ...input,
        action: { kind: 'switch', slotIndex: 1 },
      }),
    ).not.toBe(hash);
    expect(hashCompetitiveActionRequest({ ...input, turn: 1 })).not.toBe(hash);
  });
});
