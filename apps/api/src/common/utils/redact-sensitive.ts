const REDACTED = '[REDACTED]';

const SENSITIVE_KEYS = new Set([
  'authorization',
  'cookie',
  'setcookie',
  'accesstoken',
  'refreshtoken',
  'idtoken',
  'token',
  'apikey',
  'password',
  'secret',
  'clientsecret',
  'sessionid',
  'question',
  'prompt',
  'email',
  'phone',
  'contact',
  'body',
  'query',
]);

const isSensitiveKey = (key: string): boolean =>
  SENSITIVE_KEYS.has(key.toLowerCase().replace(/[-_\s]/g, ''));

const redactSensitiveString = (value: string): string =>
  value
    .replace(/([a-z][a-z\d+.-]*:\/\/)[^\s/@]+@/gi, `$1${REDACTED}@`)
    .replace(
      /((?:[a-z][a-z\d+.-]*:\/\/|\/)[^\s?#"'<>`]*?)[?#][^\s"'<>`]*/gi,
      '$1',
    )
    .replace(/\b(?:Bearer|Basic)\s+[A-Za-z0-9._~+/-]+=*/gi, REDACTED)
    .replace(/\b(?:Cookie|Set-Cookie):[^\r\n]+/gi, `Cookie: ${REDACTED}`)
    .replace(
      /(["']?(?:access[_-]?token|refresh[_-]?token|id[_-]?token|token|api[_-]?key|password|secret|client[_-]?secret|authorization|cookie|set-cookie)["']?\s*[:=]\s*)(?:\[REDACTED\]|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[^\s,;\]}]+)/gi,
      `$1${REDACTED}`,
    )
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, REDACTED)
    .replace(
      /\b(?:\+?\d{1,3}[-.\s]?)?(?:010|011|016|017|018|019)[-.\s]?\d{3,4}[-.\s]?\d{4}\b/g,
      REDACTED,
    );

export const redactSensitiveValue = (value: unknown): unknown => {
  const seen = new WeakSet<object>();
  const redact = (item: unknown): unknown => {
    if (typeof item === 'string') return redactSensitiveString(item);
    if (!item || typeof item !== 'object') return item;
    if (seen.has(item)) return '[Circular]';
    seen.add(item);
    const result = Array.isArray(item)
      ? item.map(redact)
      : Object.fromEntries(
          Object.entries(item).map(([key, nested]) => [
            key,
            isSensitiveKey(key) ? REDACTED : redact(nested),
          ]),
        );
    seen.delete(item);
    return result;
  };
  return redact(value);
};
