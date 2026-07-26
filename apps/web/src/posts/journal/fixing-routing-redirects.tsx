import { BlogPostDocument, type PostDocumentNode } from "@/components/blog/blog-post-document";

const nodes = [
  {
    type: "heading",
    depth: 1,
    children: [
      {
        type: "text",
        value: "Next.js 라우팅 트러블슈팅: URL vs 로컬 스토리지",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          'VS Code 스타일의 UI를 웹으로 구현하면서, **"이전에 열어둔 탭을 기억하는 기능"**은 필수적이었습니다. 이를 위해 ',
      },
      {
        type: "inlineCode",
        value: "localStorage",
      },
      {
        type: "text",
        value:
          "를 사용하여 히스토리 상태를 관리했는데, 이 과정에서 예상치 못한 라우팅 문제가 발생했습니다.",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "오늘은 딥링킹(Deep Linking)이 불가능했던 이슈와 이를 해결해나가는 과정을 정리해보려 합니다.",
      },
    ],
  },
  {
    type: "heading",
    depth: 2,
    children: [
      {
        type: "text",
        value: "1. 기본 플로우 (문제점)",
      },
    ],
  },
  {
    type: "heading",
    depth: 3,
    children: [
      {
        type: "text",
        value: "상황",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "사용자가 사이트를 재방문했을 때 이전 작업 환경을 그대로 보여주기 위해, ",
      },
      {
        type: "inlineCode",
        value: "HistoryContext",
      },
      {
        type: "text",
        value: "를 만들어 로컬 스토리지에 열려있는 탭 목록과 활성 탭 정보를 저장했습니다.",
      },
    ],
  },
  {
    type: "heading",
    depth: 3,
    children: [
      {
        type: "text",
        value: "문제 발생",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "strong",
        children: [
          {
            type: "text",
            value: '"첫 유저를 어디론가 랜딩 시켰을 때"',
          },
        ],
      },
      {
        type: "text",
        value: ' 문제가 터졌습니다.\n예를 들어, 친구에게 "나 게임 만들었어! 해봐"라며 ',
      },
      {
        type: "inlineCode",
        value: "https://vscoke.vercel.app/game",
      },
      {
        type: "text",
        value: " 링크를 공유했다고 가정해봅시다.",
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
                type: "text",
                value: "사용자는 ",
              },
              {
                type: "inlineCode",
                value: "/game",
              },
              {
                type: "text",
                value: "으로 접속합니다.",
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
                value: "하지만 앱이 켜지는 순간, ",
              },
              {
                type: "inlineCode",
                value: "HistoryTabs",
              },
              {
                type: "text",
                value: " 컴포넌트가 로컬 스토리지를 확인합니다.",
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
                    value: '"어? 저장된 히스토리가 없네? (또는 마지막에 본 게 홈이네?)"',
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
                    value: '"메인으로 가!"',
                  },
                ],
              },
              {
                type: "text",
                value: " -> ",
              },
              {
                type: "inlineCode",
                value: "/",
              },
              {
                type: "text",
                value: "로 강제 리다이렉트.",
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
        value: "결국 사용자는 링크를 타고 왔음에도 무조건 메인 페이지(",
      },
      {
        type: "inlineCode",
        value: "Hello, I'm Icecoke!",
      },
      {
        type: "text",
        value: ")만 보게 되는 치명적인 이슈가 있었습니다.",
      },
    ],
  },
  {
    type: "heading",
    depth: 2,
    children: [
      {
        type: "text",
        value: "2. 고민했던 방법들",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "이 문제를 해결하기 위해 몇 가지 방법을 고민했습니다.",
      },
    ],
  },
  {
    type: "heading",
    depth: 3,
    children: [
      {
        type: "text",
        value: "방법 A: 예외 처리 추가",
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
                type: "text",
                value: "히스토리가 비어있을 때는 리다이렉트를 하지 않는다?",
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
                value: "하지만 만약 히스토리가 있으면? 사용자가 ",
              },
              {
                type: "inlineCode",
                value: "/game",
              },
              {
                type: "text",
                value: "으로 들어왔는데, 저장된 기록에 따라 ",
              },
              {
                type: "inlineCode",
                value: "/About",
              },
              {
                type: "text",
                value: "으로 보내버린다면 더 이상하겠죠.",
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
        value: "방법 B: URL 우선권 부여",
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
                type: "text",
                value: "로컬 스토리지 데이터보다 ",
              },
              {
                type: "strong",
                children: [
                  {
                    type: "text",
                    value: "현재 접속한 URL",
                  },
                ],
              },
              {
                type: "text",
                value: "을 더 높은 우선순위로 둔다.",
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
                value: '"기억된 것"보다 "지금 사용자가 보러 온 것"이 더 중요하다는 접근입니다.',
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
        value: "결국 ",
      },
      {
        type: "strong",
        children: [
          {
            type: "text",
            value: "방법 B",
          },
        ],
      },
      {
        type: "text",
        value: "가 웹의 기본 원칙(URL이 리소스를 가리킨다)에 맞다고 판단하여 진행했습니다.",
      },
    ],
  },
  {
    type: "heading",
    depth: 2,
    children: [
      {
        type: "text",
        value: "3. 해결 시도와 사이드 이펙트",
      },
    ],
  },
  {
    type: "heading",
    depth: 3,
    children: [
      {
        type: "text",
        value: "1차 시도: Source of Truth 변경",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "기존에는 ",
      },
      {
        type: "inlineCode",
        value: "HistoryTabs",
      },
      {
        type: "text",
        value: "가 주도권을 가지고 라우터를 조종했습니다.\n",
      },
      {
        type: "emphasis",
        children: [
          {
            type: "text",
            value: '"히스토리 탭이 바뀌면 -> 라우터도 이동해"',
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
        value: "이것을 반대로 뒤집었습니다.\n",
      },
      {
        type: "emphasis",
        children: [
          {
            type: "text",
            value: '"URL이 바뀌면 -> 히스토리 탭을 맞춰"',
          },
        ],
      },
    ],
  },
  {
    type: "code",
    language: "tsx",
    value:
      "// 변경 전 (HistoryTabs가 대장)\nuseEffect(() => {\n  if (current) router.replace(current.path);\n}, [current]);\n\n// 변경 후 (URL이 대장)\nconst pathname = usePathname();\nuseEffect(() => {\n  // URL에 맞는 탭이 없으면 추가, 있으면 활성화\n  syncTabWithUrl(pathname);\n}, [pathname]);",
  },
  {
    type: "heading",
    depth: 3,
    children: [
      {
        type: "text",
        value: "발생한 사이드 이펙트 (Side Effect)",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "이렇게 바꾸고 났더니, 갑자기 ",
      },
      {
        type: "strong",
        children: [
          {
            type: "text",
            value: "사이드바(탐색기)가 고장",
          },
        ],
      },
      {
        type: "text",
        value:
          " 났습니다.\n파일을 클릭해도 URL은 안 바뀌고, 탭만 번쩍거리는 기이한 현상이 발생했죠.",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "원인은 사이드바 아이템(",
      },
      {
        type: "inlineCode",
        value: "ExplorerItem",
      },
      {
        type: "text",
        value: ")에 있었습니다.\n예전에는 사이드바가 ",
      },
      {
        type: "inlineCode",
        value: "history.add()",
      },
      {
        type: "text",
        value: "만 호출하면, ",
      },
      {
        type: "inlineCode",
        value: "HistoryTabs",
      },
      {
        type: "text",
        value: "가 그걸 감지해서 ",
      },
      {
        type: "inlineCode",
        value: "router.push",
      },
      {
        type: "text",
        value: "를 대신 해줬던 구조였기 때문입니다.",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "inlineCode",
        value: "HistoryTabs",
      },
      {
        type: "text",
        value: "의 ",
      },
      {
        type: "inlineCode",
        value: "router",
      },
      {
        type: "text",
        value: " 제어권을 뺏으니, 아무도 주소를 바꿔주지 않게 된 것입니다.",
      },
    ],
  },
  {
    type: "heading",
    depth: 2,
    children: [
      {
        type: "text",
        value: "4. 최종 적용된 방법",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          '결국 **"URL을 모든 상태의 중심(Single Source of Truth)으로 둔다"**는 원칙을 확고히 했습니다.',
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
                    value: "사이드바 수정",
                  },
                ],
              },
              {
                type: "text",
                value: ": 아이템 클릭 시 상태를 건드리지 않고, ",
              },
              {
                type: "strong",
                children: [
                  {
                    type: "text",
                    value: "무조건 ",
                  },
                  {
                    type: "inlineCode",
                    value: "router.push(url)",
                  },
                  {
                    type: "text",
                    value: "만 수행",
                  },
                ],
              },
              {
                type: "text",
                value: "합니다. Next.js의 방식 그대로 따르는 것이죠.",
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
                    value: "HistoryTabs 수정",
                  },
                ],
              },
              {
                type: "text",
                value: ": ",
              },
              {
                type: "inlineCode",
                value: "router",
              },
              {
                type: "text",
                value: "가 변경되면(URL이 변하면) 그때 ",
              },
              {
                type: "inlineCode",
                value: "useEffect",
              },
              {
                type: "text",
                value: '가 돌면서 **"어? 새 주소네? 탭 열어줄게"**라고 반응형으로 동작합니다.',
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
                    value: "Hydration 처리",
                  },
                ],
              },
              {
                type: "text",
                value: ": 서버 사이드 렌더링(SSR)과 로컬 스토리지 간의 불일치를 막기 위해, ",
              },
              {
                type: "inlineCode",
                value: "isHydrated",
              },
              {
                type: "text",
                value:
                  " 체크를 넣어 브라우저 로딩이 끝난 후에만 동기화 로직이 돌도록 안전장치를 걸었습니다.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    type: "code",
    language: "tsx",
    value:
      "// 최종 로직 흐름\nUser Click -> router.push('/game') -> URL Change -> HistoryTabs useEffect -> Add Tab & Active",
  },
  {
    type: "heading",
    depth: 2,
    children: [
      {
        type: "text",
        value: "5. 후기",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "strong",
        children: [
          {
            type: "text",
            value: '"Web is all about URLs."',
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
          '이번 트러블슈팅을 통해 웹 애플리케이션에서 URL이 가진 힘을 다시 한번 깨닫게 되었습니다.\n화려한 SPA(Single Page Application) 기능을 구현하느라 가끔 기본을 잊을 때가 있는데, **"상태 관리가 복잡해질수록 URL을 믿어라"**는 교훈을 얻었습니다.',
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "IDE 같은 UI를 구현하더라도, 웹이라면 결국 URL 하나로 모든 상태가 설명될 수 있어야 진짜 웹 앱이 아닐까 싶습니다.",
      },
    ],
  },
] satisfies PostDocumentNode[];

const JournalFixingRoutingRedirectsPost = () => {
  return <BlogPostDocument nodes={nodes} />;
};

export default JournalFixingRoutingRedirectsPost;
