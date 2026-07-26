import { BlogPostDocument, type PostDocumentNode } from "@/components/blog/blog-post-document";

const nodes = [
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "현재 저는 해외 기업 프로젝트를 진행 중이라, 만나이가 기본이라, 헷갈린적이 있었는데요. 이번에 저희 나라가 만나이 계산으로 바뀔수 있다는 정보를 확인하고, 찾고자하는 분들이 있을 듯해서 공유드립니다.",
      },
    ],
  },
  {
    type: "thematicBreak",
  },
  {
    type: "list",
    ordered: true,
    start: 1,
    children: [
      {
        type: "listItem",
        children: [
          {
            type: "paragraph",
            children: [
              {
                type: "strong",
                children: [
                  {
                    type: "text",
                    value: "Javascript 코드",
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        type: "listItem",
        children: [
          {
            type: "paragraph",
            children: [
              {
                type: "strong",
                children: [
                  {
                    type: "text",
                    value: "코드 설명",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    type: "thematicBreak",
  },
  {
    type: "heading",
    depth: 3,
    children: [
      {
        type: "strong",
        children: [
          {
            type: "text",
            value: "1. Javascript 코드",
          },
        ],
      },
    ],
  },
  {
    type: "blockquote",
    children: [
      {
        type: "paragraph",
        children: [
          {
            type: "text",
            value: "아무것도 보이지 않는 분들은 [JS] 버튼을 한번 클릭해주세요.",
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
        value: "See the Pen ",
      },
      {
        type: "link",
        url: "https://codepen.io/icecokel/pen/RwxBEJV",
        title: null,
        children: [
          {
            type: "text",
            value: "Untitled",
          },
        ],
      },
      {
        type: "text",
        value: " by icecokel (",
      },
      {
        type: "link",
        url: "https://codepen.io/icecokel",
        title: null,
        children: [
          {
            type: "text",
            value: "@icecokel",
          },
        ],
      },
      {
        type: "text",
        value: ") on ",
      },
      {
        type: "link",
        url: "https://codepen.io",
        title: null,
        children: [
          {
            type: "text",
            value: "CodePen",
          },
        ],
      },
      {
        type: "text",
        value: ".",
      },
    ],
  },
  {
    type: "thematicBreak",
  },
  {
    type: "heading",
    depth: 3,
    children: [
      {
        type: "strong",
        children: [
          {
            type: "text",
            value: "2. 코드 설명",
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
        value: "처음에는 기존 한국 나이처럼 태어난 년도 기준으로 나이를 계산합니다.",
      },
    ],
  },
  {
    type: "code",
    language: null,
    value: "age = today.getFullYear() - birthDay.getFullYear();",
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "처음에 선언했던 birthDay 데이트 객체에서 년도만 오늘 기준으로 바꿔주고, getTime() 함수를 사용하여, 오늘과 크기 비교를 진행합니다. ",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "생일이 지나지 않으면 한 살을 빼주는 개념입니다.",
      },
    ],
  },
  {
    type: "code",
    language: null,
    value: "  if (today.getTime() < birthDay.getTime()) {\n    age--;\n  }",
  },
  {
    type: "thematicBreak",
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "저 처럼 필요해서 생각해보신분들도 있겠지만, 만나이가 익숙하지 않은 한국 개발자한테는 잘 생각해볼일이 없는 로직이라고 생각합니다. 최대한 간결한 코드로 작성해보려고 노력했고, 로직에대해서 설명을 드렸지만, 설명없이 이해가 갈수 있는 코드 라고 생각합니다. 적절한 곧에 사용 부탁드립니다.",
      },
    ],
  },
] satisfies PostDocumentNode[];

const DevJavascriptAgeCalculationPost = () => {
  return <BlogPostDocument nodes={nodes} />;
};

export default DevJavascriptAgeCalculationPost;
