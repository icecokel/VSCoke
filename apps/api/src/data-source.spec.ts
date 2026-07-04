import type { DataSource } from 'typeorm';

const originalEnv = process.env;

describe('TypeORM migration data source', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
    };
    delete process.env.DB_SYNCHRONIZE;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const loadDataSource = (): DataSource => {
    let dataSource: DataSource | undefined;

    jest.isolateModules(() => {
      dataSource = jest.requireActual<{ default: DataSource }>(
        './data-source',
      ).default;
    });

    if (!dataSource) {
      throw new Error('Data source module was not loaded');
    }

    return dataSource;
  };

  it('configures migration CLI without schema synchronize', () => {
    const dataSource = loadDataSource();

    expect(dataSource.options.type).toBe('postgres');
    expect(dataSource.options.synchronize).toBe(false);
    expect(dataSource.options.entities).toEqual([
      expect.stringContaining('*.entity{.ts,.js}'),
    ]);
    expect(dataSource.options.migrations).toEqual([
      expect.stringContaining('migrations'),
    ]);
  });

  it('fails fast when production enables DB_SYNCHRONIZE', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      DB_SYNCHRONIZE: 'true',
    };

    expect(() => loadDataSource()).toThrow(
      'DB_SYNCHRONIZE=true is not allowed in production',
    );
  });
});
