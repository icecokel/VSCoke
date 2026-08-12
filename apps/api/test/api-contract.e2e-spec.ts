import { createLocalOpenApiDocument } from './../src/api-contract';

const httpMethods = [
  'get',
  'put',
  'post',
  'delete',
  'options',
  'head',
  'patch',
  'trace',
] as const;

type ContractSchema = {
  type?: string;
  nullable?: boolean;
  $ref?: string;
  enum?: Array<string | number | boolean>;
  required?: string[];
  properties?: Record<string, ContractSchema>;
  allOf?: Array<{ $ref?: string }>;
  items?: {
    $ref?: string;
  };
};

type ContractResponse = {
  content?: Record<string, { schema?: ContractSchema }>;
};

type ContractOperation = {
  description?: string;
  security?: Array<Record<string, string[]>>;
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
        '/main-chat',
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
    const rankingOperation = document.paths?.['/game/ranking']
      ?.get as ContractOperation;
    const rankingSchema = document.components?.schemas
      ?.GameRankingHistoryDto as ContractComponentSchema | undefined;
    const gameHistoryResponseSchema = document.components?.schemas
      ?.GameHistoryResponseDto as ContractComponentSchema | undefined;

    const rankingResponseSchema =
      rankingResponse?.content?.['application/json']?.schema;

    expect(rankingResponseSchema).toEqual({
      type: 'object',
      required: ['success', 'data'],
      properties: {
        success: { type: 'boolean', enum: [true] },
        data: {
          type: 'array',
          items: {
            $ref: '#/components/schemas/GameRankingHistoryDto',
          },
        },
      },
    });
    expect(Object.keys(rankingSchema?.properties ?? {}).sort()).toEqual([
      'createdAt',
      'rank',
      'score',
      'user',
    ]);
    expect(rankingSchema?.properties?.user?.allOf?.[0]?.$ref).toBe(
      '#/components/schemas/GameHistoryUserDto',
    );
    expect(rankingOperation.description).toContain(
      '서버에서 검증된 대전 결과만 포함',
    );
    expect(gameHistoryResponseSchema?.properties?.rank).toEqual(
      expect.objectContaining({
        type: 'number',
        nullable: true,
      }),
    );

    const gameResultOperation = document.paths?.['/game/result']
      ?.post as ContractOperation;
    const savedStateGetOperation = document.paths?.['/game/poke-lounge/state']
      ?.get as ContractOperation;
    const savedStatePutOperation = document.paths?.['/game/poke-lounge/state']
      ?.put as ContractOperation;
    const publicResultOperation = document.paths?.['/game/result/{id}']
      ?.get as ContractOperation;
    const resumeChatOperation = document.paths?.['/resume-rag/chat']
      ?.post as ContractOperation;
    const wordleCheckOperation = document.paths?.['/wordle/check']
      ?.post as ContractOperation;
    const competitiveSeatOperation = document.paths?.[
      '/poke-lounge/rooms/{roomCode}/competitive-seat'
    ]?.post as ContractOperation;
    const competitiveActionOperation = document.paths?.[
      '/poke-lounge/rooms/{roomCode}/matches/{matchId}/actions'
    ]?.post as ContractOperation;

    expect(gameResultOperation.responses?.['201']).toBeDefined();
    expect(gameResultOperation.security).toEqual([{ bearer: [] }]);
    expect(savedStateGetOperation.security).toEqual([{ bearer: [] }]);
    expect(savedStatePutOperation.security).toEqual([{ bearer: [] }]);
    expect(rankingOperation.security).toBeUndefined();
    expect(publicResultOperation.security).toBeUndefined();
    expect(resumeChatOperation.responses?.['200']).toBeDefined();
    expect(resumeChatOperation.responses?.['201']).toBeUndefined();
    expect(wordleCheckOperation.responses?.['200']).toBeDefined();
    expect(wordleCheckOperation.responses?.['201']).toBeUndefined();
    expect(competitiveSeatOperation.security).toEqual([{ bearer: [] }]);
    expect(competitiveActionOperation.security).toEqual([{ bearer: [] }]);

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

  it('documents every successful JSON response with the runtime envelope', async () => {
    const document = await createLocalOpenApiDocument();
    const documentedResponses: string[] = [];

    Object.entries(document.paths).forEach(([path, pathItem]) => {
      httpMethods.forEach((method) => {
        const operation = pathItem[method];

        if (!operation) {
          return;
        }

        Object.entries(operation.responses).forEach(
          ([statusCode, response]) => {
            if (
              !response ||
              !/^2\d\d$/.test(statusCode) ||
              '$ref' in response
            ) {
              return;
            }

            const schema = response.content?.['application/json']?.schema as
              | ContractSchema
              | undefined;

            if (!schema) {
              return;
            }

            const responseName = `${method.toUpperCase()} ${path} ${statusCode}`;
            documentedResponses.push(responseName);
            expect(schema.type).toBe('object');
            expect(schema.required).toEqual(
              expect.arrayContaining(['success', 'data']),
            );
            expect(schema.properties?.success).toEqual({
              type: 'boolean',
              enum: [true],
            });
            expect(schema.properties?.data).toBeDefined();
          },
        );
      });
    });

    expect(documentedResponses.length).toBeGreaterThan(0);

    const conflictSchema =
      document.paths?.['/poke-lounge/rooms/{roomCode}/ready']?.post
        ?.responses?.['409'];

    expect(conflictSchema).toEqual(
      expect.objectContaining({
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/PokeLoungeRoomConflictResponseDto',
            },
          },
        },
      }),
    );
  });
});
