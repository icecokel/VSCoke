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
  });
});
