// MDX 상세 본문의 최상위 JSX 블록(줄 맨 앞에서 시작하는 `<Tag ...>`~`</Tag>`, `<Tag ... />`)을
// 검색·임베딩용 평문으로 바꾼다. 태그·className은 의미가 없고 영어 토큰이 키워드 점수를 왜곡하므로 버리고,
// 이미지 대체 텍스트와 캡션 같은 본문 텍스트만 남긴다. 문장 안의 `Promise<void>` 같은 표기는 건드리지 않는다.
const JSX_BLOCK =
  /^<([A-Za-z][\w.]*)\b[^\n]*(?:\n(?!<\/\1>)[^\n]*)*?\n?<\/\1>[ \t]*$|^<([A-Za-z][\w.]*)\b[^>]*?\/>[ \t]*$/gm;
const ALT_ATTRIBUTE = /\balt=(?:"([^"]*)"|'([^']*)')/g;
const TAG = /<\/?[A-Za-z][\w.]*(?:\s[^<>]*?)?\/?>/g;

const jsxBlockToText = (block: string): string => {
  const altTexts = [...block.matchAll(ALT_ATTRIBUTE)].map(
    (match) => match[1] ?? match[2] ?? '',
  );
  let altIndex = 0;
  // 이미지 태그 자리에 대체 텍스트를 넣어 캡션과의 순서를 유지한다.
  const withAlt = block.replace(/<img\b[^>]*?\/?>/g, () => {
    const alt = altTexts[altIndex] ?? '';
    altIndex += 1;
    return `\n${alt}\n`;
  });
  return withAlt
    .replace(TAG, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');
};

// 코드 펜스(```, ~~~) 안의 예시 코드는 본문 내용이므로 그대로 둔다.
const CODE_FENCE = /^(```|~~~)[^\n]*\n[\s\S]*?^\1[ \t]*$/gm;

export const toResumeSourceText = (bodyText: string): string => {
  const text = bodyText.replace(/\r\n/g, '\n');
  let result = '';
  let cursor = 0;
  for (const fence of text.matchAll(CODE_FENCE)) {
    result += text
      .slice(cursor, fence.index)
      .replace(JSX_BLOCK, jsxBlockToText);
    result += fence[0];
    cursor = fence.index + fence[0].length;
  }
  return result + text.slice(cursor).replace(JSX_BLOCK, jsxBlockToText);
};
