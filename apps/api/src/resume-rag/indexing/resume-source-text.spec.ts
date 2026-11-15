import { toResumeSourceText } from './resume-source-text';

describe('toResumeSourceText', () => {
  it('최상위 JSX 블록의 태그·className을 지우고 대체 텍스트와 캡션을 남긴다', () => {
    const mdx = [
      '## 화면 전략',
      '',
      '판매자는 데스크톱 중심으로 구성했습니다.',
      '',
      '<figure className="my-6">',
      '  <div className="grid gap-4 md:grid-cols-2">',
      '    <img',
      '      src="/images/before.png"',
      '      alt="전환 전 PC 레이아웃"',
      '      className="h-auto w-full"',
      '    />',
      '    <div className="px-3 py-2 text-sm">',
      '      전환 전 · 2024-02-05',
      '    </div>',
      '  </div>',
      '  <figcaption className="mt-3">',
      '    레이아웃 전환 비교입니다.',
      '  </figcaption>',
      '</figure>',
      '',
      '고객 화면은 다국어를 지원했습니다.',
    ].join('\n');

    const text = toResumeSourceText(mdx);

    expect(text).toBe(
      [
        '## 화면 전략',
        '',
        '판매자는 데스크톱 중심으로 구성했습니다.',
        '',
        '전환 전 PC 레이아웃',
        '전환 전 · 2024-02-05',
        '레이아웃 전환 비교입니다.',
        '',
        '고객 화면은 다국어를 지원했습니다.',
      ].join('\n'),
    );
    expect(text).not.toMatch(/className|<\/?[a-z]/);
  });

  it('최상위 자기 종료 컴포넌트를 지운다', () => {
    expect(
      toResumeSourceText('앞 문단\n\n<Chart data={rows} />\n\n뒤 문단'),
    ).toBe('앞 문단\n\n\n\n뒤 문단');
  });

  it('문장 안의 꺾쇠 표기와 인라인 태그, 코드 펜스 안의 JSX는 그대로 둔다', () => {
    const body = [
      '`Promise.all`로 묶고 `Promise<void>`를 반환했습니다.',
      'a < b 이고 b > c 인 경우를 처리했습니다.',
      '- 목록 <strong>강조</strong> 문장',
      '```tsx',
      '<Component prop="x" />',
      '```',
    ].join('\n');

    const text = toResumeSourceText(body);
    expect(text).toBe(body);
  });

  it('JSX가 없는 본문은 바꾸지 않는다', () => {
    const body = '## 제목\n\n본문 문단입니다.\n\n- 항목';
    expect(toResumeSourceText(body)).toBe(body);
  });
});
