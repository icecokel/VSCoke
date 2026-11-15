import { Logger } from '@nestjs/common';
import { getResumeRagConfig } from './resume-rag.config';
import { ResumeRagModule } from './resume-rag.module';

describe('ResumeRagModule startup', () => {
  let logSpy: jest.SpiedFunction<Logger['log']>;
  beforeEach(() => {
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });
  afterEach(() => jest.restoreAllMocks());

  it('logs the effective non-secret config once on init', () => {
    new ResumeRagModule(
      getResumeRagConfig({ ANTHROPIC_API_KEY: 'private-key' }),
    ).onModuleInit();

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'rag.config',
        retrievalMode: 'hybrid',
        channelSourceTypes: {
          main: ['app_resume', 'career_data'],
          resume: ['career_data'],
        },
      }),
    );
    expect(JSON.stringify(logSpy.mock.calls)).not.toContain('private-key');
  });

  it('warns once when a retired setting is still configured', () => {
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    new ResumeRagModule(
      getResumeRagConfig({ RAG_VECTOR_MIN_SIMILARITY: '0.85' }),
    ).onModuleInit();

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith({
      event: 'rag.config.ignored',
      settings: ['RAG_VECTOR_MIN_SIMILARITY'],
    });
  });

  it('fails startup when a chat channel has nothing to search', () => {
    const module = new ResumeRagModule(
      getResumeRagConfig({ RAG_ALLOWED_SOURCE_TYPES: 'app_resume' }),
    );

    expect(() => module.onModuleInit()).toThrow('RAG_ALLOWED_SOURCE_TYPES');
    expect(logSpy).not.toHaveBeenCalled();
  });
});
