import {
  BadGatewayException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GameView } from './beat-jev.types';
import { JevClientService } from './jev-client.service';

const numberMatcher: unknown = expect.any(Number);
let logSpy: jest.SpiedFunction<Logger['log']>;
let errorSpy: jest.SpiedFunction<Logger['error']>;

const view: GameView = {
  gameId: 'connect-four',
  turn: 'JEV',
  result: null,
  data: { board: [] },
  legalActions: ['column:0', 'column:1'],
};

describe('JevClientService', () => {
  beforeEach(() => {
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => jest.restoreAllMocks());

  it('accepts a real choice-shaped response only when the action is legal', async () => {
    const config = {
      get: jest.fn().mockReturnValue('test-key'),
    } as unknown as ConfigService;
    const service = new JevClientService(config);
    const request = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(
        new Response(
          JSON.stringify({ answers: { move: { choice: 'column:1' } } }),
        ),
      );

    await expect(service.chooseAction(view)).resolves.toBe('column:1');
    expect(request).toHaveBeenCalledWith(
      'https://api.typesafe.ai/v1/systemone',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(logSpy).toHaveBeenCalledWith({
      event: 'jev.action',
      outcome: 'completed',
      provider: 'typesafe',
      model: 'jev-latest',
      gameId: 'connect-four',
      legalActionCount: 2,
      statusCode: 200,
      durationMs: numberMatcher,
    });
    expect(JSON.stringify(logSpy.mock.calls)).not.toMatch(
      /test-key|column:1|board/,
    );
  });

  it.each([
    {
      stage: 'request',
      statusCode: undefined,
      respond: () => Promise.reject(new Error('provider-secret')),
    },
    {
      stage: 'status',
      statusCode: 503,
      respond: () =>
        Promise.resolve(new Response('provider-secret', { status: 503 })),
    },
    {
      stage: 'response',
      statusCode: 200,
      respond: () => Promise.resolve(new Response('provider-secret')),
    },
    {
      stage: 'choice',
      statusCode: 200,
      respond: () =>
        Promise.resolve(
          new Response(JSON.stringify({ secret: 'provider-secret' })),
        ),
    },
    {
      stage: 'choice',
      statusCode: 200,
      respond: () =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              answers: { move: { choice: 'provider-secret' } },
            }),
          ),
        ),
    },
  ])(
    '$stage 실패의 단계와 HTTP 상태만 기록한다',
    async ({ stage, statusCode, respond }) => {
      const service = new JevClientService({
        get: () => 'private-api-key',
      } as unknown as ConfigService);
      jest.spyOn(global, 'fetch').mockImplementation(respond);

      await expect(service.chooseAction(view)).rejects.toThrow();

      expect(errorSpy).toHaveBeenCalledWith({
        event: 'jev.action',
        outcome: 'failed',
        provider: 'typesafe',
        model: 'jev-latest',
        gameId: 'connect-four',
        legalActionCount: 2,
        stage,
        statusCode,
        durationMs: numberMatcher,
      });
      expect(JSON.stringify(errorSpy.mock.calls)).not.toMatch(
        /private-api-key|provider-secret|board/,
      );
    },
  );

  it('describes Othello moves on an 8 by 8 board and keeps battleship on 4 by 4', async () => {
    const service = new JevClientService({
      get: () => 'test-key',
    } as unknown as ConfigService);
    const request = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ answers: { move: { choice: 'cell:63' } } }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ answers: { move: { choice: 'cell:15' } } }),
        ),
      );

    await expect(
      service.chooseAction({
        ...view,
        gameId: 'othello',
        legalActions: ['cell:63'],
      }),
    ).resolves.toBe('cell:63');
    const othelloBody = request.mock.calls[0][1]?.body;
    expect(othelloBody).toContain('"rules":"The board is 8 by 8');
    expect(othelloBody).toContain(
      'A side without a legal move passes automatically.',
    );
    expect(othelloBody).toContain(
      '"cell:63":"Choose row 7, column 7 (zero-based)."',
    );

    await expect(
      service.chooseAction({
        ...view,
        gameId: 'battleship',
        legalActions: ['cell:15'],
      }),
    ).resolves.toBe('cell:15');
    const battleshipBody = request.mock.calls[1][1]?.body;
    expect(battleshipBody).toContain(
      '"cell:15":"Choose row 3, column 3 (zero-based)."',
    );
  });

  it('rejects missing keys, malformed responses, invalid choices, and provider errors', async () => {
    const noKey = new JevClientService({
      get: () => '',
    } as unknown as ConfigService);
    await expect(noKey.chooseAction(view)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );

    const service = new JevClientService({
      get: () => 'test-key',
    } as unknown as ConfigService);
    const request = jest.spyOn(global, 'fetch');

    request.mockResolvedValueOnce(
      new Response(JSON.stringify({ answers: {} })),
    );
    await expect(service.chooseAction(view)).rejects.toBeInstanceOf(
      BadGatewayException,
    );

    request.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ answers: { move: { choice: 'column:9' } } }),
      ),
    );
    await expect(service.chooseAction(view)).rejects.toBeInstanceOf(
      BadGatewayException,
    );

    request.mockResolvedValueOnce(new Response('', { status: 503 }));
    await expect(service.chooseAction(view)).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });
});
