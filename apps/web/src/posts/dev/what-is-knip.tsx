import { BlogPostDocument, type PostDocumentNode } from "@/components/blog/blog-post-document";

const nodes = [
  {
    type: "heading",
    depth: 1,
    children: [
      {
        type: "text",
        value: "Knip은 뭘까?",
      },
    ],
  },
  {
    type: "heading",
    depth: 2,
    children: [
      {
        type: "text",
        value: "1. 들어가며: 왜 이 기술에 주목해야 할까요?",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          '개발자라면 누구나 한 번쯤 "이 코드가 진짜 쓰이고 있는 걸까?"라는 의문을 가져본 적이 있을 겁니다.',
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "리팩토링 후에 남겨진 ",
      },
      {
        type: "inlineCode",
        value: "utils",
      },
      {
        type: "text",
        value:
          " 함수들, 삭제된 페이지에서 쓰던 컴포넌트들... 이런 '좀비 코드(Dead Code)'들은 프로젝트의 가독성을 떨어뜨리고 빌드 시간을 잡아먹는 주범입니다. ",
      },
      {
        type: "inlineCode",
        value: "grep",
      },
      {
        type: "text",
        value: "으로 일일이 찾자니 시간이 아깝고 실수할까 봐 두렵죠.",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "오늘은 이런 고민을 말끔히 씻어줄 도구, ",
      },
      {
        type: "strong",
        children: [
          {
            type: "text",
            value: "Knip",
          },
        ],
      },
      {
        type: "text",
        value:
          '에 대해 이야기해 보려 합니다. 단순히 안 쓰는 파일을 찾는 것을 넘어, **"코드의 구조를 이해하는 청소부"**라고 할 수 있죠.',
      },
    ],
  },
  {
    type: "heading",
    depth: 2,
    children: [
      {
        type: "text",
        value: "2. 핵심 원리와 특징 (Deep Dive)",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "그렇다면 Knip은 어떻게 미사용 코드를 찾아낼까요? 단순한 텍스트 검색과는 차원이 다릅니다.",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "Knip의 비밀은 ",
      },
      {
        type: "strong",
        children: [
          {
            type: "text",
            value: "AST(Abstract Syntax Tree, 추상 구문 트리) 파싱",
          },
        ],
      },
      {
        type: "text",
        value: "에 있습니다. ",
      },
      {
        type: "link",
        url: "https://knip.dev",
        title: null,
        children: [
          {
            type: "text",
            value: "공식 문서",
          },
        ],
      },
      {
        type: "text",
        value:
          "에 따르면, Knip은 TypeScript 컴파일러 API를 활용하여 코드를 텍스트가 아닌 '문법적 구조'로 해석합니다.",
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
                type: "strong",
                children: [
                  {
                    type: "text",
                    value: "진입점(Entry Point) 탐색",
                  },
                ],
              },
              {
                type: "text",
                value: ": 설정된 시작 파일(예: ",
              },
              {
                type: "inlineCode",
                value: "src/index.ts",
              },
              {
                type: "text",
                value: ", ",
              },
              {
                type: "inlineCode",
                value: "src/pages/**/*.tsx",
              },
              {
                type: "text",
                value: ")부터 탐색을 시작합니다.",
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
                    value: "도달 가능성 그래프(Reachability Graph)",
                  },
                ],
              },
              {
                type: "text",
                value: ": ",
              },
              {
                type: "inlineCode",
                value: "import",
              },
              {
                type: "text",
                value: "와 ",
              },
              {
                type: "inlineCode",
                value: "export",
              },
              {
                type: "text",
                value:
                  " 관계를 추적하여 코드 간의 연결 그래프를 그립니다. 이 그래프에 도달하지 못하는 모든 파일과 식별자를 찾아냅니다.",
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
                    value: "정밀한 타입 분석",
                  },
                ],
              },
              {
                type: "text",
                value: ": 단순히 JS 로직뿐만 아니라, ",
              },
              {
                type: "inlineCode",
                value: "interface",
              },
              {
                type: "text",
                value: "나 ",
              },
              {
                type: "inlineCode",
                value: "type",
              },
              {
                type: "text",
                value: " 정의가 실제로 참조되는지까지 검사합니다.",
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
        value:
          '즉, **"컴파일러의 눈"**으로 프로젝트 전체를 스캔하여, 실제로 실행될 가능성이 없는 코드를 핀셋으로 집어내듯 찾아내는 원리입니다.',
      },
    ],
  },
  {
    type: "heading",
    depth: 2,
    children: [
      {
        type: "text",
        value: "3. 실무 적용 가이드 (With Code)",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "백문이 불여일견! 실제 프로젝트에 적용해 보며 사용법을 익혀볼까요?",
      },
    ],
  },
  {
    type: "heading",
    depth: 3,
    children: [
      {
        type: "text",
        value: "3-1. 설치 및 설정",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "먼저 ",
      },
      {
        type: "inlineCode",
        value: "npm",
      },
      {
        type: "text",
        value:
          "으로 설치합니다. 배포 환경엔 필요 없으니 **개발 의존성(-D)**으로 설치하는 것, 잊지 마세요!",
      },
    ],
  },
  {
    type: "code",
    language: "bash",
    value: "npm install -D knip",
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "그다음, 프로젝트 루트에 ",
      },
      {
        type: "inlineCode",
        value: "knip.json",
      },
      {
        type: "text",
        value: " 설정 파일을 만듭니다.",
      },
    ],
  },
  {
    type: "code",
    language: "json",
    value:
      '{\n  "$schema": "https://unpkg.com/knip@5/schema.json",\n\n  // [필수] 탐색을 시작할 진입점입니다.\n  // Next.js의 경우 page 파일들이 시작점이 됩니다.\n  "entry": ["src/app/**/*.{ts,tsx}", "src/pages/**/*.{ts,tsx}"],\n\n  // [필수] 분석 대상 파일의 범위를 지정합니다.\n  "project": ["src/**/*.{ts,tsx}"],\n\n  // [선택] .d.ts 파일 등 분석에서 제외할 패턴을 지정합니다.\n  "ignore": ["**/*.d.ts"],\n\n  // [선택] 코드에선 안 쓰이지만 도구 설정 등에 쓰이는 패키지들입니다.\n  // 이걸 안 적으면 "eslint-config-next 안 쓰는데 지울까요?"라고 물어봅니다.\n  "ignoreDependencies": ["eslint-config-next", "postcss", "husky"]\n}',
  },
  {
    type: "heading",
    depth: 3,
    children: [
      {
        type: "text",
        value: "3-2. 실행 및 결과 확인",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "이제 터미널에서 실행해 봅니다.",
      },
    ],
  },
  {
    type: "code",
    language: "bash",
    value: "npx knip",
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "실행하면 다음과 같이 ",
      },
      {
        type: "strong",
        children: [
          {
            type: "text",
            value: "미사용 항목",
          },
        ],
      },
      {
        type: "text",
        value: "들이 깔끔하게 정리되어 나옵니다.",
      },
    ],
  },
  {
    type: "code",
    language: "bash",
    value:
      "Unused dependencies (2)\nlodash       # package.json엔 있지만 코드에서 import 안 됨\nmoment       # (이제 날짜 라이브러리는 date-fns를 쓰시나 보네요?)\n\nUnused exports (3)\nsrc/utils/date.ts: formatDate   # 파일은 살아있지만 이 함수는 아무도 안 씀\nsrc/components/Button.tsx: default  # 이 컴포넌트는 통째로 안 쓰임!",
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          '이 리포트를 보고 하나씩 "진짜 안 쓰네?" 확인하며 지워나가면 됩니다. 속이 뻥 뚫리는 기분을 느끼실 수 있을 거예요.',
      },
    ],
  },
  {
    type: "heading",
    depth: 2,
    children: [
      {
        type: "text",
        value: "4. 주의사항 및 한계점",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "Knip은 매우 강력하지만, 100% 완벽할 수는 없습니다. 사용 시 몇 가지 주의가 필요합니다.",
      },
    ],
  },
  {
    type: "list",
    ordered: false,
    start: null,
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
                    value: "동적 Import (Dynamic Import)",
                  },
                ],
              },
              {
                type: "text",
                value: ": ",
              },
              {
                type: "inlineCode",
                value: "await import('./' + moduleName)",
              },
              {
                type: "text",
                value:
                  " 같이 런타임에 결정되는 경로는 정적 분석 도구가 파악하기 어렵습니다. 이 경우 ",
              },
              {
                type: "inlineCode",
                value: "knip.json",
              },
              {
                type: "text",
                value: "의 ",
              },
              {
                type: "inlineCode",
                value: "ignore",
              },
              {
                type: "text",
                value: "에 추가해야 합니다.",
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
                    value: "플러그인 설정",
                  },
                ],
              },
              {
                type: "text",
                value:
                  ": Next.js, Jest, Storybook 등 프레임워크가 '마법'을 부리는 영역(자동 라우팅 등)은 Knip이 알 수 없습니다. 다행히 Knip은 다양한 ",
              },
              {
                type: "link",
                url: "https://knip.dev/reference/plugins",
                title: null,
                children: [
                  {
                    type: "text",
                    value: "공식 플러그인",
                  },
                ],
              },
              {
                type: "text",
                value: "을 제공하니, 꼭 활성화해서 오탐을 줄이세요.",
              },
            ],
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
        value: "5. 마치며",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "프로젝트의 건강을 지키는 가장 쉬운 방법은 **불필요한 지방(Dead Code)**을 걷어내는 것입니다.",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "Knip을 도입함으로써 우리는 더 가벼운 번들, 더 빠른 빌드, 그리고 더 명확한 코드베이스를 얻을 수 있습니다. 오늘 당장 여러분의 프로젝트에 ",
      },
      {
        type: "inlineCode",
        value: "npx knip",
      },
      {
        type: "text",
        value: "을 실행해 보세요. 생각보다 많은 좀비 코드들이 여러분을 기다리고 있을지도 모릅니다.",
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
            type: "strong",
            children: [
              {
                type: "text",
                value: "참고 자료",
              },
            ],
          },
          {
            type: "text",
            value: ":",
          },
        ],
      },
      {
        type: "list",
        ordered: false,
        start: null,
        children: [
          {
            type: "listItem",
            children: [
              {
                type: "paragraph",
                children: [
                  {
                    type: "link",
                    url: "https://knip.dev",
                    title: null,
                    children: [
                      {
                        type: "text",
                        value: "Knip 공식 사이트",
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
                    type: "link",
                    url: "https://github.com/webpro/knip",
                    title: null,
                    children: [
                      {
                        type: "text",
                        value: "Knip GitHub 저장소",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
] satisfies PostDocumentNode[];

const DevWhatIsKnipPost = () => {
  return <BlogPostDocument nodes={nodes} />;
};

export default DevWhatIsKnipPost;
