import { getCorsOptions, resolveCorsOrigins } from './cors.util';

describe('cors util', () => {
  it('기본 origin은 production 웹과 로컬 개발 웹만 포함한다', () => {
    expect(resolveCorsOrigins()).toEqual([
      'https://vscoke.vercel.app',
      'http://localhost:3000',
    ]);
  });

  it('Vercel preview origin은 CORS_ORIGINS에 명시한 경우에만 허용한다', () => {
    expect(resolveCorsOrigins()).not.toContain(
      'https://vscoke-git-preview-icecokel.vercel.app',
    );

    expect(
      resolveCorsOrigins('https://vscoke-git-preview-icecokel.vercel.app/'),
    ).toContain('https://vscoke-git-preview-icecokel.vercel.app');
  });

  it('origin이 아닌 값이나 wildcard는 허용 목록에서 제외한다', () => {
    expect(
      resolveCorsOrigins(
        [
          '*',
          'https://*.vercel.app',
          'javascript:alert(1)',
          'https://preview.example.com/path',
          'https://safe-preview.example.com',
        ].join(','),
      ),
    ).toEqual([
      'https://vscoke.vercel.app',
      'http://localhost:3000',
      'https://safe-preview.example.com',
    ]);
  });

  it('Nest CORS 옵션은 검증된 origin 배열과 credentials를 사용한다', () => {
    expect(getCorsOptions('https://preview.example.com')).toEqual({
      origin: [
        'https://vscoke.vercel.app',
        'http://localhost:3000',
        'https://preview.example.com',
      ],
      credentials: true,
    });
  });
});
