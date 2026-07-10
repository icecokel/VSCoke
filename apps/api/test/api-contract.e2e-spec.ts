import { createLocalOpenApiDocument } from './../src/api-contract';

type ContractSchema = {
  type?: string;
  nullable?: boolean;
  items?: {
    $ref?: string;
  };
};

type ContractResponse = {
  content?: Record<string, { schema?: ContractSchema }>;
};

type ContractOperation = {
  parameters?: Array<{
    in?: string;
    name?: string;
    required?: boolean;
  }>;
  requestBody?: {
    content?: Record<string, { schema?: ContractSchema & { $ref?: string } }>;
  };
  responses?: Record<string, ContractResponse>;
};

type ContractComponentSchema = {
  properties?: Record<string, ContractSchema>;
};

describe('Local OpenAPI contract generation', () => {
  const dbEnvKeys = [
    'DB_HOST',
    'DB_PORT',
    'DB_USERNAME',
    'DB_PASSWORD',
    'DB_DATABASE',
  ] as const;
  const originalDbEnv = new Map<string, string | undefined>();

  beforeEach(() => {
    dbEnvKeys.forEach((key) => {
      originalDbEnv.set(key, process.env[key]);
      delete process.env[key];
    });
  });

  afterEach(() => {
    dbEnvKeys.forEach((key) => {
      const value = originalDbEnv.get(key);
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    });
    originalDbEnv.clear();
  });

  it('generates the frontend contract from local API code without DB env', async () => {
    const document = await createLocalOpenApiDocument();

    expect(document.info.title).toBe('VSCoke API');
    expect(Object.keys(document.paths ?? {}).sort()).toEqual(
      expect.arrayContaining([
        '/',
        '/espresso-history/beans',
        '/game/poke-lounge/state',
        '/game/ranking',
        '/game/result',
        '/health',
        '/poke-lounge/rooms',
        '/poke-lounge/rooms/{roomCode}',
        '/recipes',
        '/resume-rag/chat',
        '/wordle/check',
        '/wordle/word',
      ]),
    );
    expect(document.components?.schemas?.GameType?.enum).toEqual(
      expect.arrayContaining(['POKE_LOUNGE']),
    );
    const rankingResponse = document.paths?.['/game/ranking']?.get?.responses?.[
      '200'
    ] as ContractResponse | undefined;
    const gameHistoryResponseSchema = document.components?.schemas
      ?.GameHistoryResponseDto as ContractComponentSchema | undefined;

    expect(rankingResponse?.content?.['application/json']?.schema).toEqual({
      type: 'array',
      items: {
        $ref: '#/components/schemas/GameRankingHistoryDto',
      },
    });
    expect(gameHistoryResponseSchema?.properties?.rank).toEqual(
      expect.objectContaining({
        type: 'number',
        nullable: true,
      }),
    );

    const roomSchema = document.components?.schemas
      ?.PokeLoungeRoomResponseDto as ContractComponentSchema | undefined;
    const conflictSchema = document.components?.schemas
      ?.PokeLoungeRoomConflictResponseDto as
      | ContractComponentSchema
      | undefined;

    expect(roomSchema?.properties?.revision?.type).toBe('number');
    expect(roomSchema?.properties?.expiresAtMs?.type).toBe('number');
    expect(conflictSchema?.properties?.statusCode?.type).toBe('number');
    expect(Object.keys(conflictSchema?.properties ?? {})).toEqual(
      expect.arrayContaining(['statusCode', 'code', 'message', 'snapshot']),
    );

    for (const [operation, requestDto] of [
      [document.paths?.['/poke-lounge/rooms']?.post, 'CreatePokeLoungeRoomDto'],
      [
        document.paths?.['/poke-lounge/rooms/{roomCode}/join']?.post,
        'JoinPokeLoungeRoomDto',
      ],
      [
        document.paths?.['/poke-lounge/rooms/{roomCode}/ready']?.post,
        'SetPokeLoungeReadyDto',
      ],
      [
        document.paths?.['/poke-lounge/rooms/{roomCode}/party-snapshot']?.post,
        'UpdatePokeLoungePartySnapshotDto',
      ],
      [
        document.paths?.['/poke-lounge/rooms/{roomCode}/result']?.post,
        'SubmitPokeLoungeMatchResultDto',
      ],
      [
        document.paths?.['/poke-lounge/rooms/{roomCode}/leave']?.post,
        'LeavePokeLoungeRoomDto',
      ],
    ] as const) {
      const roomOperation = operation as ContractOperation | undefined;

      expect(roomOperation).toBeDefined();
      expect(roomOperation?.parameters).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            in: 'header',
            name: 'X-Idempotency-Key',
            required: true,
          }),
          expect.objectContaining({
            in: 'header',
            name: 'If-Match-Revision',
            required: true,
          }),
        ]),
      );
      expect(
        roomOperation?.requestBody?.content?.['application/json']?.schema?.$ref,
      ).toBe(`#/components/schemas/${requestDto}`);
      expect(roomOperation?.responses?.['409']).toBeDefined();
    }
  });
});
