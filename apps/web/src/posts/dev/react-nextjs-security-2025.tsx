import { BlogPostDocument, type PostDocumentNode } from "@/components/blog/blog-post-document";

const nodes = [
  {
    type: "heading",
    depth: 1,
    children: [{ type: "text", value: "React2Shell과 React Server Components 보안 대응" }],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "이 글은 2025년 12월 11일 기준 React Server Components(RSC) 취약점 대응 절차를 정리한 글입니다. 특정 패치 번호를 그대로 복사하기보다, 프로젝트의 현재 버전과 공식 권고 버전을 함께 확인하는 것이 중요합니다.",
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
            children: [{ type: "text", value: "중요" }],
          },
          {
            type: "text",
            value:
              ": RSC 취약점은 애플리케이션 설정만으로 우회할 수 없습니다. 영향을 받는 경우 공식 권고 버전으로 업그레이드해야 합니다.",
          },
        ],
      },
    ],
  },
  {
    type: "heading",
    depth: 2,
    children: [{ type: "text", value: "영향 범위와 후속 공지" }],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "CVE-2025-55182(React2Shell)는 RSC 프로토콜의 원격 코드 실행 위험으로 알려졌습니다. 패치 분석 과정에서 CVE-2025-55183(소스 코드 노출)과 CVE-2025-55184(서비스 거부)도 확인되었습니다.",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "CVE-2025-55184의 최초 수정은 완전하지 않았고, 완전한 서비스 거부 수정은 CVE-2025-67779으로 다시 공지되었습니다. 따라서 과거의 최소 패치 번호만 믿지 말고, Next.js 공식 보안 공지의 최신 권고를 확인해야 합니다.",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "link",
        url: "https://nextjs.org/blog/security-update-2025-12-11",
        title: null,
        children: [{ type: "text", value: "Next.js Security Update: December 11, 2025" }],
      },
    ],
  },
  {
    type: "heading",
    depth: 2,
    children: [{ type: "text", value: "대응 절차" }],
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
                value:
                  "잠금 파일 기준으로 Next.js, React, React DOM의 실제 설치 버전을 확인합니다.",
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
                value: "공식 점검 도구와 보안 공지로 영향을 확인한 뒤 권고 버전으로 올립니다.",
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
                  "업데이트 뒤에는 lint, 타입 검사, 빌드와 핵심 사용자 흐름을 모두 검증합니다.",
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
      "pnpm why next react react-dom\npnpm outdated next react react-dom\n\n# Next.js 공식 점검 도구가 제시하는 권고 버전을 확인하고 반영합니다.\nnpx fix-react2shell-next\n\n# 잠금 파일까지 반영한 뒤 회귀를 확인합니다.\npnpm lint:web\npnpm type:check:web\npnpm build:web",
  },
  {
    type: "heading",
    depth: 2,
    children: [{ type: "text", value: "Server Action 방어선" }],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "의존성 패치는 필수지만, Server Action 자체도 공개 HTTP 입력 경계처럼 다뤄야 합니다. 각 Action에서 인증과 인가를 다시 확인하고, 입력을 서버에서 검증하며, 필요한 데이터만 응답으로 반환하세요.",
      },
    ],
  },
  {
    type: "code",
    language: "typescript",
    value:
      '"use server";\n\nexport const updateProfile = async (formData: FormData) => {\n  const user = await getCurrentUser();\n  if (!user) throw new Error("Unauthorized");\n\n  const input = profileSchema.parse({\n    displayName: formData.get("displayName"),\n  });\n\n  return profileService.update(user.id, input);\n};',
  },
  {
    type: "heading",
    depth: 2,
    children: [{ type: "text", value: "마무리" }],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "보안 공지가 나온 날에는 영향 범위를 추측하지 말고, 공식 권고 버전과 프로젝트의 잠금 파일을 비교하세요. 업데이트와 검증 기록을 남겨 두면 다음 대응도 훨씬 빠르게 할 수 있습니다.",
      },
    ],
  },
] satisfies PostDocumentNode[];

const DevReactNextjsSecurity2025Post = () => {
  return <BlogPostDocument nodes={nodes} />;
};

export default DevReactNextjsSecurity2025Post;
