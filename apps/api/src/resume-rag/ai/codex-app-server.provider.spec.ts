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
    input?: Array<{ text: string }>;
  };
};

class FakeCodexWebSocket {
  static instances: FakeCodexWebSocket[] = [];

  onopen: (() => void) | null = null;
  onmessage: ((event: FakeMessageEvent) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onclose: (() => void) | null = null;
  sent: string[] = [];
  closed = false;

  constructor(readonly url: string) {
    FakeCodexWebSocket.instances.push(this);
    queueMicrotask(() => this.onopen?.());
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
      this.emit({
        id: request.id,
        result: { turn: { id: 'turn-1' } },
      });
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

const baseConfig: ResumeRagConfig = {
  embeddingProvider: 'openai-compatible',
  embeddingModel: 'embedding-model',
  embeddingDimensions: 3,
  chatProvider: 'codex-app-server',
  codexAppServerUrl: 'ws://127.0.0.1:14561',
  codexCwd: '/srv/vscoke-api',
  codexTimeoutMs: 1000,
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
    expect(turnInput).toContain('[1] 핵심 요약');
    expect(turnInput).toContain(
      '상민은 운영 자동화와 백오피스 개발 경험이 있다.',
    );
    expect(turnInput).toContain('Question: 상민의 강점은?');
  });
});
