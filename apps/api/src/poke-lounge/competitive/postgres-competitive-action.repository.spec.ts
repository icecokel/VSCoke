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
import type { DataSource } from 'typeorm';
import { PostgresCompetitiveActionRepository } from './postgres-competitive-action.repository';

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

describe('PostgresCompetitiveActionRepository command replay ordering', () => {
  it.each(['pending', 'resolved'] as const)(
    'replays a stored %s receipt before rejecting an unsupported ruleset',
    async (status) => {
      const input = actionInput();
      const response = {
        matchId: input.matchId,
        assignmentRevision: 1,
        submittedTurn: 0,
        currentTurn: status === 'pending' ? 0 : 1,
        status: status === 'pending' ? 'active' : 'completed',
        playerIds: ['player-a', 'player-b'] as [string, string],
        stateHash: 'b'.repeat(64),
        terminal: null,
      };
      const { repository, actionEntityRepository } = repositoryWithReceipt({
        requestHash: hashCompetitiveActionRequest(input),
        response,
        status,
      });

      const result = await repository.submit(input);

      expect(result).toMatchObject({
        outcome: 'replayed',
        response,
        committed: false,
      });
      expect(result.room).toMatchObject({ roomCode: 'ROOM01', revision: 7 });
      expect(actionEntityRepository.save).not.toHaveBeenCalled();
    },
  );

  it('returns command conflict for a changed replay before rejecting an unsupported ruleset', async () => {
    const input = actionInput();
    const { repository, actionEntityRepository } = repositoryWithReceipt({
      requestHash: hashCompetitiveActionRequest(input),
      response: { currentTurn: 0 },
      status: 'pending',
    });

    await expect(
      repository.submit({
        ...input,
        action: { kind: 'switch', slotIndex: 1 },
      }),
    ).resolves.toEqual({ outcome: 'command-conflict' });
    expect(actionEntityRepository.save).not.toHaveBeenCalled();
  });
});

function actionInput() {
  return {
    roomCode: 'ROOM01',
    matchId: '11111111-1111-4111-8111-111111111111',
    accountId: 'account-a',
    assignmentRevision: 1,
    turn: 0,
    clientCommandId: '00000000-0000-4000-8000-000000000001',
    action: { kind: 'move' as const, moveId: 'steady-strike' },
  };
}

function repositoryWithReceipt(receipt: {
  requestHash: string;
  response: unknown;
  status: 'pending' | 'resolved';
}) {
  const room = {
    id: 'room-id',
    roomCode: 'ROOM01',
    revision: 7,
    expiresAt: new Date('2026-07-11T01:00:00.000Z'),
    state: {
      roomCode: 'ROOM01',
      revision: 7,
      updatedAtMs: 0,
      participants: [],
    },
  };
  const match = {
    matchId: actionInput().matchId,
    playerAccounts: [
      { playerId: 'player-a', accountId: 'account-a' },
      { playerId: 'player-b', accountId: 'account-b' },
    ],
    rulesetVersion: COMPETITIVE_RULESET_VERSION,
    rulesetHash: '0'.repeat(64),
  };
  const roomRepository = queryRepository(room);
  const matchRepository = queryRepository(match);
  const actionEntityRepository = queryRepository({
    actorPlayerId: 'player-a',
    clientCommandId: actionInput().clientCommandId,
    ...receipt,
  });
  const manager = {
    getRepository: jest
      .fn()
      .mockReturnValueOnce(roomRepository)
      .mockReturnValueOnce(matchRepository)
      .mockReturnValue(actionEntityRepository),
  };
  const dataSource = {
    transaction: jest.fn((callback: (value: typeof manager) => unknown) =>
      callback(manager),
    ),
  } as unknown as DataSource;

  return {
    repository: new PostgresCompetitiveActionRepository(dataSource),
    actionEntityRepository,
  };
}

function queryRepository(result: unknown) {
  const queryBuilder = {
    setLock: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(result),
  };

  return {
    createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    save: jest.fn(),
  };
}
