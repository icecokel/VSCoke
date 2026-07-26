import { BlogPostDocument, type PostDocumentNode } from "@/components/blog/blog-post-document";

const nodes = [
  {
    type: "heading",
    depth: 1,
    children: [
      {
        type: "text",
        value: "Sky Drop 게임 제작기: React와 Phaser의 만남",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "단순한 웹 프로젝트에 생동감을 불어넣고 싶다는 생각, 다들 한 번쯤 해보셨을 겁니다.\n저 역시 블로그에 정적인 텍스트만 가득한 것이 지루하게 느껴졌고, ",
      },
      {
        type: "strong",
        children: [
          {
            type: "text",
            value: '"방문자가 잠시나마 즐길 수 있는 미니 게임이 있으면 어떨까?"',
          },
        ],
      },
      {
        type: "text",
        value: " 하는 생각으로 ",
      },
      {
        type: "strong",
        children: [
          {
            type: "text",
            value: "Sky Drop",
          },
        ],
      },
      {
        type: "text",
        value: " 프로젝트를 시작하게 되었습니다.",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "React 생태계에 익숙한 상태에서 게임 엔진인 Phaser를 얹는 과정은 생각보다 다사다난했습니다.\n맨땅에서 시작해 완성도를 높여가기까지 겪었던 고민과 해결 과정을 공유합니다.",
      },
    ],
  },
  {
    type: "heading",
    depth: 2,
    children: [
      {
        type: "text",
        value: "1. 첫 단추: React 컴포넌트로서의 Phaser",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "Phaser는 강력한 게임 엔진이지만, DOM을 직접 제어하는 방식이라 React의 Virtual DOM과 궁합을 맞추는 게 첫 번째 과제였습니다.",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "inlineCode",
        value: "PhaserGame",
      },
      {
        type: "text",
        value:
          "이라는 컴포넌트를 만들어 Phaser 인스턴스를 관리하도록 설계했습니다.\nReact의 State가 변할 때 게임에 이벤트를 전달하고, 반대로 게임 내에서 발생한 이벤트(Game Over 등)를 React로 끌어오는 구조를 잡는 데 집중했습니다.\n처음에는 단순히 하늘에서 떨어지는 블록을 피하는 아주 기초적인 메커니즘으로 시작했습니다.",
      },
    ],
  },
  {
    type: "heading",
    depth: 2,
    children: [
      {
        type: "text",
        value: "2. 예상치 못한 난관들",
      },
    ],
  },
  {
    type: "heading",
    depth: 3,
    children: [
      {
        type: "text",
        value: "WebGL vs Canvas 호환성 문제",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "로컬 개발 환경에서는 부드럽게 돌아가던 게임이 특정 브라우저나 저사양 기기에서 검게 나오거나 멈추는 현상이 발생했습니다.\n원인은 WebGL 컨텍스트 문제였습니다. 화려한 그래픽보다는 안정적인 구동이 중요했기에, 과감하게 기본 렌더러를 ",
      },
      {
        type: "strong",
        children: [
          {
            type: "text",
            value: "Canvas",
          },
        ],
      },
      {
        type: "text",
        value: "로 전환하거나 WebGL 설정을 타협하는 과정을 거쳤습니다.",
      },
    ],
  },
  {
    type: "heading",
    depth: 2,
    children: [
      {
        type: "text",
        value: "3. 디테일이 완성도를 만든다",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          '기본적인 구동이 안정화된 후, "그냥 돌아가는 게임"을 넘어 "재미있는 게임"으로 만들기 위한 폴리싱(Polishing) 작업에 들어갔습니다.',
      },
    ],
  },
  {
    type: "heading",
    depth: 3,
    children: [
      {
        type: "text",
        value: "반응형 디자인과 모바일 대응",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "PC 모니터에서는 멀쩡하던 게임이 모바일 가로 모드에서는 화면 밖으로 넘어가거나 UI가 겹치는 문제가 있었습니다.\n게임 컨테이너에 ",
      },
      {
        type: "inlineCode",
        value: "max-height",
      },
      {
        type: "text",
        value:
          "를 적용하여 뷰포트 높이가 낮아져도 게임 화면이 잘리지 않도록 CSS를 수정했습니다. 또한 모바일에서는 사이드바가 게임을 가리지 않도록 동작 방식을 개선했습니다.",
      },
    ],
  },
  {
    type: "heading",
    depth: 3,
    children: [
      {
        type: "text",
        value: "타격감과 시각적 피드백",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "블록이 바닥에 닿거나 캐릭터와 충돌했을 때 아무런 효과가 없으니 게임이 밋밋했습니다.\n블록이 파괴될 때 파티클이 튀는 폭발 효과를 추가하고, 리소스가 로딩되는 동안 지루하지 않게 로딩 바를 구현하여 시각적인 만족도를 높였습니다.",
      },
    ],
  },
  {
    type: "heading",
    depth: 2,
    children: [
      {
        type: "text",
        value: "4. 게임플레이의 깊이를 더하다",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "단순히 피하기만 하는 게임은 금방 지루해지기 마련입니다. 플레이어가 계속 도전하고 싶게 만드는 요소들이 필요했습니다.",
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
                    value: "동적 난이도 조절",
                  },
                ],
              },
              {
                type: "text",
                value:
                  ": 생존 시간이 길어질수록 블록이 떨어지는 속도가 점점 빨라지게 만들었습니다. 초반의 여유로움이 후반부의 긴박함으로 자연스럽게 이어지도록 유도했죠.",
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
                    value: "위기 연출",
                  },
                ],
              },
              {
                type: "text",
                value:
                  ": 게임 오버가 임박했을 때(화면에 블록이 많이 쌓였을 때) 화면 테두리가 붉게 점멸하며 경고음을 주는 기능을 추가했습니다. 이 작은 연출 하나가 플레이어의 손에 땀을 쥐게 만들었습니다.",
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
                    value: "실시간 기록 경쟁",
                  },
                ],
              },
              {
                type: "text",
                value:
                  ': 우측 상단에 생존 시간을 실시간으로 보여주어, "1초만 더!"를 외치며 다시 플레이하게 만드는 동기를 부여했습니다.',
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
        value: "5. 마치며: 하나의 완전한 경험으로",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "마지막으로 메뉴와 게임 내 텍스트를 모두 다국어(i18n) 처리하여 글로벌(?) 서비스를 위한 준비까지 마쳤습니다.",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "이번 프로젝트를 통해 프론트엔드 개발자는 단순히 화면을 그리는 것을 넘어, ",
      },
      {
        type: "strong",
        children: [
          {
            type: "text",
            value: "사용자의 경험(Flow)을 설계하는 사람",
          },
        ],
      },
      {
        type: "text",
        value:
          "이라는 것을 다시 한번 느꼈습니다.\nReact의 생명주기와 게임 루프를 동기화하고, 브라우저 성능을 최적화하며 겪었던 시행착오들은 분명 값진 경험이었습니다.",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "Sky Drop은 지금도 계속 발전하고 있습니다. 혹시 아직 플레이해보지 않으셨다면, 지금 바로 도전해보세요!",
      },
    ],
  },
] satisfies PostDocumentNode[];

const JournalGameDevLogPost = () => {
  return <BlogPostDocument nodes={nodes} />;
};

export default JournalGameDevLogPost;
