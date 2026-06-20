import { ConfigService } from '@nestjs/config';

const mockForRootAsync = jest.fn((options: unknown) => ({
  module: class MockTypeOrmRootModule {},
  providers: [{ provide: 'MOCK_TYPEORM_OPTIONS', useValue: options }],
  exports: [],
}));

const mockForFeature = jest.fn(() => ({
  module: class MockTypeOrmFeatureModule {},
}));

jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
  TypeOrmModule: {
    forRootAsync: mockForRootAsync,
    forFeature: mockForFeature,
  },
}));

import './app.module';

type TypeOrmRootOptions = {
  useFactory: (configService: ConfigService) => { synchronize: boolean };
};

const createConfigService = (values: Record<string, string | undefined>) =>
  ({
    get: jest.fn((key: string, defaultValue?: string) =>
      Object.prototype.hasOwnProperty.call(values, key)
        ? values[key]
        : defaultValue,
    ),
  }) as unknown as ConfigService;

describe('AppModule database synchronization options', () => {
  const getTypeOrmRootOptions = (): TypeOrmRootOptions => {
    expect(mockForRootAsync).toHaveBeenCalledTimes(1);
    return mockForRootAsync.mock.calls[0][0] as TypeOrmRootOptions;
  };

  it('defaults TypeORM synchronize to false when DB_SYNCHRONIZE is unset', () => {
    const options = getTypeOrmRootOptions();

    const result = options.useFactory(
      createConfigService({
        NODE_ENV: 'development',
      }),
    );

    expect(result.synchronize).toBe(false);
  });

  it('allows explicit DB_SYNCHRONIZE=true outside production', () => {
    const options = getTypeOrmRootOptions();

    const result = options.useFactory(
      createConfigService({
        NODE_ENV: 'development',
        DB_SYNCHRONIZE: 'true',
      }),
    );

    expect(result.synchronize).toBe(true);
  });

  it('fails fast when production explicitly enables DB_SYNCHRONIZE', () => {
    const options = getTypeOrmRootOptions();

    expect(() =>
      options.useFactory(
        createConfigService({
          NODE_ENV: 'production',
          DB_SYNCHRONIZE: 'true',
        }),
      ),
    ).toThrow('DB_SYNCHRONIZE=true is not allowed in production');
  });
});
