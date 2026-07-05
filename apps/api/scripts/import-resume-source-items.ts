import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import dataSource from '../src/data-source';
import { ResumeImportBatch } from '../src/resume-rag/entities/resume-import-batch.entity';
import { ResumeSourceItem } from '../src/resume-rag/entities/resume-source-item.entity';
import { ResumeSourceItemImportService } from '../src/resume-rag/import/resume-source-item-import.service';
import { createResumeImportManifest } from '../src/resume-rag/import/resume-source-item-loader';

const findRepoRoot = (start: string): string => {
  let current = start;
  while (current !== dirname(current)) {
    if (existsSync(join(current, 'pnpm-workspace.yaml'))) {
      return current;
    }
    current = dirname(current);
  }
  throw new Error('Unable to find repo root from current working directory');
};

const main = async () => {
  const repoRoot = findRepoRoot(process.cwd());
  const resumeWorkspaceRoot =
    process.env.RESUME_WORKSPACE_ROOT || '/Users/smlee/Documents/resume';

  await dataSource.initialize();
  try {
    const service = new ResumeSourceItemImportService(
      dataSource.getRepository(ResumeImportBatch),
      dataSource.getRepository(ResumeSourceItem),
    );
    const entries = createResumeImportManifest({
      repoRoot,
      resumeWorkspaceRoot,
    });
    const batch = await service.importEntries(entries, repoRoot);
    console.log(JSON.stringify(batch.summary, null, 2));
  } finally {
    await dataSource.destroy();
  }
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
