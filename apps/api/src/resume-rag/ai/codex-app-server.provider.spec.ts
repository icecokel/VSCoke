import { CodexAppServerProvider } from './codex-app-server.provider';
import type { ResumeRagConfig } from '../resume-rag.config';

type FakeMessageEvent = { data: string };

type SentCodexRequest = {
  method: string;
  params: {
    cwd?: string;
    ephemeral?: boolean;
    approvalPolicy?: string;
    sandbox?: string;
    effort?: string;
    input?: Array<{ text: string }>;
  };
};

type FakeCodexWebSocketBehavior =
  | 'answer'
  | 'connect-error'
  | 'turn-start-error'
  | 'turn-timeout';

class FakeCodexWebSocket {
  static instances: FakeCodexWebSocket[] = [];

  onopen: (() => void) | null = null;
  onmessage: ((event: FakeMessageEvent) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onclose: (() => void) | null = null;
  sent: string[] = [];
  closed = false;

  constructor(
    readonly url: string,
    private readonly behavior: FakeCodexWebSocketBehavior = 'answer',
  ) {
    FakeCodexWebSocket.instances.push(this);
    queueMicrotask(() => {
      if (this.behavior === 'connect-error') {
        this.onerror?.(new Error('asynchronous connection failure'));
        return;
      }

      this.onopen?.();
    });
  }

  send(data: string): void {
    this.sent.push(data);
    const request = JSON.parse(data) as {
      id: number;
      method: string;
      params: Record<string, unknown>;
    };

    if (request.method === 'initialize') {
      this.emit({
        id: request.id,
        result: {
          userAgent: 'Codex Desktop/test',
          codexHome: '/tmp/codex',
          platformFamily: 'unix',
          platformOs: 'linux',
        },
      });
      return;
    }

    if (request.method === 'thread/start') {
      this.emit({
        id: request.id,
        result: { thread: { id: 'thread-1' } },
      });
      return;
    }

    if (request.method === 'turn/start') {
      if (this.behavior === 'turn-start-error') {
        this.emit({
          id: request.id,
          error: { message: 'turn start failed' },
        });
        return;
      }

      this.emit({
        id: request.id,
        result: { turn: { id: 'turn-1' } },
      });
      if (this.behavior === 'turn-timeout') {
        return;
      }

      this.emit({
        method: 'item/agentMessage/delta',
        params: { delta: '근거 기반 ' },
      });
      this.emit({
        method: 'item/agentMessage/delta',
        params: { delta: '답변' },
      });
      this.emit({
        method: 'turn/completed',
        params: { turn: { status: 'completed' }, threadId: 'thread-1' },
      });
    }
  }

  close(): void {
    this.closed = true;
    this.onclose?.();
  }

  private emit(message: unknown): void {
    queueMicrotask(() => this.onmessage?.({ data: JSON.stringify(message) }));
  }
}

const parseSentRequest = (message: string): SentCodexRequest =>
  JSON.parse(message) as SentCodexRequest;

const failureRequest = {
  question: '상민의 강점은?',
  locale: 'ko-KR',
  contexts: [],
};

const expectNoAsyncLeaks = async (run: () => Promise<void>): Promise<void> => {
  const unhandledRejections: unknown[] = [];
  const handleUnhandledRejection = (reason: unknown) => {
    unhandledRejections.push(reason);
  };
  process.on('unhandledRejection', handleUnhandledRejection);
  jest.useFakeTimers({ doNotFake: ['queueMicrotask', 'setImmediate'] });

  try {
    await run();
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(jest.getTimerCount()).toBe(0);
    expect(unhandledRejections).toEqual([]);
  } finally {
    jest.useRealTimers();
    process.off('unhandledRejection', handleUnhandledRejection);
  }
};

const baseConfig: ResumeRagConfig = {
  embeddingProvider: 'openai-compatible',
  embeddingModel: 'embedding-model',
  embeddingDimensions: 3,
  chatProvider: 'codex-app-server',
  codexAppServerUrl: 'ws://127.0.0.1:14561',
  codexCwd: '/srv/vscoke-api',
  codexTimeoutMs: 1000,
  codexReasoningEffort: 'low',
  topK: 5,
  minSimilarity: 0.78,
  chunkSize: 1200,
  chunkOverlap: 120,
  allowedVisibilities: ['public'],
};

describe('CodexAppServerProvider', () => {
  beforeEach(() => {
    FakeCodexWebSocket.instances = [];
  });

  it('answers by starting an ephemeral Codex thread with resume context', async () => {
    const provider = new CodexAppServerProvider(baseConfig, {
      createWebSocket: (url) => new FakeCodexWebSocket(url),
    });

    await expect(
      provider.answer({
        question: '상민의 강점은?',
        locale: 'ko-KR',
        contexts: [
          {
            id: 'chunk-1',
            title: '핵심 요약',
            content: '상민은 운영 자동화와 백오피스 개발 경험이 있다.',
            sourcePath: 'resume.mdx',
            sourceKey: 'resume#summary',
            citationMetadata: { sectionPath: '핵심 요약' },
            similarity: 0.91,
          },
        ],
      }),
    ).resolves.toBe('근거 기반 답변');

    const socket = FakeCodexWebSocket.instances[0];
    expect(socket.url).toBe('ws://127.0.0.1:14561');
    expect(socket.closed).toBe(true);

    const sentMessages = socket.sent.map(parseSentRequest);
    expect(sentMessages.map((message) => message.method)).toEqual([
      'initialize',
      'thread/start',
      'turn/start',
    ]);
    expect(sentMessages[1].params).toEqual(
      expect.objectContaining({
        cwd: '/srv/vscoke-api',
        ephemeral: true,
        approvalPolicy: 'never',
        sandbox: 'read-only',
      }),
    );
    const turnInput = sentMessages[2].params.input?.[0]?.text ?? '';
    expect(sentMessages[2].params.effort).toBe('low');
    expect(turnInput).toContain('[1] 핵심 요약');
    expect(turnInput).toContain(
      '상민은 운영 자동화와 백오피스 개발 경험이 있다.',
    );
    expect(turnInput).toContain('Question: 상민의 강점은?');
  });

  it('clears timers when connection fails asynchronously', async () => {
    await expectNoAsyncLeaks(async () => {
      const provider = new CodexAppServerProvider(baseConfig, {
        createWebSocket: (url) => new FakeCodexWebSocket(url, 'connect-error'),
      });

      await expect(provider.answer(failureRequest)).rejects.toThrow(
        'Codex app-server websocket error',
      );
    });
  });

  it('clears the completion timeout when turn start fails', async () => {
    await expectNoAsyncLeaks(async () => {
      const provider = new CodexAppServerProvider(baseConfig, {
        createWebSocket: (url) =>
          new FakeCodexWebSocket(url, 'turn-start-error'),
      });

      await expect(provider.answer(failureRequest)).rejects.toThrow(
        'turn start failed',
      );
    });
  });

  it('clears timers after the turn completion timeout', async () => {
    await expectNoAsyncLeaks(async () => {
      const provider = new CodexAppServerProvider(baseConfig, {
        createWebSocket: (url) => new FakeCodexWebSocket(url, 'turn-timeout'),
      });
      const answer = provider.answer(failureRequest);
      const rejection = expect(answer).rejects.toThrow(
        'Codex app-server turn timed out',
      );

      await jest.runAllTimersAsync();
      await rejection;
    });
  });
});
