import { redactSensitiveValue } from './redact-sensitive';

describe('redactSensitiveValue', () => {
  it('redacts resume rag questions and auth-like fields', () => {
    expect(
      redactSensitiveValue({
        question: '내 이력 비공개 질문',
        authorization: 'Bearer token',
        nested: {
          email: 'person@example.com',
          phone: '010-1234-5678',
          keep: 'safe',
        },
      }),
    ).toEqual({
      question: '[REDACTED]',
      authorization: '[REDACTED]',
      nested: {
        email: '[REDACTED]',
        phone: '[REDACTED]',
        keep: 'safe',
      },
    });
  });

  it('서로 다른 인증 키 표기와 쿠키, 요청 본문을 가린다', () => {
    expect(
      redactSensitiveValue({
        access_token: 'access-secret',
        'API-Key': 'api-secret',
        'Set-Cookie': 'session=secret',
        client_secret: 'client-secret',
        body: { text: 'private text' },
        query: { search: 'private search' },
        count: 3,
      }),
    ).toEqual({
      access_token: '[REDACTED]',
      'API-Key': '[REDACTED]',
      'Set-Cookie': '[REDACTED]',
      client_secret: '[REDACTED]',
      body: '[REDACTED]',
      query: '[REDACTED]',
      count: 3,
    });
  });

  it('오류 문자열의 URL 자격 증명과 쿼리, Basic 인증과 토큰을 가린다', () => {
    const result = String(
      redactSensitiveValue(
        'Failed https://user:db-secret@example.test/path?question=private-query#fragment ' +
          '/api/check?token=relative-secret ' +
          'Basic c2VjcmV0 Bearer bearer-secret password="quoted secret" ' +
          'access_token=access-secret email=person@example.com',
      ),
    );

    expect(result).toContain('example.test/path');
    expect(result).toContain('/api/check');
    expect(result).not.toMatch(
      /db-secret|private-query|fragment|relative-secret|c2VjcmV0|bearer-secret|quoted secret|access-secret|person@example.com/,
    );
  });

  it('순환 오류 객체를 안전하게 처리하면서 반복 참조의 값은 보존한다', () => {
    const shared = { keep: 'safe' };
    const value: Record<string, unknown> = { first: shared, second: shared };
    value.circular = value;

    expect(redactSensitiveValue(value)).toEqual({
      first: { keep: 'safe' },
      second: { keep: 'safe' },
      circular: '[Circular]',
    });
  });
});
