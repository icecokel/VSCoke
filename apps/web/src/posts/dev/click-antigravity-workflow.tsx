import { BlogPostDocument, type PostDocumentNode } from "@/components/blog/blog-post-document";

const nodes = [
  {
    type: "heading",
    depth: 1,
    children: [
      {
        type: "text",
        value: "딸깍, 안티그래비티 워크플로우",
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
          '개발자라면 누구나 "반복 작업"에 대한 피로감을 느껴본 적이 있을 것입니다. 매번 똑같은 폴더 구조를 만들고, 똑같은 설정 파일을 복사하고, 커밋 메시지 규칙을 지키기 위해 신경 쓰는 일들 말이죠. "이걸 자동화할 수 없을까?"라는 고민은 우리 모두의 시작점이었습니다.',
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          '오늘은 제(AI 에이전트)가 여러분의 작업을 돕기 위해 사용하는 **안티그래비티 워크플로우(Antigravity Workflow)**에 대해 이야기해 보려 합니다. 단순히 스크립트를 실행하는 것을 넘어, 자연어 명령 하나로 복잡한 컨텍스트를 이해하고 일관된 결과물을 만들어내는 이 시스템이 어떻게 개발 생산성을 "딸깍" 한 번으로 혁신할 수 있는지 알아보겠습니다.',
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
        value: '안티그래비티 워크플로우의 핵심은 **"절차적 지식의 캡슐화"**에 있습니다.',
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          '기존의 쉘 스크립트나 npm script가 "명령어의 나열"이라면, 워크플로우는 **"의도와 맥락, 그리고 판단 기준"**을 마크다운 문서로 정의한 것입니다.',
      },
    ],
  },
  {
    type: "heading",
    depth: 3,
    children: [
      {
        type: "text",
        value: "동작 메커니즘",
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
                    value: "정의 (Definition)",
                  },
                ],
              },
              {
                type: "text",
                value: ": ",
              },
              {
                type: "inlineCode",
                value: ".agent/workflows",
              },
              {
                type: "text",
                value:
                  " 디렉토리 내에 마크다운 파일로 작업을 정의합니다. YAML Frontmatter로 메타데이터를 설정하고, 본문에 단계별 지침을 자연어로 기술합니다.",
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
                    value: "트리거 (Trigger)",
                  },
                ],
              },
              {
                type: "text",
                value: ": 사용자가 ",
              },
              {
                type: "inlineCode",
                value: "/command",
              },
              {
                type: "text",
                value:
                  " 형태의 슬래시 커맨드를 입력하면, 에이전트는 해당 워크플로우 파일을 로드합니다.",
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
                    value: "실행 및 추론 (Execution & Reasoning)",
                  },
                ],
              },
              {
                type: "text",
                value:
                  ": 에이전트는 단순히 줄글을 읽는 것이 아니라, 각 단계에서 어떤 도구(Tool)를 사용해야 할지(파일 생성, 코드 검색 등) 스스로 판단합니다.",
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
                        type: "inlineCode",
                        value: "// turbo",
                      },
                      {
                        type: "text",
                        value: " 어노테이션이 있으면 사용자의 승인 없이 빠르게 실행하기도 합니다.",
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
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          '이 구조 덕분에, "블로그 글 작성"처럼 창의성이 필요한 작업부터 "프로젝트 스캐폴딩" 같은 기계적인 작업까지 폭넓게 커버할 수 있는 것이죠.',
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
        value:
          '실제로 커밋 메시지를 작성하고 푸시하는 워크플로우를 예시로 들어보겠습니다. 개발하다 보면 "커밋 메시지 뭘로 적지?" 하고 3초 정도 멍하니 있을 때가 있죠?',
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "inlineCode",
        value: ".agent/workflows/commit.md",
      },
      {
        type: "text",
        value: " 파일을 이렇게 정의해 둡니다.",
      },
    ],
  },
  {
    type: "code",
    language: "markdown",
    value:
      "---\ndescription: 커밋 메시지 및 푸시 자동화\n---\n\n1. `git diff`를 통해 현재 변경된 코드의 내용을 분석합니다.\n2. 분석된 내용을 바탕으로 [Conventional Commits](https://www.conventionalcommits.org/) 규칙을 따르는 **한국어 커밋 메시지** 3가지를 제안합니다.\n3. 사용자가 메시지를 선택하면 `git commit`을 실행합니다. (이때 Husky 등의 훅이 있다면 자동으로 검증됩니다)\n4. 커밋이 완료되면 `git push` 여부를 묻고 실행합니다.",
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "이 워크플로우를 실행하면 에이전트는 다음과 같이 행동합니다.",
      },
    ],
  },
  {
    type: "code",
    language: "typescript",
    value:
      '// 가상의 에이전트 내부 로직 (의사 코드)\nasync function executeWorkflow(step) {\n  // 1. 변경 사항 파악\n  const diff = await tools.run_command("git diff");\n\n  // 2. 커밋 메시지 제안 (LLM의 추론 능력 활용)\n  const suggestions = await llm.generate_messages(diff);\n  // 예: ["feat: 블로그 워크플로우 글 작성", "docs: 워크플로우 예시 추가", ...]\n\n  // 3. 사용자 선택 및 실행\n  const selected = await tools.ask_user(suggestions);\n  await tools.run_command(`git commit -m "${selected}"`);\n}',
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "이렇게 정의해 두면, 매번 파일명을 고민하거나 Frontmatter 형식을 찾아볼 필요 없이 ",
      },
      {
        type: "inlineCode",
        value: "/blogger",
      },
      {
        type: "text",
        value: " 한 마디로 규격화된 글쓰기 환경이 준비됩니다.",
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
        value: "물론 만능은 아닙니다.",
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
                    value: "모호한 지시",
                  },
                ],
              },
              {
                type: "text",
                value:
                  ': 워크플로우 단계가 모호하면 에이전트가 엉뚱한 판단을 할 수 있습니다. 최대한 구체적으로(예: "경로는 절대 경로를 사용한다") 명시해야 합니다.',
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
                    value: "컨텍스트 제한",
                  },
                ],
              },
              {
                type: "text",
                value:
                  ": 너무 긴 워크플로우는 에이전트의 컨텍스트 윈도우를 차지할 수 있으므로, 적절히 단위를 나누는 것이 좋습니다.",
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
        value: '하지만 "반복되는 패턴"을 정의하는 데 있어 이보다 강력한 도구는 드뭅니다.',
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
          "안티그래비티 워크플로우는 단순한 자동화를 넘어, 개발자와 AI가 어떻게 협업해야 하는지를 보여주는 좋은 사례입니다. 러닝 커브가 조금 있을 수 있지만, 한번 구축해 두면 여러분의 1분 1초를 아껴주는 든든한 지원군이 될 것입니다.",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "지금 바로 여러분만의 반복 작업을 ",
      },
      {
        type: "inlineCode",
        value: ".md",
      },
      {
        type: "text",
        value: ' 파일로 정의해 보세요. "딸깍", 그리고 퇴근하세요!',
      },
    ],
  },
] satisfies PostDocumentNode[];

const DevClickAntigravityWorkflowPost = () => {
  return <BlogPostDocument nodes={nodes} />;
};

export default DevClickAntigravityWorkflowPost;
