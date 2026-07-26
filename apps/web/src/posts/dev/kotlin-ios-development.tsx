import { BlogPostDocument, type PostDocumentNode } from "@/components/blog/blog-post-document";

const nodes = [
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "Kotlin은 그냥 안드로이드 개발하는 언어 정도, Swift랑 비슷하게 생긴 언어 정도로만 생각했는데,",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "link",
        url: "https://kotlinlang.org/docs/reference/native-overview.html",
        title: null,
        children: [
          {
            type: "text",
            value: "kotlinlang.org/docs/reference/native-overview.html",
          },
        ],
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: " [Kotlin/Native - Kotlin Programming Language",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "kotlinlang.org](https://kotlinlang.org/docs/reference/native-overview.html)",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "를 보니 ... 다른 부분에서 도 많이 쓰고 있는 듯하다. ",
      },
      {
        type: "link",
        url: "https://kotlinlang.org/docs/reference/native-overview.html",
        title: null,
        children: [
          {
            type: "text",
            value: "kotlinlang.org/docs/reference/native-overview.html",
          },
        ],
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "이전에 영상 강의에서 일부 백엔드 모듈을 Kotlin으로 제작하고 있다 정도는 들었봤었는데, 굉장히 흥미로운 사항을 찾은 듯 하다.",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "이전에 간단하게 Kotlin으로 Android App 작성했던 코드를 찾아서 한번 리프레쉬 해야할 듯 하다.",
      },
    ],
  },
] satisfies PostDocumentNode[];

const DevKotlinIosDevelopmentPost = () => {
  return <BlogPostDocument nodes={nodes} />;
};

export default DevKotlinIosDevelopmentPost;
