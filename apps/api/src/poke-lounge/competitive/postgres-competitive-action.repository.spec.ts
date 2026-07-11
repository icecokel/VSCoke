import {
  hashCompetitiveActionRequest,
  isSupportedCompetitiveRuleset,
  resolveTurnReceipts,
} from './postgres-competitive-action.repository';
import type { PokeLoungeCompetitiveAction } from './competitive-action.entity';
import {
  COMPETITIVE_RULESET_HASH,
  COMPETITIVE_RULESET_VERSION,
} from '@vscoke/poke-lounge-battle';

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

describe('competitive action resolution guards', () => {
  it('updates both turn receipts with one resolved response and timestamp', () => {
    const receipts = [
      { status: 'pending', response: { currentTurn: 0 }, resolvedAt: null },
      { status: 'resolved', response: { currentTurn: 1 }, resolvedAt: null },
    ] as unknown as [PokeLoungeCompetitiveAction, PokeLoungeCompetitiveAction];
    const response = { currentTurn: 1 } as never;
    const resolvedAt = new Date('2026-07-11T00:00:00.000Z');

    resolveTurnReceipts(receipts, response, resolvedAt);

    expect(receipts).toEqual([
      { status: 'resolved', response, resolvedAt },
      { status: 'resolved', response, resolvedAt },
    ]);
  });

  it('accepts only the currently supported persisted ruleset identity', () => {
    expect(
      isSupportedCompetitiveRuleset({
        rulesetVersion: COMPETITIVE_RULESET_VERSION,
        rulesetHash: COMPETITIVE_RULESET_HASH,
      }),
    ).toBe(true);
    expect(
      isSupportedCompetitiveRuleset({
        rulesetVersion: COMPETITIVE_RULESET_VERSION + 1,
        rulesetHash: COMPETITIVE_RULESET_HASH,
      }),
    ).toBe(false);
    expect(
      isSupportedCompetitiveRuleset({
        rulesetVersion: COMPETITIVE_RULESET_VERSION,
        rulesetHash: '0'.repeat(64),
      }),
    ).toBe(false);
  });
});
