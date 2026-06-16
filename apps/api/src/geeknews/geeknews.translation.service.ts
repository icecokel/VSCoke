import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GeekNewsTranslatedContent,
  GeekNewsTranslationRequest,
} from './geeknews.types';

@Injectable()
export class GeekNewsTranslationService {
  private readonly logger = new Logger(GeekNewsTranslationService.name);

  constructor(private readonly configService: ConfigService) {}

  getTargetLanguage(): string {
    return this.configService.get<string>(
      'GEEKNEWS_TRANSLATION_TARGET_LANGUAGE',
      'en',
    );
  }

  async translateContent(
    request: GeekNewsTranslationRequest,
  ): Promise<GeekNewsTranslatedContent | null> {
    const provider = this.configService.get<string>(
      'GEEKNEWS_TRANSLATION_PROVIDER',
      'gemini',
    );

    if (provider === 'none') {
      return null;
    }

    if (provider !== 'gemini') {
      throw new Error(`지원하지 않는 GeekNews 번역 제공자입니다: ${provider}`);
    }

    return this.translateWithGemini(request);
  }

  private async translateWithGemini(
    request: GeekNewsTranslationRequest,
  ): Promise<GeekNewsTranslatedContent | null> {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');

    if (!apiKey) {
      this.logger.warn(
        'GEMINI_API_KEY가 없어 GeekNews 번역을 보류합니다. 원문은 저장됩니다.',
      );
      return null;
    }

    const model = this.configService.get<string>(
      'GEMINI_MODEL',
      'gemini-2.5-flash',
    );
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          generationConfig: {
            responseMimeType: 'application/json',
          },
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: this.buildPrompt(request),
                },
              ],
            },
          ],
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Gemini API 호출 실패: ${response.status}`);
    }

    const payload = (await response.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };
    const responseText =
      payload.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? '')
        .join('')
        .trim() ?? '';

    if (!responseText) {
      throw new Error('Gemini API 응답에 번역 결과가 없습니다.');
    }

    const parsed = this.parseJsonResponse(responseText);

    return {
      provider: 'gemini',
      model,
      targetLanguage: request.targetLanguage,
      translatedTitle: parsed.translatedTitle || request.title,
      translatedContent: parsed.translatedContent || request.content,
    };
  }

  private buildPrompt(request: GeekNewsTranslationRequest): string {
    return [
      `Translate the following GeekNews content from ${request.sourceLanguage} to ${request.targetLanguage}.`,
      'Return only strict JSON with this shape:',
      '{"translatedTitle":"...","translatedContent":"..."}',
      'Do not summarize, omit, or add commentary.',
      'Keep product names, links, code, and technical terms accurate.',
      '',
      `Title: ${request.title}`,
      '',
      `Content: ${request.content}`,
    ].join('\n');
  }

  private parseJsonResponse(text: string): {
    translatedTitle: string;
    translatedContent: string;
  } {
    const direct = this.tryParseJson(text);

    if (direct) {
      return direct;
    }

    const codeBlockMatch = text.match(/```json\s*([\s\S]+?)```/i);
    const codeBlock = codeBlockMatch?.[1]?.trim();
    const fromCodeBlock = codeBlock ? this.tryParseJson(codeBlock) : null;

    if (fromCodeBlock) {
      return fromCodeBlock;
    }

    const objectMatch = text.match(/\{[\s\S]+\}/);
    const fromObject = objectMatch?.[0]
      ? this.tryParseJson(objectMatch[0])
      : null;

    if (fromObject) {
      return fromObject;
    }

    throw new Error('번역 응답에서 JSON을 파싱하지 못했습니다.');
  }

  private tryParseJson(
    text: string,
  ): { translatedTitle: string; translatedContent: string } | null {
    try {
      const parsed = JSON.parse(text) as {
        translatedTitle?: unknown;
        translatedContent?: unknown;
      };

      if (
        typeof parsed.translatedTitle !== 'string' ||
        typeof parsed.translatedContent !== 'string'
      ) {
        return null;
      }

      return {
        translatedTitle: parsed.translatedTitle.trim(),
        translatedContent: parsed.translatedContent.trim(),
      };
    } catch {
      return null;
    }
  }
}
