import Anthropic from '@anthropic-ai/sdk';
import type { Message } from '@anthropic-ai/sdk/resources/messages';
import type { ChatAnswerRequest, ChatProvider } from './chat-provider';
import {
  buildResumeChatPrompt,
  getResumeChatInstructions,
} from './resume-chat-prompt';
import {
  type ResumeRagConfig,
  requireClaudeConfig,
} from '../resume-rag.config';

const parseAnswer = (text: string): string => {
  let result: unknown;
  try {
    result = JSON.parse(text);
  } catch {
    throw new Error('Claude returned an invalid answer');
  }
  if (
    !result ||
    typeof result !== 'object' ||
    !('answer' in result) ||
    Object.keys(result).length !== 1 ||
    typeof result.answer !== 'string' ||
    !result.answer.trim()
  ) {
    throw new Error('Claude returned an invalid answer');
  }
  return result.answer.trim();
};

export class ClaudeProvider implements ChatProvider {
  constructor(
    private readonly config: ResumeRagConfig,
    private readonly fetch?: typeof globalThis.fetch,
  ) {}

  async answer(request: ChatAnswerRequest): Promise<string> {
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
      response = await client.messages.create({
        model: config.chatModel,
        max_tokens: 2400,
        system: `${getResumeChatInstructions(request)} Return a JSON object with an answer field containing only the requested answer or standalone search query.`,
        messages: [{ role: 'user', content: buildResumeChatPrompt(request) }],
        output_config: {
          format: {
            type: 'json_schema',
            schema: {
              type: 'object',
              properties: { answer: { type: 'string' } },
              required: ['answer'],
              additionalProperties: false,
            },
          },
        },
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
    const answer = parseAnswer(
      response.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join(''),
    );
    if (request.task === 'rewrite-query' && answer.length > 1000) {
      throw new Error('Claude returned an invalid search query');
    }
    return answer;
  }
}
