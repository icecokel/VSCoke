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
        '/game/ranking',
        '/game/result',
        '/health',
        '/main-chat',
        '/recipes',
        '/resume-rag/chat',
        '/wordle/check',
        '/wordle/word',
      ]),
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
    expect(gameHistoryResponseSchema?.properties?.rank).toEqual(
      expect.objectContaining({
        type: 'integer',
      }),
    );

    const gameResultOperation = document.paths?.['/game/result']
      ?.post as ContractOperation;
    const publicResultOperation = document.paths?.['/game/result/{id}']
      ?.get as ContractOperation;
    const resumeChatOperation = document.paths?.['/resume-rag/chat']
      ?.post as ContractOperation;
    const wordleCheckOperation = document.paths?.['/wordle/check']
      ?.post as ContractOperation;

    expect(gameResultOperation.responses?.['201']).toBeDefined();
    expect(gameResultOperation.security).toEqual([{ bearer: [] }]);
    expect(rankingOperation.security).toBeUndefined();
    expect(publicResultOperation.security).toBeUndefined();
    expect(resumeChatOperation.responses?.['200']).toBeDefined();
    expect(resumeChatOperation.responses?.['201']).toBeUndefined();
    expect(wordleCheckOperation.responses?.['200']).toBeDefined();
    expect(wordleCheckOperation.responses?.['201']).toBeUndefined();
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
  });
});

describe('OpenAPI 의미 계약', () => {
  it('모든 operation의 성공 설명·태그·오류 envelope를 명시한다', async () => {
    const document = await createLocalOpenApiDocument();
    const tags = new Map(
      document.tags?.map((tag) => [tag.name, tag.description]),
    );
    let operations = 0;
    for (const path of Object.values(document.paths)) {
      for (const method of httpMethods) {
        const operation = path[method];
        if (!operation) continue;
        operations += 1;
        expect(operation.summary?.trim()).toBeTruthy();
        expect(operation.tags?.length).toBeGreaterThan(0);
        for (const tag of operation.tags ?? [])
          expect(tags.get(tag)?.trim()).toBeTruthy();
        expect(operation.responses['500']).toBeDefined();
        for (const [status, response] of Object.entries(operation.responses)) {
          if ('$ref' in response) continue;
          expect(response.description.trim()).toBeTruthy();
          if (Number(status) >= 400) {
            expect(response.content?.['application/json']?.schema).toEqual({
              $ref: '#/components/schemas/ApiErrorResponseDto',
            });
          }
        }
      }
    }
    expect(operations).toBe(16);
  });

  it('점수·시간·등수는 정수이며 시간만 null을 허용한다', async () => {
    const document = await createLocalOpenApiDocument();
    const input = document.components?.schemas
      ?.CreateGameHistoryDto as ContractSchema;
    expect(input.properties?.score).toMatchObject({
      type: 'integer',
      minimum: 1,
      maximum: 1_000_000,
    });
    expect(input.properties?.playTime).toMatchObject({
      type: 'integer',
      nullable: true,
    });
    const history = document.components?.schemas
      ?.GameHistoryResponseDto as ContractSchema;
    for (const field of [
      'score',
      'rank',
      'bestScore',
      'allTimeRank',
      'weeklyRank',
    ]) {
      expect(history.properties?.[field]?.type).toBe('integer');
      expect(history.properties?.[field]?.nullable).not.toBe(true);
    }
    expect(history.required).not.toContain('rank');
  });

  it('guard·검증·대화 충돌에서 실제 발생하는 오류 상태를 명시한다', async () => {
    const document = await createLocalOpenApiDocument();
    const required = [
      ['/wordle/check', 'post', ['400', '500']],
      ['/wordle/word', 'get', ['404', '500']],
      ['/game/result', 'post', ['400', '401', '500']],
      ['/game/ranking', 'get', ['400', '500']],
      ['/game/result/{id}', 'get', ['400', '404', '500']],
      ['/main-chat', 'post', ['400', '403', '404', '409', '429', '500', '503']],
      [
        '/resume-rag/chat',
        'post',
        ['400', '403', '404', '409', '429', '500', '503'],
      ],
      ['/resume-rag/conversations', 'post', ['400', '403', '429', '500']],
      [
        '/resume-rag/conversations/{id}',
        'get',
        ['400', '403', '404', '429', '500'],
      ],
      [
        '/resume-rag/conversations/{id}',
        'delete',
        ['400', '403', '404', '429', '500'],
      ],
    ] as const;
    for (const [path, method, statuses] of required) {
      expect(Object.keys(document.paths[path][method]!.responses)).toEqual(
        expect.arrayContaining(statuses),
      );
    }
  });
});
