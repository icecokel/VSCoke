import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getMigrationFilePaths } from './migration-file-paths';

describe('getMigrationFilePaths', () => {
  let directory: string;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'vscoke-migration-paths-'));
  });

  afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  it('실행 가능한 migration만 정렬하고 테스트·선언·소스맵을 제외한다', () => {
    const files = [
      '1795000000000-create-conversations.js',
      '1760000000000-create-rag.ts',
      '1760000000000-create-rag.spec.ts',
      '1795000000000-create-conversations.spec.js',
      '1795000000000-create-conversations.test.ts',
      '1795000000000-create-conversations.d.ts',
      '1795000000000-create-conversations.js.map',
      'migration-identity.spec.ts',
      'migration-helper.ts',
    ];
    for (const file of files) writeFileSync(join(directory, file), '');
    mkdirSync(join(directory, '1796000000000-not-a-file.ts'));

    expect(getMigrationFilePaths(directory)).toEqual([
      join(directory, '1760000000000-create-rag.ts'),
      join(directory, '1795000000000-create-conversations.js'),
    ]);
  });

  it('없는 디렉터리를 빈 migration 목록으로 숨기지 않는다', () => {
    expect(() => getMigrationFilePaths(join(directory, 'missing'))).toThrow();
  });
});
