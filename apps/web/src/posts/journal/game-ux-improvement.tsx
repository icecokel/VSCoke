import { BlogPostDocument, type PostDocumentNode } from "@/components/blog/blog-post-document";

const nodes = [
  {
    type: "heading",
    depth: 1,
    children: [
      {
        type: "text",
        value: "플레이 경험을 완성하는 디테일: Sky Drop UX 개선",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "재미있는 게임 로직을 만드는 것은 시작에 불과했습니다.\n막상 Sky Drop을 배포하고 직접 플레이해보니, 게임 자체의 재미보다 **\"불편함\"**이 먼저 다가왔습니다.\n게임이 끝났는데 어떻게 다시 시작해야 할지 모호하거나, 결과 화면이 너무 밋밋해서 성취감이 느껴지지 않는 등, '게임 외적인' 요소들이 몰입을 방해하고 있었기 때문입니다.",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          '최근 진행한 UX 개선 작업들은 이러한 **"사소해 보이지만 치명적인 불편함"**들을 제거하는 데 집중했습니다.',
      },
    ],
  },
  {
    type: "heading",
    depth: 2,
    children: [
      {
        type: "text",
        value: "1. 흐름의 완성: 시작과 끝 맺음",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "가장 큰 문제는 게임의 ",
      },
      {
        type: "strong",
        children: [
          {
            type: "text",
            value: "Life Cycle",
          },
        ],
      },
      {
        type: "text",
        value: "이 명확하지 않다는 점이었습니다.",
      },
    ],
  },
  {
    type: "heading",
    depth: 3,
    children: [
      {
        type: "text",
        value: "개선 전",
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
                value:
                  '게임 오버 시 텍스트로만 "Game Over"가 뜨고, 새로고침을 해야 재시작할 수 있었습니다.',
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
                    value: "난이도 초기화 실패",
                  },
                ],
              },
              {
                type: "text",
                value:
                  ": 게임을 재시작해도 이전 게임의 난이도(블록 낙하 속도 등)가 그대로 유지되어, 시작하자마자 죽는 경우가 빈번했습니다.",
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
                value: "내 점수가 얼마인지, 이 점수가 잘한 건지 알기 어려웠습니다.",
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
        value: "개선 후: Result Screen 도입",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "inlineCode",
        value: "ResultScreen",
      },
      {
        type: "text",
        value: " 컴포넌트를 도입하여 게임 오버 시 명확한 피드백을 주도록 변경했습니다.",
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
                    value: "점수 시각화",
                  },
                ],
              },
              {
                type: "text",
                value: ": 최종 점수를 크게 보여주어 성취감을 부여합니다.",
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
                    value: "명확한 Action",
                  },
                ],
              },
              {
                type: "text",
                value: ": ",
              },
              {
                type: "inlineCode",
                value: "Restart",
              },
              {
                type: "text",
                value: " 버튼과 ",
              },
              {
                type: "inlineCode",
                value: "Dashboard",
              },
              {
                type: "text",
                value:
                  " 버튼을 배치하여, 유저가 다음 행동(재도전 또는 나가기)을 주저 없이 선택할 수 있게 했습니다.",
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
                    value: "Backdrop 처리",
                  },
                ],
              },
              {
                type: "text",
                value:
                  ": 게임 화면 위에 반투명한 검은색 레이어를 깔아, 결과 화면에 시선이 집중되도록 연출했습니다.",
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
        value: "2. 답답함 없는 반응형 레이아웃",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          'PC에서는 괜찮았지만, 모바일이나 태블릿 환경에서는 화면이 잘리거나 UI가 겹치는 현상이 발생했습니다.\n가장 아쉬웠던 점은 **"화면의 사이즈를 충분히 사용하지 못한다는 점"**이었습니다.\n특히 브라우저의 주소창이나 하단 바 때문에 게임 영역이 가려지는 문제는 플레이 경험을 심각하게 해쳤습니다.',
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
                    value: "뷰포트 대응",
                  },
                ],
              },
              {
                type: "text",
                value: ": ",
              },
              {
                type: "inlineCode",
                value: "min-h",
              },
              {
                type: "text",
                value: " 대신 ",
              },
              {
                type: "inlineCode",
                value: "dvh",
              },
              {
                type: "text",
                value: " (Dynamic Viewport Height) 단위를 활용하거나, ",
              },
              {
                type: "inlineCode",
                value: "resize",
              },
              {
                type: "text",
                value: " 이벤트에 맞춰 캔버스 크기를 유동적으로 조정하도록 수정했습니다.",
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
                    value: "UI 재배치",
                  },
                ],
              },
              {
                type: "text",
                value:
                  ": 좁은 화면에서는 점수판이나 조작 버튼이 게임 플레이를 방해하지 않도록 위치를 최적화했습니다.",
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
        value: "3. 대시보드와 진입점 개선",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "기존에는 링크를 타고 들어가면 바로 게임이 시작되어 당황스러웠습니다.\n이제는 게임 목록이 있는 ",
      },
      {
        type: "strong",
        children: [
          {
            type: "text",
            value: "대시보드",
          },
        ],
      },
      {
        type: "text",
        value: "를 거치거나, 게임 진입 전 ",
      },
      {
        type: "strong",
        children: [
          {
            type: "text",
            value: "준비 화면",
          },
        ],
      },
      {
        type: "text",
        value: "을 통해 유저가 마음의 준비(?)를 할 수 있는 틈을 만들었습니다.",
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
        value: "마치며",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          '이번 UX 개선을 통해 "기능 구현"과 "사용자 경험"은 별개라는 것을 다시 체감했습니다.\n화려한 그래픽이나 복잡한 알고리즘보다, **"원하는 때에 다시 시작할 수 있는 버튼 하나"**가 유저에게는 더 큰 만족감을 줄 수 있다는 점을 배웠습니다.',
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "앞으로도 Sky Drop은 계속 다듬어질 예정입니다. (다음 목표는 랭킹 시스템일지도...?)",
      },
    ],
  },
] satisfies PostDocumentNode[];

const JournalGameUxImprovementPost = () => {
  return <BlogPostDocument nodes={nodes} />;
};

export default JournalGameUxImprovementPost;
