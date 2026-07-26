import { BlogPostDocument, type PostDocumentNode } from "@/components/blog/blog-post-document";

const nodes = [
  {
    type: "heading",
    depth: 1,
    children: [
      {
        type: "text",
        value: "게임 유저를 늘리기위한 여정",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          '단순히 "게임을 만들었다"에서 끝나는 것이 아니라, **"사람들이 이 게임을 어떻게 공유하고 즐길까?"**를 고민하며 기능을 붙여나간 과정입니다.\n(그리고 그 과정에서 마주친 수많은 버그와 삽질의 기록이기도 합니다.)',
      },
    ],
  },
  {
    type: "heading",
    depth: 2,
    children: [
      {
        type: "text",
        value: '1. "자랑하기"와 "이미지 다운로드" 개발',
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "게임의 핵심 바이럴 요소는 **'점수 자랑'**이라고 생각했습니다.\n그래서 게임 오버 화면에 두 가지 핵심 기능을 넣었습니다.",
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
                    value: "이미지 저장",
                  },
                ],
              },
              {
                type: "text",
                value: ": 처음엔 ",
              },
              {
                type: "inlineCode",
                value: "html2canvas",
              },
              {
                type: "text",
                value: "를 썼지만, 그라데이션과 텍스트 그림자가 깨지는 문제가 있어 ",
              },
              {
                type: "inlineCode",
                value: "html-to-image",
              },
              {
                type: "text",
                value: "로 교체했습니다.",
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
                    value: "공유하기",
                  },
                ],
              },
              {
                type: "text",
                value: ": Web Share API를 사용해 친구들에게 바로 링크 보내기.",
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
          '여기까지는 정말 순조로웠습니다. (라이브러리 교체라는 작은 소동만 빼면요) "와, 이제 공유도 되니까 유저가 늘겠지?"라고 생각했죠.',
      },
    ],
  },
  {
    type: "heading",
    depth: 2,
    children: [
      {
        type: "text",
        value: "2. 첫 번째 난관: 게임이 다시 시작되지 않는다?",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "QA(라고 쓰고 혼자 테스트라고 읽음)를 하던 중 치명적인 문제를 발견했습니다.\n",
      },
      {
        type: "strong",
        children: [
          {
            type: "text",
            value: '"다시 하기" 버튼을 눌렀는데 게임이 멈춰버리는 현상.',
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
        value: "원인은 **React와 Phaser 엔진 사이의 타이밍 미스매치(Race Condition)**였습니다.",
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
                value: "React 컴포넌트는 재빠르게 재렌더링되며 ",
              },
              {
                type: "inlineCode",
                value: "game:start",
              },
              {
                type: "text",
                value: " 이벤트를 쐈고,",
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
                value:
                  "Phaser 게임 인스턴스는 아직 리소스를 로딩 중이라 그 신호를 듣지 못했습니다.",
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
        value: '결국 "야, 너 준비 됐어?"를 확인하는 절차(',
      },
      {
        type: "inlineCode",
        value: "isLoaded",
      },
      {
        type: "text",
        value: " 체크)를 추가하고 나서야 게임이 정상적으로 돌아가기 시작했습니다.",
      },
    ],
  },
  {
    type: "heading",
    depth: 2,
    children: [
      {
        type: "text",
        value: '3. OG(Open Graph) 이미지 추가: "0점의 악몽"',
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "공유 기능의 화룡점정을 위해 ",
      },
      {
        type: "strong",
        children: [
          {
            type: "text",
            value: "Next.js의 OG Image Generation",
          },
        ],
      },
      {
        type: "text",
        value: "(",
      },
      {
        type: "inlineCode",
        value: "opengraph-image.tsx",
      },
      {
        type: "text",
        value: ")을 도입했습니다.\n카카오톡이나 문자로 링크를 보냈을 때, 밋밋한 텍스트 대신 ",
      },
      {
        type: "strong",
        children: [
          {
            type: "text",
            value: '"5200점 달성!"',
          },
        ],
      },
      {
        type: "text",
        value: " 이렇게 이미지가 뜨면 클릭률이 200% 오를 거라 확신했거든요.",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "하지만 현실은...",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "image",
        url: "/images/blog/og-fail.png",
        alt: "0점 이미지",
        title: null,
      },
      {
        type: "text",
        value: "\n",
      },
      {
        type: "emphasis",
        children: [
          {
            type: "text",
            value: "(상상도: 모든 공유 이미지에 0점이 찍혀 나가는 상황)",
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
          '친구에게 "나 5000점 찍었어!" 하고 보냈는데, 정작 썸네일에는 **"0점"**이라고 박혀있는 상황.',
      },
    ],
  },
  {
    type: "heading",
    depth: 2,
    children: [
      {
        type: "text",
        value: "4. OG 삽질과 대공사",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "원인은 Next.js의 파일 기반 메타데이터(",
      },
      {
        type: "inlineCode",
        value: "opengraph-image.tsx",
      },
      {
        type: "text",
        value: ")가 ",
      },
      {
        type: "strong",
        children: [
          {
            type: "text",
            value: "Query Parameter (",
          },
          {
            type: "inlineCode",
            value: "?score=5000",
          },
          {
            type: "text",
            value: ")를 지원하지 않기 때문",
          },
        ],
      },
      {
        type: "text",
        value: "이었습니다.",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "결국 눈물을 머금고 URL 구조 자체를 갈아엎었습니다.",
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
                    value: "Before",
                  },
                ],
              },
              {
                type: "text",
                value: ": ",
              },
              {
                type: "inlineCode",
                value: "vscoke.vercel.app/game/sky-drop/share?score=5000",
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
                    value: "After",
                  },
                ],
              },
              {
                type: "text",
                value: ": ",
              },
              {
                type: "inlineCode",
                value: "vscoke.vercel.app/game/sky-drop/5000/share",
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
        value: "점수를 URL 경로(Path)의 일부인 ",
      },
      {
        type: "strong",
        children: [
          {
            type: "text",
            value: "Dynamic Route",
          },
        ],
      },
      {
        type: "text",
        value:
          "로 밀어 넣어서, 서버 사이드에서 OG 이미지를 생성할 때 점수를 확실하게 읽을 수 있도록 만들었습니다.",
      },
    ],
  },
  {
    type: "heading",
    depth: 2,
    children: [
      {
        type: "text",
        value: "5. 끝없는 디자인 욕심",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          '기능이 해결되니 이제 "예쁨"이 신경 쓰이기 시작했습니다.\n처음엔 "다양하면 좋겠지!" 하고 10가지 파스텔 톤을 넣었는데, 막상 모바일에서 보니 색깔 구분이 안 되는 대참사가...',
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "결국 다시 ",
      },
      {
        type: "strong",
        children: [
          {
            type: "text",
            value: "8가지 고대비(High Contrast) 컬러",
          },
        ],
      },
      {
        type: "text",
        value:
          '로 압축하고, 블록 내부에 진한 이너 테두리를 추가해서 "누가 봐도 이건 다른 블록이다" 싶게 시인성을 개선했습니다.',
      },
    ],
  },
  {
    type: "heading",
    depth: 2,
    children: [
      {
        type: "text",
        value: "마치며",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "기능 하나 추가하는 게 이렇게 험난할 줄 몰랐습니다.\n하지만 덕분에 ",
      },
      {
        type: "strong",
        children: [
          {
            type: "text",
            value: "타이밍 이슈 핸들링",
          },
        ],
      },
      {
        type: "text",
        value: ", ",
      },
      {
        type: "strong",
        children: [
          {
            type: "text",
            value: "Next.js의 심화 라우팅",
          },
        ],
      },
      {
        type: "text",
        value: ", ",
      },
      {
        type: "strong",
        children: [
          {
            type: "text",
            value: "사용자 경험(UX)을 고려한 디자인",
          },
        ],
      },
      {
        type: "text",
        value: "까지 깊게 고민해 볼 수 있었던 소중한 시간이었습니다.",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "이제 여러분도 제 삽질의 결과물을 즐겨주세요!",
      },
    ],
  },
] satisfies PostDocumentNode[];

const JournalJourneyToIncreaseGameUsersPost = () => {
  return <BlogPostDocument nodes={nodes} />;
};

export default JournalJourneyToIncreaseGameUsersPost;
