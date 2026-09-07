import { readdirSync } from 'node:fs';
import { join } from 'node:path';

export const getMigrationFilePaths = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true })
    // TypeORM이 import하기 전에 테스트·선언 파일을 제외한다.
    .filter(
      (entry) => entry.isFile() && /^\d+-[a-z0-9-]+\.(ts|js)$/.test(entry.name),
    )
    .map((entry) => join(directory, entry.name))
    .sort();
