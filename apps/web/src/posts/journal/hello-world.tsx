import {
  PostBlockquote,
  PostCodeBlock,
  PostHeading1,
  PostHeading2,
  PostListItem,
  PostParagraph,
  PostStrong,
  PostUnorderedList,
} from "@/components/blog/blog-post-elements";

const greetingCode = `const greeting = (name: string): string => {
  return \`Hello, \${name}!\`;
};

console.log(greeting("World"));`;

const HelloWorldPost = () => {
  return (
    <>
      <PostHeading1>블로그를 시작합니다</PostHeading1>

      <PostParagraph>
        안녕하세요! 이 블로그는 <PostStrong>Next.js</PostStrong>와 <PostStrong>MDX</PostStrong>를
        활용하여 만들었습니다.
      </PostParagraph>

      <PostHeading2>기술 스택</PostHeading2>

      <PostParagraph>이 블로그는 다음 기술들을 사용합니다:</PostParagraph>

      <PostUnorderedList>
        <PostListItem>
          <PostStrong>Next.js 15</PostStrong> - React 프레임워크
        </PostListItem>
        <PostListItem>
          <PostStrong>MDX</PostStrong> - Markdown + JSX
        </PostListItem>
        <PostListItem>
          <PostStrong>Tailwind CSS</PostStrong> - 스타일링
        </PostListItem>
      </PostUnorderedList>

      <PostHeading2>코드 예시</PostHeading2>

      <PostParagraph>아래는 TypeScript 코드 예시입니다:</PostParagraph>

      <PostCodeBlock code={greetingCode} language="typescript" />

      <PostHeading2>마무리</PostHeading2>

      <PostParagraph>
        앞으로 개발 관련 글들을 작성할 예정입니다. 많은 관심 부탁드립니다!
      </PostParagraph>

      <PostBlockquote>
        좋은 개발자는 코드를 작성하는 것만큼 글로 소통하는 것도 중요합니다.
      </PostBlockquote>
    </>
  );
};

export default HelloWorldPost;
