import type { DataSource } from 'typeorm';

const originalEnv = process.env;

describe('Poke Lounge test data source', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
    };
    delete process.env.TEST_DATABASE_URL;
    delete process.env.DATABASE_URL;
    delete process.env.DB_DATABASE;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('fails before connection setup when TEST_DATABASE_URL is missing', () => {
    process.env.DB_HOST = 'localhost';
    process.env.DB_USERNAME = 'postgres';
    process.env.DB_DATABASE = 'vscoke_test';

    expect(() => loadTestDataSource()).toThrow(
      'TEST_DATABASE_URL is required for PostgreSQL tests',
    );
  });

  it('rejects a URL whose database name does not end in _test', () => {
    process.env.TEST_DATABASE_URL =
      'postgresql://postgres:postgres@127.0.0.1:5432/vscoke';

    expect(() => loadTestDataSource()).toThrow(
      'TEST_DATABASE_URL database name must end in _test',
    );
  });

  it.each([
    'postgresql://postgres:postgres@127.0.0.1:5432/vscoke_test?host=production-db',
    'postgresql://postgres:postgres@127.0.0.1:5432/vscoke_test?port=6543',
    'postgresql://postgres:postgres@127.0.0.1:5432/vscoke_test?HOST=production-db',
    'postgresql://postgres:postgres@127.0.0.1:5432/vscoke_test?%68ost=production-db',
    'postgresql://postgres:postgres@127.0.0.1:5432/vscoke_test?%70ort=6543',
  ])('rejects test database URL query parameters in %s', (url) => {
    process.env.TEST_DATABASE_URL = url;

    expect(() => loadTestDataSource()).toThrow(
      'TEST_DATABASE_URL must not include query parameters',
    );
  });

  it.each([
    [
      'postgresql:///vscoke_test',
      'TEST_DATABASE_URL must include a database host',
    ],
    [
      'postgresql://127.0.0.1:5432/vscoke_test',
      'TEST_DATABASE_URL must include a database user',
    ],
  ])('rejects implicit connection defaults in %s', (url, message) => {
    process.env.TEST_DATABASE_URL = url;

    expect(() => loadTestDataSource()).toThrow(message);
  });

  it('rejects equality with a configured regular database URL', () => {
    const url = 'postgresql://postgres:postgres@127.0.0.1:5432/vscoke_test';
    process.env.TEST_DATABASE_URL = url;
    process.env.DATABASE_URL = url;

    expect(() => loadTestDataSource()).toThrow(
      'TEST_DATABASE_URL must not equal the regular database URL',
    );
  });

  it('rejects the same regular database target through a protocol alias', () => {
    process.env.TEST_DATABASE_URL =
      'postgresql://test-user:test-pass@127.0.0.1:5432/vscoke_test';
    process.env.DATABASE_URL =
      'postgres://regular-user:regular-pass@127.0.0.1/vscoke_test?sslmode=require';

    expect(() => loadTestDataSource()).toThrow(
      'TEST_DATABASE_URL must not equal the regular database URL',
    );
  });

  it('rejects equality with the configured regular database name', () => {
    process.env.TEST_DATABASE_URL =
      'postgresql://postgres:postgres@127.0.0.1:5432/vscoke_test';
    process.env.DB_DATABASE = 'vscoke_test';

    expect(() => loadTestDataSource()).toThrow(
      'TEST_DATABASE_URL must not target DB_DATABASE',
    );
  });

  it('uses only the guarded URL and keeps synchronize disabled', () => {
    const url = 'postgresql://postgres:postgres@127.0.0.1:5432/vscoke_test';
    process.env.TEST_DATABASE_URL = url;
    process.env.DB_DATABASE = 'vscoke';

    const dataSource = loadTestDataSource();

    expect(dataSource.options).toMatchObject({
      type: 'postgres',
      url,
      synchronize: false,
    });
    expect(dataSource.options).not.toHaveProperty('host');
    expect(dataSource.options).not.toHaveProperty('username');
    expect(dataSource.options).not.toHaveProperty('database');
    expect(dataSource.options.entities).toEqual([
      expect.stringContaining('*.entity{.ts,.js}'),
    ]);
    expect(dataSource.options.migrations).toEqual([
      expect.stringContaining('migrations'),
    ]);
  });
});

function loadTestDataSource(): DataSource {
  let dataSource: DataSource | undefined;

  jest.isolateModules(() => {
    dataSource = jest.requireActual<{ default: DataSource }>(
      './test-data-source',
    ).default;
  });

  if (!dataSource) {
    throw new Error('Test data source module was not loaded');
  }

  return dataSource;
}
