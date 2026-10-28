import dataSource from '../../src/test-data-source';
import { useSyntheticResumeMigration } from './synthetic-resume-migration';

const migrate = async (): Promise<void> => {
  await dataSource.initialize();
  try {
    useSyntheticResumeMigration(dataSource);
    await dataSource.runMigrations();
  } finally {
    await dataSource.destroy();
  }
};

void migrate().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
