import { BlogPostDocument, type PostDocumentNode } from "@/components/blog/blog-post-document";

const nodes = [
  {
    type: "heading",
    depth: 1,
    children: [
      {
        type: "text",
        value: "사이드바 UX 개선기: 가독성, 페이지네이션, 그리고 검색까지",
      },
    ],
  },
  {
    type: "heading",
    depth: 2,
    children: [
      {
        type: "text",
        value: "1. 고민과 문제점",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "프로젝트가 커지고 블로그 포스트가 하나둘 쌓이다 보니 사이드바(Explorer) 영역에서 몇 가지 문제점이 눈에 띄기 시작했습니다.",
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
                    value: "가독성 저하",
                  },
                ],
              },
              {
                type: "text",
                value:
                  ": 파일명이 길어질 경우 사이드바 영역을 넘어가거나 잘려서 무슨 파일인지 한눈에 알기 어려웠습니다.",
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
                    value: "확장성 부족",
                  },
                ],
              },
              {
                type: "text",
                value:
                  ": 포스트가 수백 개로 늘어난다면 스크롤이 끝도 없이 길어질 것이 뻔했습니다. VSCode처럼 트리 구조를 가지고 있지만, 수많은 파일이 한 번에 나열되는 것은 사용자 경험(UX)에 좋지 않아 보였습니다.",
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
        value: "2. 선택지 분석",
      },
    ],
  },
  {
    type: "heading",
    depth: 3,
    children: [
      {
        type: "text",
        value: "가독성 문제",
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
                    value: "옵션 A",
                  },
                ],
              },
              {
                type: "text",
                value: ": 사이드바 너비를 늘린다. -> 공간 효율성이 떨어짐.",
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
                    value: "옵션 B",
                  },
                ],
              },
              {
                type: "text",
                value: ": 줄바꿈 처리한다. -> 파일 목록의 통일성이 깨짐.",
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
                    value: "옵션 C",
                  },
                ],
              },
              {
                type: "text",
                value: ": ",
              },
              {
                type: "strong",
                children: [
                  {
                    type: "text",
                    value: "말줄임(...) 처리하고 툴팁(Tooltip)을 제공한다.",
                  },
                ],
              },
              {
                type: "text",
                value: " -> 가장 깔끔하고 VSCode스러운 방식.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    type: "heading",
    depth: 3,
    children: [
      {
        type: "text",
        value: "확장성 문제 (많은 파일)",
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
                    value: "옵션 A",
                  },
                ],
              },
              {
                type: "text",
                value: ": 가상 스크롤(Virtual Scrolling) 도입. -> 구현 복잡도 증가.",
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
                    value: "옵션 B",
                  },
                ],
              },
              {
                type: "text",
                value: ": ",
              },
              {
                type: "strong",
                children: [
                  {
                    type: "text",
                    value: "페이지네이션(Pagination) 도입.",
                  },
                ],
              },
              {
                type: "text",
                value:
                  " -> '더 보기' 링크를 통해 대시보드로 이동시키는 방식이 깔끔하다고 판단. 탐색기에서는 ",
              },
              {
                type: "strong",
                children: [
                  {
                    type: "text",
                    value: "최신 글 10개",
                  },
                ],
              },
              {
                type: "text",
                value: "만 보여주고 나머지는 대시보드에서 관리하도록 유도.",
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
        value: "3. 해결 과정",
      },
    ],
  },
  {
    type: "heading",
    depth: 3,
    children: [
      {
        type: "text",
        value: "Step 1: 가독성 및 디자인 개선",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "우선 ",
      },
      {
        type: "inlineCode",
        value: "ExplorerItem",
      },
      {
        type: "text",
        value: " 컴포넌트를 손봤습니다. 긴 파일명은 CSS ",
      },
      {
        type: "inlineCode",
        value: "truncate",
      },
      {
        type: "text",
        value: " 속성으로 말줄임 처리하고, ",
      },
      {
        type: "inlineCode",
        value: "shadcn/ui",
      },
      {
        type: "text",
        value: "의 ",
      },
      {
        type: "inlineCode",
        value: "Tooltip",
      },
      {
        type: "text",
        value:
          " 컴포넌트를 활용해 마우스를 올렸을 때 전체 이름이 보이도록 했습니다. 또한 아이콘 사이즈가 제각각이던 문제를 해결하기 위해 ",
      },
      {
        type: "inlineCode",
        value: "shrink-0",
      },
      {
        type: "text",
        value: "와 고정 사이즈(",
      },
      {
        type: "inlineCode",
        value: "size-4",
      },
      {
        type: "text",
        value: ")를 적용하여 정렬을 맞췄습니다.",
      },
    ],
  },
  {
    type: "heading",
    depth: 3,
    children: [
      {
        type: "text",
        value: "Step 2: 재귀적 페이지네이션 (Recursive Pagination)",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "가장 고민했던 부분입니다. 단순히 최상위 폴더만 제한하는 것이 아니라, ",
      },
      {
        type: "inlineCode",
        value: "blog/dev",
      },
      {
        type: "text",
        value: "나 ",
      },
      {
        type: "inlineCode",
        value: "blog/journal",
      },
      {
        type: "text",
        value: " 같은 ",
      },
      {
        type: "strong",
        children: [
          {
            type: "text",
            value: "하위 폴더",
          },
        ],
      },
      {
        type: "text",
        value: "에도 동일한 규칙(10개 제한)이 적용되어야 했습니다.",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "inlineCode",
        value: "use-explorer",
      },
      {
        type: "text",
        value: " 훅 내부에 재귀 함수(",
      },
      {
        type: "inlineCode",
        value: "limitItemsRecursively",
      },
      {
        type: "text",
        value: ")를 구현하여 트리의 모든 깊이에서 10개 이상의 항목이 있으면 잘라내고, 마지막에 ",
      },
      {
        type: "inlineCode",
        value: "... (더 보기)",
      },
      {
        type: "text",
        value: " 링크를 추가하는 로직을 완성했습니다.",
      },
    ],
  },
  {
    type: "code",
    language: "typescript",
    value:
      '// use-explorer.tsx (Simplified)\nconst limitItemsRecursively = (items: ITree[]): ITree[] => {\n  // ... 정렬 로직 ...\n  if (sorted.length > 10) {\n    const sliced = sorted.slice(0, 10);\n    sliced.push({\n      id: "(more)",\n      label: t("more"), // 다국어 지원\n      path: "/blog/dashboard",\n      icon: "none", // 아이콘 제거\n    });\n    result = sliced;\n  }\n  // ... 재귀 호출 ...\n};',
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "이 과정에서 '더 보기' 링크에 불필요한 아이콘이 들어가는 것이 어색하여 아이콘을 제거(",
      },
      {
        type: "inlineCode",
        value: 'icon: "none"',
      },
      {
        type: "text",
        value: ")하고, 다국어(",
      },
      {
        type: "inlineCode",
        value: "messages",
      },
      {
        type: "text",
        value: ")를 적용해 완성도를 높였습니다.",
      },
    ],
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
        value: "4. 블로그 대시보드 검색 기능 추가",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "페이지네이션으로 '더 보기' 눌렀을 때 이동하는 대시보드 페이지에서 ",
      },
      {
        type: "strong",
        children: [
          {
            type: "text",
            value: "포스트가 많아지면 원하는 글을 찾기 어렵겠다",
          },
        ],
      },
      {
        type: "text",
        value: "는 생각이 들어 검색 기능을 추가하기로 했습니다.",
      },
    ],
  },
  {
    type: "heading",
    depth: 3,
    children: [
      {
        type: "text",
        value: "요구사항",
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
                    value: "제목 기반 검색",
                  },
                ],
              },
              {
                type: "text",
                value: ": 포스트 제목으로 필터링",
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
                    value: "Debounce 적용",
                  },
                ],
              },
              {
                type: "text",
                value: ": 타이핑할 때마다 검색하지 않고 입력이 멈춘 후 검색",
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
                    value: "자동완성(Autocomplete)",
                  },
                ],
              },
              {
                type: "text",
                value: ": 검색어에 맞는 포스트 제목을 드롭다운으로 제안",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    type: "heading",
    depth: 3,
    children: [
      {
        type: "text",
        value: "삽질 기록: Debounce 라이브러리 선택",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "처음엔 ",
      },
      {
        type: "inlineCode",
        value: "@toss/react",
      },
      {
        type: "text",
        value: " 라이브러리의 ",
      },
      {
        type: "inlineCode",
        value: "useDebounce",
      },
      {
        type: "text",
        value: " 훅을 사용하려 했습니다. 토스에서 만든 라이브러리라 믿음직스러웠거든요.",
      },
    ],
  },
  {
    type: "code",
    language: "bash",
    value: "npm install @toss/react",
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "그런데 설치부터 문제가 발생했습니다:",
      },
    ],
  },
  {
    type: "code",
    language: null,
    value:
      'npm error ERESOLVE could not resolve\nnpm error peer react@"^17.0.1 || ^18.0.0" from @toss/react@1.5.2',
  },
  {
    type: "paragraph",
    children: [
      {
        type: "strong",
        children: [
          {
            type: "text",
            value: "React 19를 사용 중",
          },
        ],
      },
      {
        type: "text",
        value: "이라 peer dependency 충돌이 났습니다. ",
      },
      {
        type: "inlineCode",
        value: "--legacy-peer-deps",
      },
      {
        type: "text",
        value: "로 강제 설치는 가능했지만, 더 큰 문제가 있었습니다.",
      },
    ],
  },
  {
    type: "code",
    language: "typescript",
    value:
      "// 예상했던 사용법\nconst debouncedQuery = useDebounce(query, 300);\n\n// 실제 @toss/react의 useDebounce 시그니처\nuseDebounce(callback: (...args: any[]) => any, wait: number);",
  },
  {
    type: "paragraph",
    children: [
      {
        type: "inlineCode",
        value: "@toss/react",
      },
      {
        type: "text",
        value: "의 ",
      },
      {
        type: "inlineCode",
        value: "useDebounce",
      },
      {
        type: "text",
        value: "는 ",
      },
      {
        type: "strong",
        children: [
          {
            type: "text",
            value: "값이 아니라 함수를 debounce",
          },
        ],
      },
      {
        type: "text",
        value: "하는 용도였습니다. 타입 에러가 발생했습니다:",
      },
    ],
  },
  {
    type: "code",
    language: null,
    value:
      "Argument of type 'string' is not assignable to parameter of type '(...args: any[]) => any'",
  },
  {
    type: "heading",
    depth: 3,
    children: [
      {
        type: "text",
        value: "해결: lodash.debounce로 전환",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "결국 가장 안정적이고 널리 사용되는 ",
      },
      {
        type: "inlineCode",
        value: "lodash",
      },
      {
        type: "text",
        value: "의 ",
      },
      {
        type: "inlineCode",
        value: "debounce",
      },
      {
        type: "text",
        value: "를 선택했습니다.",
      },
    ],
  },
  {
    type: "code",
    language: "bash",
    value: "npm install lodash @types/lodash",
  },
  {
    type: "code",
    language: "typescript",
    value:
      '// dashboard-search.tsx\nimport { debounce } from "lodash";\n\nconst updateDebouncedQuery = useCallback(\n  debounce((value: string) => {\n    setDebouncedQuery(value);\n  }, 300),\n  [],\n);',
  },
  {
    type: "heading",
    depth: 3,
    children: [
      {
        type: "text",
        value: "또 다른 버그: 자동완성 드롭다운이 안 닫힘",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "구현 후 테스트해보니 자동완성 드롭다운에서 항목을 선택해도 ",
      },
      {
        type: "strong",
        children: [
          {
            type: "text",
            value: "드롭다운이 닫히지 않는 버그",
          },
        ],
      },
      {
        type: "text",
        value: "가 있었습니다.",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "원인을 분석해보니:",
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
                value: "handleSelect",
              },
              {
                type: "text",
                value: "에서 ",
              },
              {
                type: "inlineCode",
                value: "setSuggestions([])",
              },
              {
                type: "text",
                value: "를 호출",
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
                value: "하지만 ",
              },
              {
                type: "inlineCode",
                value: "setDebouncedQuery(title)",
              },
              {
                type: "text",
                value: " 호출",
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
                value: "useEffect",
              },
              {
                type: "text",
                value: "가 ",
              },
              {
                type: "inlineCode",
                value: "debouncedQuery",
              },
              {
                type: "text",
                value: " 변경 감지",
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
                    value: "다시 ",
                  },
                  {
                    type: "inlineCode",
                    value: "setSuggestions",
                  },
                  {
                    type: "text",
                    value: "를 채워버림",
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
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "해결책으로 프로젝트에서 사용 중인 ",
      },
      {
        type: "inlineCode",
        value: "useBoolean",
      },
      {
        type: "text",
        value: " 훅을 활용하여 드롭다운 표시를 ",
      },
      {
        type: "strong",
        children: [
          {
            type: "text",
            value: "명시적으로 제어",
          },
        ],
      },
      {
        type: "text",
        value: "했습니다:",
      },
    ],
  },
  {
    type: "code",
    language: "typescript",
    value:
      'import { useBoolean } from "@/hooks/use-boolean";\n\n// useBoolean 훅으로 드롭다운 상태 관리\nconst dropdown = useBoolean(false);\n\nconst handleSelect = (title: string) => {\n  setQuery(title);\n  setDebouncedQuery(title);\n  dropdown.onFalse(); // 명시적으로 닫기\n};\n\n// JSX\n{dropdown.value && suggestions.length > 0 && query && (\n  <ul>...</ul>\n)}',
  },
  {
    type: "paragraph",
    children: [
      {
        type: "inlineCode",
        value: "useBoolean",
      },
      {
        type: "text",
        value: "은 ",
      },
      {
        type: "inlineCode",
        value: "onTrue()",
      },
      {
        type: "text",
        value: ", ",
      },
      {
        type: "inlineCode",
        value: "onFalse()",
      },
      {
        type: "text",
        value: ", ",
      },
      {
        type: "inlineCode",
        value: "onToggle()",
      },
      {
        type: "text",
        value: " 같은 명시적인 메서드를 제공해서 ",
      },
      {
        type: "inlineCode",
        value: "setIsOpen(true)",
      },
      {
        type: "text",
        value: " 같은 코드보다 의도가 더 명확하게 드러납니다.",
      },
    ],
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
        value: "5. 최종 결과",
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
                    value: "깔끔해진 사이드바",
                  },
                ],
              },
              {
                type: "text",
                value:
                  ": 파일명이 길어도 레이아웃이 깨지지 않으며, 툴팁으로 내용을 확인할 수 있습니다.",
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
                    value: "부담 없는 탐색기",
                  },
                ],
              },
              {
                type: "text",
                value:
                  ": 파일이 아무리 많아져도 폴더 당 10개로 유지되어 시각적 피로도가 줄었습니다.",
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
                    value: "편리한 검색",
                  },
                ],
              },
              {
                type: "text",
                value:
                  ": 대시보드에서 제목으로 빠르게 원하는 포스트를 찾을 수 있고, 자동완성으로 더 빠른 탐색이 가능합니다.",
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
        value: "6. 후기",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          '단순한 기능 구현을 넘어 "사용자가(그리고 개발자인 내가) 어떻게 하면 더 편하게 쓸 수 있을까?"를 고민했던 작업이었습니다.',
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "특히 이번 작업에서 느낀 점:",
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
                    value: "라이브러리 선택 시 React 버전 호환성 확인",
                  },
                ],
              },
              {
                type: "text",
                value: "은 필수입니다. 최신 React 19를 쓰고 있다면 더욱 그렇습니다.",
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
                    value: "API 시그니처를 꼭 확인",
                  },
                ],
              },
              {
                type: "text",
                value:
                  '해야 합니다. 같은 이름의 훅이라도 "값을 debounce"하는지 "함수를 debounce"하는지가 다를 수 있습니다.',
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
                    value: "커스텀 훅을 적극 활용",
                  },
                ],
              },
              {
                type: "text",
                value: "하자. ",
              },
              {
                type: "inlineCode",
                value: "useBoolean",
              },
              {
                type: "text",
                value: "처럼 단순하지만 코드 가독성을 높여주는 훅은 작은 기능에서도 빛을 발합니다.",
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
        value: "앞으로도 이런 '마이크로 인터랙션'을 놓치지 않는 개발을 하고 싶습니다.",
      },
    ],
  },
] satisfies PostDocumentNode[];

const JournalSidebarUxImprovementsPost = () => {
  return <BlogPostDocument nodes={nodes} />;
};

export default JournalSidebarUxImprovementsPost;
