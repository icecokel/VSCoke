import { BlogPostDocument, type PostDocumentNode } from "@/components/blog/blog-post-document";

const nodes = [
  {
    type: "heading",
    depth: 1,
    children: [
      {
        type: "text",
        value: "Git 기본 명령어: 작업 흐름 마스터하기",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "개발자라면 피할 수 없는 도구, ",
      },
      {
        type: "strong",
        children: [
          {
            type: "text",
            value: "Git",
          },
        ],
      },
      {
        type: "text",
        value:
          ".\n복잡해 보이지만 사실 우리가 매일 사용하는 명령어는 정해져 있습니다.\n이번 글에서는 작업 영역 관리를 위한 핵심 명령어들을 살펴보겠습니다.",
      },
    ],
  },
  {
    type: "heading",
    depth: 2,
    children: [
      {
        type: "text",
        value: "1. 저장소 시작하기: ",
      },
      {
        type: "inlineCode",
        value: "git init",
      },
      {
        type: "text",
        value: " & ",
      },
      {
        type: "inlineCode",
        value: "git clone",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "모든 프로젝트의 시작입니다.",
      },
    ],
  },
  {
    type: "heading",
    depth: 3,
    children: [
      {
        type: "inlineCode",
        value: "git init",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "현재 디렉토리를 새로운 Git 저장소로 만듭니다.",
      },
    ],
  },
  {
    type: "code",
    language: "bash",
    value: "git init",
  },
  {
    type: "heading",
    depth: 3,
    children: [
      {
        type: "inlineCode",
        value: "git clone",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "이미 존재하는 원격 저장소를 내 컴퓨터로 가져옵니다.",
      },
    ],
  },
  {
    type: "code",
    language: "bash",
    value: "git clone <repository-url>",
  },
  {
    type: "heading",
    depth: 2,
    children: [
      {
        type: "text",
        value: "2. 상태 확인: ",
      },
      {
        type: "inlineCode",
        value: "git status",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "현재 내 작업 공간의 상태를 확인하는 가장 중요한 명령어입니다.\n어떤 파일이 수정되었는지, 어떤 파일이 스테이징(Staging) 영역에 올라갔는지 알 수 있습니다.",
      },
    ],
  },
  {
    type: "code",
    language: "bash",
    value: "git status",
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
                value: "Tip:",
              },
            ],
          },
          {
            type: "text",
            value: " 습관적으로 ",
          },
          {
            type: "inlineCode",
            value: "git status",
          },
          {
            type: "text",
            value: "를 입력하는 것이 실수를 줄이는 지름길입니다.",
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
        value: "3. 변경 사항 저장: ",
      },
      {
        type: "inlineCode",
        value: "git add",
      },
      {
        type: "text",
        value: " & ",
      },
      {
        type: "inlineCode",
        value: "git commit",
      },
    ],
  },
  {
    type: "heading",
    depth: 3,
    children: [
      {
        type: "inlineCode",
        value: "git add",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "작업한 파일을 스테이징 영역(Staging Area)으로 올립니다. 커밋할 준비를 하는 과정입니다.",
      },
    ],
  },
  {
    type: "code",
    language: "bash",
    value: "# 특정 파일만 추가\ngit add filename.txt\n\n# 모든 변경 사항 추가\ngit add .",
  },
  {
    type: "heading",
    depth: 3,
    children: [
      {
        type: "inlineCode",
        value: "git commit",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "스테이징 된 변경 사항을 확정하여 기록(스냅샷)으로 남깁니다.\n",
      },
      {
        type: "strong",
        children: [
          {
            type: "text",
            value: "의미 있는 메시지",
          },
        ],
      },
      {
        type: "text",
        value: "를 남기는 것이 협업의 에티켓입니다.",
      },
    ],
  },
  {
    type: "code",
    language: "bash",
    value: 'git commit -m "feat: 로그인 기능 구현 완료"',
  },
  {
    type: "heading",
    depth: 2,
    children: [
      {
        type: "text",
        value: "4. 원격 저장소와 동기화: ",
      },
      {
        type: "inlineCode",
        value: "git pull",
      },
      {
        type: "text",
        value: " & ",
      },
      {
        type: "inlineCode",
        value: "git push",
      },
    ],
  },
  {
    type: "heading",
    depth: 3,
    children: [
      {
        type: "inlineCode",
        value: "git pull",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "원격 저장소의 최신 변경 내용을 가져와 내 로컬 저장소와 합칩니다.\n작업을 시작하기 전에 항상 먼저 실행하는 습관을 들이세요.",
      },
    ],
  },
  {
    type: "code",
    language: "bash",
    value: "git pull origin main",
  },
  {
    type: "heading",
    depth: 3,
    children: [
      {
        type: "inlineCode",
        value: "git push",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "로컬에서 커밋한 내용을 원격 저장소에 업로드합니다.",
      },
    ],
  },
  {
    type: "code",
    language: "bash",
    value: "git push origin main",
  },
  {
    type: "thematicBreak",
  },
  {
    type: "heading",
    depth: 2,
    children: [
      {
        type: "text",
        value: "요약",
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
                value: "git init",
              },
              {
                type: "text",
                value: " / ",
              },
              {
                type: "inlineCode",
                value: "git clone",
              },
              {
                type: "text",
                value: ": 시작",
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
                value: "git status",
              },
              {
                type: "text",
                value: ": 확인",
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
                value: "git add",
              },
              {
                type: "text",
                value: ": 준비",
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
                value: "git commit",
              },
              {
                type: "text",
                value: ": 저장",
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
                value: "git pull",
              },
              {
                type: "text",
                value: ": 가져오기",
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
                value: "git push",
              },
              {
                type: "text",
                value: ": 보내기",
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
        value: "이 흐름만 익혀도 Git 사용의 80%는 해결됩니다.\n다음 글에서는 협업의 꽃인 ",
      },
      {
        type: "strong",
        children: [
          {
            type: "text",
            value: "브랜치(Branch)",
          },
        ],
      },
      {
        type: "text",
        value: " 관련 명령어에 대해 알아보겠습니다.",
      },
    ],
  },
] satisfies PostDocumentNode[];

const DevGitBasicCommandsPost = () => {
  return <BlogPostDocument nodes={nodes} />;
};

export default DevGitBasicCommandsPost;
