import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { DEFAULT_CORS_ORIGINS } from '../constants/cors.constant';

const normalizeOrigin = (origin: string) => origin.trim().replace(/\/$/, '');

export const resolveCorsOrigins = (rawOrigins?: string): string[] =>
  Array.from(
    new Set(
      [...DEFAULT_CORS_ORIGINS, ...(rawOrigins?.split(',') ?? [])]
        .map(normalizeOrigin)
        .filter(Boolean),
    ),
  );

export const getCorsOptions = (rawOrigins?: string): CorsOptions => ({
  origin: resolveCorsOrigins(rawOrigins),
  credentials: true,
});
