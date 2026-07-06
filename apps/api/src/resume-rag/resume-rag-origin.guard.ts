import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

const PRODUCTION_WEB_ORIGIN = 'https://vscoke.vercel.app';
const LOCAL_WEB_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000'];

const normalizeOrigin = (origin: string): string | undefined => {
  const trimmed = origin.trim();
  if (!trimmed) return undefined;

  try {
    const url = new URL(trimmed);
    const isSupportedProtocol =
      url.protocol === 'https:' || url.protocol === 'http:';
    const isOriginOnly = url.pathname === '/' && !url.search && !url.hash;
    const hasWildcard = url.hostname.includes('*');

    if (!isSupportedProtocol || !isOriginOnly || hasWildcard) {
      return undefined;
    }

    return url.origin;
  } catch {
    return undefined;
  }
};

const splitOrigins = (rawOrigins: string): string[] =>
  Array.from(
    new Set(
      rawOrigins
        .split(',')
        .map(normalizeOrigin)
        .filter((origin): origin is string => Boolean(origin)),
    ),
  );

export const resolveResumeRagPublicChatOrigins = (
  rawOrigins?: string,
  nodeEnv = process.env.NODE_ENV ?? 'production',
): string[] => {
  if (rawOrigins) {
    return splitOrigins(rawOrigins);
  }

  if (nodeEnv === 'production') {
    return [PRODUCTION_WEB_ORIGIN];
  }

  return [PRODUCTION_WEB_ORIGIN, ...LOCAL_WEB_ORIGINS];
};

const getHeaderValue = (value: string | string[] | undefined): string | null =>
  Array.isArray(value) ? (value[0] ?? null) : (value ?? null);

const getOriginFromReferer = (referer: string): string | undefined => {
  try {
    return new URL(referer).origin;
  } catch {
    return undefined;
  }
};

const getRequestOrigin = (request: Request): string | undefined => {
  const origin = getHeaderValue(request.headers.origin);
  if (origin) return normalizeOrigin(origin);

  const referer = getHeaderValue(request.headers.referer);
  return referer ? getOriginFromReferer(referer) : undefined;
};

@Injectable()
export class ResumeRagOriginGuard implements CanActivate {
  constructor(
    @Optional()
    private readonly configService?: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const requestOrigin = getRequestOrigin(request);
    const allowedOrigins = new Set(
      resolveResumeRagPublicChatOrigins(
        this.configService?.get<string>('RAG_PUBLIC_CHAT_ORIGINS') ??
          process.env.RAG_PUBLIC_CHAT_ORIGINS,
        this.configService?.get<string>('NODE_ENV') ?? process.env.NODE_ENV,
      ),
    );

    if (requestOrigin && allowedOrigins.has(requestOrigin)) {
      return true;
    }

    throw new ForbiddenException(
      'Resume RAG chat is allowed only from the official VSCoke web origin.',
    );
  }
}
