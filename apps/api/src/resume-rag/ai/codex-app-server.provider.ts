import type { ChatAnswerRequest, ChatProvider } from './chat-provider';
import {
  type RequiredCodexAppServerConfig,
  type ResumeRagConfig,
  requireCodexAppServerConfig,
} from '../resume-rag.config';

type WebSocketLike = {
  onopen: (() => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onclose: (() => void) | null;
  send(data: string): void;
  close(): void;
};

type CodexAppServerProviderOptions = {
  createWebSocket?: (url: string) => WebSocketLike;
};

type JsonRpcMessage = {
  id?: number;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: {
    code?: number;
    message?: string;
  };
};

type PendingRequest = {
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
};

type ThreadStartResult = {
  thread?: {
    id?: unknown;
  };
};

const CLIENT_NAME = 'vscoke-resume-rag';
const CLIENT_VERSION = '0.0.1';

const getGlobalWebSocketFactory = (): ((url: string) => WebSocketLike) => {
  if (!globalThis.WebSocket) {
    throw new Error('Global WebSocket is not available in this Node runtime');
  }

  return (url: string) => new globalThis.WebSocket(url) as WebSocketLike;
};

const parseMessageData = (data: unknown): JsonRpcMessage => {
  const text =
    typeof data === 'string'
      ? data
      : data instanceof ArrayBuffer
        ? Buffer.from(data).toString('utf8')
        : ArrayBuffer.isView(data)
          ? Buffer.from(data.buffer).toString('utf8')
          : String(data);

  return JSON.parse(text) as JsonRpcMessage;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object';

const getThreadId = (result: unknown): string => {
  const threadStartResult = result as ThreadStartResult;
  const threadId = threadStartResult.thread?.id;
  if (typeof threadId !== 'string' || !threadId) {
    throw new Error('Codex app-server did not return a thread id');
  }

  return threadId;
};

const getNotificationDelta = (message: JsonRpcMessage): string | null => {
  if (message.method !== 'item/agentMessage/delta') return null;
  if (!isRecord(message.params)) return null;
  return typeof message.params.delta === 'string' ? message.params.delta : null;
};

const getCompletedAgentMessageText = (
  message: JsonRpcMessage,
): string | null => {
  if (message.method !== 'item/completed') return null;
  if (!isRecord(message.params) || !isRecord(message.params.item)) return null;
  if (message.params.item.type !== 'agentMessage') return null;
  return typeof message.params.item.text === 'string'
    ? message.params.item.text
    : null;
};

const isTurnCompleted = (message: JsonRpcMessage): boolean =>
  message.method === 'turn/completed';

const formatContext = (request: ChatAnswerRequest): string =>
  request.contexts
    .map((context, index) =>
      [
        `[${index + 1}] ${context.title}`,
        `Source key: ${context.sourceKey}`,
        `Source path: ${context.sourcePath}`,
        `Similarity: ${context.similarity.toFixed(4)}`,
        'Content:',
        context.content,
      ].join('\n'),
    )
    .join('\n\n');

const buildPrompt = (request: ChatAnswerRequest): string =>
  [
    `Locale: ${request.locale}`,
    `Question: ${request.question}`,
    '',
    'Retrieved resume context:',
    formatContext(request),
    '',
    'Answer requirements:',
    '- Answer only from the retrieved resume context above.',
    '- If the context is insufficient, say that the available evidence is insufficient.',
    '- Keep the answer concise and natural.',
    '- Do not mention internal implementation details, vector search, or model/provider settings.',
  ].join('\n');

class CodexJsonRpcClient {
  private nextId = 1;
  private readonly pending = new Map<number, PendingRequest>();
  private socket: WebSocketLike | null = null;
  private notificationHandler: ((message: JsonRpcMessage) => void) | null =
    null;

  constructor(
    private readonly url: string,
    private readonly timeoutMs: number,
    private readonly createWebSocket: (url: string) => WebSocketLike,
  ) {}

  setNotificationHandler(handler: (message: JsonRpcMessage) => void): void {
    this.notificationHandler = handler;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = this.createWebSocket(this.url);
      this.socket = socket;

      const timeout = setTimeout(() => {
        reject(new Error('Codex app-server connection timed out'));
      }, this.timeoutMs);

      socket.onopen = () => {
        clearTimeout(timeout);
        resolve();
      };
      socket.onmessage = (event) => this.handleMessage(event.data);
      socket.onerror = (event) => {
        clearTimeout(timeout);
        const errorText =
          event instanceof Error ? event.message : String(event);
        this.rejectAll(
          new Error(`Codex app-server websocket error: ${errorText}`),
        );
        reject(new Error('Codex app-server websocket error'));
      };
      socket.onclose = () => {
        clearTimeout(timeout);
        this.rejectAll(new Error('Codex app-server websocket closed'));
      };
    });
  }

  request(method: string, params: unknown): Promise<unknown> {
    const socket = this.socket;
    if (!socket) {
      return Promise.reject(
        new Error('Codex app-server websocket is not open'),
      );
    }

    const id = this.nextId;
    this.nextId += 1;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Codex app-server request timed out: ${method}`));
      }, this.timeoutMs);

      this.pending.set(id, { resolve, reject, timeout });
      socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close(): void {
    const socket = this.socket;
    this.socket = null;
    this.pending.forEach((pending) => clearTimeout(pending.timeout));
    this.pending.clear();
    socket?.close();
  }

  private handleMessage(data: unknown): void {
    const message = parseMessageData(data);
    if (typeof message.id === 'number') {
      const pending = this.pending.get(message.id);
      if (!pending) return;

      this.pending.delete(message.id);
      clearTimeout(pending.timeout);

      if (message.error) {
        pending.reject(
          new Error(
            message.error.message ??
              `Codex app-server request failed: ${message.error.code}`,
          ),
        );
        return;
      }

      pending.resolve(message.result);
      return;
    }

    this.notificationHandler?.(message);
  }

  private rejectAll(error: Error): void {
    this.pending.forEach((pending) => {
      clearTimeout(pending.timeout);
      pending.reject(error);
    });
    this.pending.clear();
  }
}

export class CodexAppServerProvider implements ChatProvider {
  private readonly createWebSocket: (url: string) => WebSocketLike;

  constructor(
    private readonly config: ResumeRagConfig,
    options: CodexAppServerProviderOptions = {},
  ) {
    this.createWebSocket =
      options.createWebSocket ?? getGlobalWebSocketFactory();
  }

  async answer(request: ChatAnswerRequest): Promise<string> {
    const codexConfig = requireCodexAppServerConfig(this.config);
    const client = new CodexJsonRpcClient(
      codexConfig.codexAppServerUrl,
      codexConfig.codexTimeoutMs,
      this.createWebSocket,
    );

    let answerText = '';
    let completedAgentText = '';

    const completed = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Codex app-server turn timed out'));
      }, codexConfig.codexTimeoutMs);

      client.setNotificationHandler((message) => {
        const delta = getNotificationDelta(message);
        if (delta) {
          answerText += delta;
        }

        const completedText = getCompletedAgentMessageText(message);
        if (completedText) {
          completedAgentText = completedText;
        }

        if (isTurnCompleted(message)) {
          clearTimeout(timeout);
          resolve();
        }

        if (message.method === 'error') {
          clearTimeout(timeout);
          reject(new Error('Codex app-server emitted an error notification'));
        }
      });
    });

    try {
      await client.connect();
      await client.request('initialize', {
        clientInfo: {
          name: CLIENT_NAME,
          version: CLIENT_VERSION,
        },
        capabilities: {
          experimentalApi: true,
        },
      });

      const threadId = getThreadId(
        await client.request(
          'thread/start',
          this.buildThreadStart(codexConfig),
        ),
      );

      await client.request('turn/start', {
        threadId,
        input: [{ type: 'text', text: buildPrompt(request) }],
        cwd: codexConfig.codexCwd ?? process.cwd(),
        approvalPolicy: 'never',
        sandboxPolicy: { type: 'readOnly', networkAccess: false },
        environments: [],
        model: codexConfig.chatModel ?? null,
      });

      await completed;

      const finalAnswer = (answerText || completedAgentText).trim();
      if (!finalAnswer) {
        throw new Error('Codex app-server returned an empty answer');
      }

      return finalAnswer;
    } finally {
      client.close();
    }
  }

  private buildThreadStart(config: RequiredCodexAppServerConfig) {
    return {
      cwd: config.codexCwd ?? process.cwd(),
      ephemeral: true,
      approvalPolicy: 'never',
      sandbox: 'read-only',
      model: config.chatModel ?? null,
      modelProvider: config.codexModelProvider ?? null,
      baseInstructions: [
        'You are a strict resume RAG answer generator.',
        'Use only the resume context supplied by the current user turn.',
        'Do not use tools, filesystem, network, memory, or prior conversation.',
        'Return only the final answer text.',
      ].join(' '),
      developerInstructions:
        'Answer resume questions only from supplied retrieved context. If the context is insufficient, say so plainly.',
      environments: [],
      dynamicTools: [],
    };
  }
}
