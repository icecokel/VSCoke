import { BlogPostDocument, type PostDocumentNode } from "@/components/blog/blog-post-document";

const nodes = [
  {
    type: "heading",
    depth: 1,
    children: [
      {
        type: "text",
        value: "Git 브랜치 전략: 협업을 위한 필수 명령어",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "Git의 진가는 **브랜치(Branch)**를 사용할 때 발휘됩니다.\n독립적인 작업 공간을 만들고, 안전하게 코드를 실험하고, 동료와 협업하는 방법을 알아봅시다.",
      },
    ],
  },
  {
    type: "heading",
    depth: 2,
    children: [
      {
        type: "text",
        value: "1. 브랜치 생성과 조회: ",
      },
      {
        type: "inlineCode",
        value: "git branch",
      },
    ],
  },
  {
    type: "heading",
    depth: 3,
    children: [
      {
        type: "text",
        value: "현재 브랜치 확인",
      },
    ],
  },
  {
    type: "code",
    language: "bash",
    value: "git branch",
  },
  {
    type: "heading",
    depth: 3,
    children: [
      {
        type: "text",
        value: "새로운 브랜치 생성",
      },
    ],
  },
  {
    type: "code",
    language: "bash",
    value: "git branch feature/login",
  },
  {
    type: "blockquote",
    children: [
      {
        type: "paragraph",
        children: [
          {
            type: "strong",
            children: [
              {
                type: "text",
                value: "Naming Rule:",
              },
            ],
          },
          {
            type: "text",
            value: " 보통 ",
          },
          {
            type: "inlineCode",
            value: "feature/기능명",
          },
          {
            type: "text",
            value: ", ",
          },
          {
            type: "inlineCode",
            value: "fix/버그명",
          },
          {
            type: "text",
            value: "과 같은 규칙을 사용합니다.",
          },
        ],
      },
    ],
  },
  {
    type: "heading",
    depth: 2,
    children: [
      {
        type: "text",
        value: "2. 브랜치 이동: ",
      },
      {
        type: "inlineCode",
        value: "git switch",
      },
      {
        type: "text",
        value: " (또는 ",
      },
      {
        type: "inlineCode",
        value: "git checkout",
      },
      {
        type: "text",
        value: ")",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "새로 만든 작업 공간(브랜치)으로 이동합니다.\n",
      },
      {
        type: "inlineCode",
        value: "checkout",
      },
      {
        type: "text",
        value: "은 옛날 방식이고, 최근에는 명확한 의미의 ",
      },
      {
        type: "inlineCode",
        value: "switch",
      },
      {
        type: "text",
        value: "를 권장합니다.",
      },
    ],
  },
  {
    type: "code",
    language: "bash",
    value: "# 최신 방식\ngit switch feature/login\n\n# 구 방식\ngit checkout feature/login",
  },
  {
    type: "heading",
    depth: 2,
    children: [
      {
        type: "text",
        value: "3. 브랜치 병합: ",
      },
      {
        type: "inlineCode",
        value: "git merge",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "작업이 끝난 브랜치를 메인 브랜치와 합칠 때 사용합니다.\n보통 ",
      },
      {
        type: "inlineCode",
        value: "main",
      },
      {
        type: "text",
        value: " 브랜치로 이동한 후, 작업한 브랜치를 끌어와서 합칩니다.",
      },
    ],
  },
  {
    type: "code",
    language: "bash",
    value:
      "# 1. 메인 브랜치로 이동\ngit switch main\n\n# 2. 작업한 브랜치 내용 합치기\ngit merge feature/login",
  },
  {
    type: "blockquote",
    children: [
      {
        type: "paragraph",
        children: [
          {
            type: "strong",
            children: [
              {
                type: "text",
                value: "Note:",
              },
            ],
          },
          {
            type: "text",
            value:
              " 병합 과정에서 충돌(Conflict)이 발생할 수 있습니다. 당황하지 말고 코드를 수정한 후 다시 add, commit 하면 됩니다.",
          },
        ],
      },
    ],
  },
  {
    type: "heading",
    depth: 2,
    children: [
      {
        type: "text",
        value: "4. 히스토리 확인: ",
      },
      {
        type: "inlineCode",
        value: "git log",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "프로젝트의 변경 기록을 그래프 형태로 확인하면 흐름을 이해하기 쉽습니다.",
      },
    ],
  },
  {
    type: "code",
    language: "bash",
    value: "# 한 줄로 그래프와 함께 보기\ngit log --oneline --graph --all --decorate",
  },
  {
    type: "heading",
    depth: 2,
    children: [
      {
        type: "text",
        value: "협업 시나리오 요약",
      },
    ],
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
                type: "inlineCode",
                value: "git pull origin main",
              },
              {
                type: "text",
                value: ": 최신 코드 받기",
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
                type: "inlineCode",
                value: "git branch feature/new-page",
              },
              {
                type: "text",
                value: ": 작업 브랜치 생성",
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
                type: "inlineCode",
                value: "git switch feature/new-page",
              },
              {
                type: "text",
                value: ": 브랜치 이동",
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
                type: "inlineCode",
                value: "(작업 진행)",
              },
              {
                type: "text",
                value: " -> ",
              },
              {
                type: "inlineCode",
                value: "git add",
              },
              {
                type: "text",
                value: " -> ",
              },
              {
                type: "inlineCode",
                value: "git commit",
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
                type: "inlineCode",
                value: "git push origin feature/new-page",
              },
              {
                type: "text",
                value: ": 작업 내용 공유",
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
                type: "text",
                value: "(GitHub 등에서 Pull Request 생성 및 머지)",
              },
            ],
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
        value: "이제 브랜치를 두려워하지 말고 자유롭게 활용해보세요!",
      },
    ],
  },
] satisfies PostDocumentNode[];

const DevGitBranchCommandsPost = () => {
  return <BlogPostDocument nodes={nodes} />;
};

export default DevGitBranchCommandsPost;
