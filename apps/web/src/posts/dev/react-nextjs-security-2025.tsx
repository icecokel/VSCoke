import { BlogPostDocument, type PostDocumentNode } from "@/components/blog/blog-post-document";

const nodes = [
  {
    type: "heading",
    depth: 1,
    children: [
      {
        type: "text",
        value: "🚨 React & Next.js 긴급 보안 이슈: React2Shell",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "2025년 초, React와 Next.js 생태계를 뒤흔든 심각한 보안 취약점이 발견되었습니다. 일명 **'React2Shell'**이라 불리는 이 취약점은 해커가 인증 없이 원격으로 코드를 실행(RCE)할 수 있게 만드는 매우 위험한 이슈입니다.",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "이 글에서는 해당 취약점의 내용과 해결 방법, 그리고 앞으로의 개발 시 주의해야 할 React Server Actions 보안 수칙을 다룹니다.",
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
        value: "🛑 주요 취약점 분석: CVE-2025-55182",
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
            value: "React2Shell",
          },
        ],
      },
      {
        type: "text",
        value: "로 명명된 이 취약점(CVE-2025-55182)은 ",
      },
      {
        type: "strong",
        children: [
          {
            type: "text",
            value: "React Server Components (RSC)",
          },
        ],
      },
      {
        type: "text",
        value: " 프로토콜의 직렬화/역직렬화 과정에서 발생했습니다.",
      },
    ],
  },
  {
    type: "heading",
    depth: 3,
    children: [
      {
        type: "text",
        value: "원인과 위험성",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "React 서버 컴포넌트는 클라이언트와 서버 간에 'Flight'라는 독자적인 프로토콜을 사용하여 데이터를 주고받습니다. 이 과정에서 서버가 클라이언트로부터 받은 데이터를 처리할 때, 악의적으로 조작된 페이로드를 제대로 검증하지 못하는 문제가 발견되었습니다.",
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
                    value: "심각도",
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
                    value: "CVSS 10.0 (Critical)",
                  },
                ],
              },
              {
                type: "text",
                value: " - 가장 높은 단계의 위험도",
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
                    value: "영향",
                  },
                ],
              },
              {
                type: "text",
                value:
                  ": 공격자는 인증되지 않은 상태에서 서버에 임의의 코드를 실행(RCE)할 수 있습니다. 즉, 서버 탈취가 가능합니다.",
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
        value: "추가 발견된 이슈들",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "React2Shell 외에도 몇 가지 관련 취약점이 함께 보고되었습니다:",
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
                    value: "CVE-2025-55184 (DoS)",
                  },
                ],
              },
              {
                type: "text",
                value:
                  ": 특수하게 조작된 요청으로 서버를 무한 재귀 상태에 빠뜨려 다운시킬 수 있음.",
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
                    value: "CVE-2025-55183 (Info Leak)",
                  },
                ],
              },
              {
                type: "text",
                value: ": 서버의 소스 코드가 노출될 수 있는 위험.",
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
    depth: 2,
    children: [
      {
        type: "text",
        value: "🛡️ 해결 방법: 즉시 업데이트 필요",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "이 문제는 코드 수정만으로는 해결하기 어려우며, 프레임워크 차원의 패치가 필수적입니다. 현재 사용 중인 React 및 Next.js 버전을 확인하고 즉시 업데이트해야 합니다.",
      },
    ],
  },
  {
    type: "heading",
    depth: 3,
    children: [
      {
        type: "text",
        value: "영향을 받는 버전",
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
                    value: "React",
                  },
                ],
              },
              {
                type: "text",
                value: ": 19.0.0 ~ 19.2.1",
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
                    value: "Next.js",
                  },
                ],
              },
              {
                type: "text",
                value: ": 15.x, 16.x (App Router 사용 시)",
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
        value: "권장 패치 버전",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "최소한 아래 버전 이상으로 업그레이드해야 안전합니다.",
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
                    value: "React",
                  },
                ],
              },
              {
                type: "text",
                value: ": ",
              },
              {
                type: "inlineCode",
                value: "19.0.3",
              },
              {
                type: "text",
                value: ", ",
              },
              {
                type: "inlineCode",
                value: "19.1.4",
              },
              {
                type: "text",
                value: ", ",
              },
              {
                type: "inlineCode",
                value: "19.2.3",
              },
              {
                type: "text",
                value: " 이상",
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
                    value: "Next.js",
                  },
                ],
              },
              {
                type: "text",
                value: ": 최신 패치 버전 (예: ",
              },
              {
                type: "inlineCode",
                value: "15.1.7",
              },
              {
                type: "text",
                value: " 이상)",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    type: "code",
    language: "bash",
    value:
      "# npm 사용 시\nnpm install react@latest react-dom@latest next@latest\n\n# yarn 사용 시\nyarn add react@latest react-dom@latest next@latest",
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
        value: "🔒 React Server Actions 보안 모범 사례",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "Server Actions는 서버 함수를 클라이언트에서 직접 호출할 수 있게 해주는 강력한 기능이지만, 잘못 사용하면 보안 구멍이 될 수 있습니다.",
      },
    ],
  },
  {
    type: "heading",
    depth: 3,
    children: [
      {
        type: "text",
        value: '1. "공개 API 엔드포인트"로 취급하라',
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "Server Action 함수는 내부 함수처럼 보이지만, 실제로는 ",
      },
      {
        type: "strong",
        children: [
          {
            type: "text",
            value: "공개된 HTTP API 엔드포인트",
          },
        ],
      },
      {
        type: "text",
        value: "와 같습니다. 누구나 URL을 통해 요청을 보낼 수 있다는 점을 명심해야 합니다.",
      },
    ],
  },
  {
    type: "heading",
    depth: 3,
    children: [
      {
        type: "text",
        value: "2. 인증 및 인가(Authentication & Authorization) 필수",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "모든 Server Action의 최상단에서 사용자 권한을 검증해야 합니다.",
      },
    ],
  },
  {
    type: "code",
    language: "typescript",
    value:
      '"use server";\n\nimport { getUser } from "@/lib/auth";\n\nexport async function updateProfile(data: FormData) {\n  const user = await getUser();\n\n  // 1. 인증 확인\n  if (!user) {\n    throw new Error("Unauthorized");\n  }\n\n  // 2. 권한 확인 (예: 본인만 수정 가능)\n  if (user.role !== "ADMIN") {\n    throw new Error("Forbidden");\n  }\n\n  // 로직 수행...\n}',
  },
  {
    type: "heading",
    depth: 3,
    children: [
      {
        type: "text",
        value: "3. 철저한 입력 검증 (Input Validation)",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "클라이언트 측 검증을 믿지 마세요. 서버로 들어오는 모든 데이터는 오염되었다고 가정하고 검증해야 합니다. ",
      },
      {
        type: "inlineCode",
        value: "zod",
      },
      {
        type: "text",
        value: "와 같은 라이브러리를 사용하면 효과적입니다.",
      },
    ],
  },
  {
    type: "code",
    language: "typescript",
    value:
      'import { z } from "zod";\n\nconst schema = z.object({\n  email: z.string().email(),\n  age: z.number().min(18),\n});\n\nexport async function signup(formData: FormData) {\n  const parsed = schema.safeParse({\n    email: formData.get("email"),\n    age: Number(formData.get("age")),\n  });\n\n  if (!parsed.success) {\n    return { error: "잘못된 입력입니다." };\n  }\n\n  // ...\n}',
  },
  {
    type: "heading",
    depth: 3,
    children: [
      {
        type: "text",
        value: "4. 민감 정보 노출 금지",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "Server Action은 실행 결과를 클라이언트로 반환할 수 있으므로, DB 접속 정보나 내부 키 값이 포함된 객체를 그대로 리턴하지 않도록 주의해야 합니다. 필요한 데이터만 담은 DTO(Data Transfer Object)를 반환하는 것이 좋습니다.",
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
        value: "마무리",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "보안 취약점은 언제든 발견될 수 있습니다. 가장 중요한 것은 ",
      },
      {
        type: "strong",
        children: [
          {
            type: "text",
            value: "신속한 대응",
          },
        ],
      },
      {
        type: "text",
        value: "입니다. 프로젝트의 의존성을 주기적으로 점검하고(",
      },
      {
        type: "inlineCode",
        value: "npm audit",
      },
      {
        type: "text",
        value: "), 보안 공지에 귀를 기울여 안전한 서비스를 만들어 갑시다.",
      },
    ],
  },
] satisfies PostDocumentNode[];

const DevReactNextjsSecurity2025Post = () => {
  return <BlogPostDocument nodes={nodes} />;
};

export default DevReactNextjsSecurity2025Post;
