import Anthropic from '@anthropic-ai/sdk';
import type { Message } from '@anthropic-ai/sdk/resources/messages';
import type {
  ChatAnswer,
  ChatAnswerRequest,
  ChatPromptRequest,
  ChatProvider,
  ChatRewriteRequest,
} from './chat-provider';
import {
  buildResumeChatPrompt,
  getResumeChatInstructions,
} from './resume-chat-prompt';
import {
  type ResumeRagConfig,
  requireClaudeConfig,
} from '../resume-rag.config';

const INVALID_ANSWER = 'Claude returned an invalid answer';

const parseJsonObject = (text: string): Record<string, unknown> => {
  let result: unknown;
  try {
    result = JSON.parse(text);
  } catch {
    throw new Error(INVALID_ANSWER);
  }
  if (!result || typeof result !== 'object' || Array.isArray(result))
    throw new Error(INVALID_ANSWER);
  return result as Record<string, unknown>;
};

const readAnswerText = (result: Record<string, unknown>): string => {
  if (typeof result.answer !== 'string' || !result.answer.trim())
    throw new Error(INVALID_ANSWER);
  return result.answer.trim();
};

const parseRewrite = (text: string): string => {
  const result = parseJsonObject(text);
  if (Object.keys(result).length !== 1) throw new Error(INVALID_ANSWER);
  return readAnswerText(result);
};

// 답변 문장은 반드시 있어야 하지만, 판단 필드가 빠지거나 형식이 틀리면 근거 없는 답변으로
// 낮춰 처리한다. 스키마 출력이라 드문 경우이며 답변을 버리는 것보다 근거 표시만 거두는 편이 안전하다.
const parseGroundedAnswer = (text: string): ChatAnswer => {
  const result = parseJsonObject(text);
  const answer = readAnswerText(result);
  const usedReferences = Array.isArray(result.usedReferences)
    ? result.usedReferences.filter(
        (reference): reference is number =>
          typeof reference === 'number' && Number.isSafeInteger(reference),
      )
    : [];
  return {
    answer,
    answerable: result.answerable === true,
    usedReferences,
  };
};

const rewriteSchema = {
  type: 'object',
  properties: { answer: { type: 'string' } },
  required: ['answer'],
  additionalProperties: false,
};

const answerSchema = {
  type: 'object',
  properties: {
    answer: { type: 'string' },
    answerable: { type: 'boolean' },
    usedReferences: { type: 'array', items: { type: 'integer' } },
  },
  required: ['answer', 'answerable', 'usedReferences'],
  additionalProperties: false,
};

export class ClaudeProvider implements ChatProvider {
  constructor(
    private readonly config: ResumeRagConfig,
    private readonly fetch?: typeof globalThis.fetch,
  ) {}

  async answer(request: ChatAnswerRequest): Promise<ChatAnswer> {
    return parseGroundedAnswer(
      await this.complete(
        request,
        'Return a JSON object with answer (the requested answer text), answerable, and usedReferences.',
        answerSchema,
      ),
    );
  }

  async rewriteQuery(request: ChatRewriteRequest): Promise<string> {
    const query = parseRewrite(
      await this.complete(
        { ...request, task: 'rewrite-query', contexts: [] },
        'Return a JSON object with an answer field containing only the standalone search query.',
        rewriteSchema,
      ),
    );
    if (query.length > 1000) {
      throw new Error('Claude returned an invalid search query');
    }
    return query;
  }

  private async complete(
    request: ChatPromptRequest,
    formatInstruction: string,
    schema: Record<string, unknown>,
  ): Promise<string> {
    const config = requireClaudeConfig(this.config);
    const client = new Anthropic({
      apiKey: config.anthropicApiKey,
      baseURL: 'https://api.anthropic.com',
      timeout: config.chatTimeoutMs,
      maxRetries: 0,
      logLevel: 'off',
      fetch: this.fetch,
    });

    let response: Message;
    try {
      // Citations는 JSON schema 출력과 함께 쓸 수 없어 사용 근거 번호를 schema 필드로 받는다.
      response = await client.messages.create({
        model: config.chatModel,
        max_tokens: 2400,
        system: `${getResumeChatInstructions(request)} ${formatInstruction}`,
        messages: [{ role: 'user', content: buildResumeChatPrompt(request) }],
        output_config: { format: { type: 'json_schema', schema } },
      });
    } catch (error) {
      // SDK 오류 원문에는 공급자 응답·자격증명이 포함될 수 있다.
      if (error instanceof Anthropic.APIConnectionTimeoutError) {
        throw new Error('Claude request timed out');
      }
      throw new Error('Claude request failed');
    }

    if (response.stop_reason !== 'end_turn') {
      throw new Error('Claude did not complete the answer');
    }
    return response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('');
  }
}
