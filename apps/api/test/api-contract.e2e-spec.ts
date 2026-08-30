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
        type: 'number',
        nullable: true,
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
