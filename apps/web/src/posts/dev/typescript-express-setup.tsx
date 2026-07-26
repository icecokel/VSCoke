import { BlogPostDocument, type PostDocumentNode } from "@/components/blog/blog-post-document";

const nodes = [
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "이 글은 2021년 설정 기록을 현재 개발 환경에 맞춰 정리한 버전입니다. Node.js는 지원 중인 LTS 버전을 사용하고, 개발 서버는 ts-node·nodemon 대신 tsx로 실행합니다.",
      },
    ],
  },
  {
    type: "heading",
    depth: 2,
    children: [{ type: "text", value: "1. 프로젝트와 의존성 만들기" }],
  },
  {
    type: "code",
    language: "bash",
    value:
      "mkdir my-express-api\\ncd my-express-api\\nnpm init -y\\nnpm install express\\nnpm install -D typescript tsx @types/express @types/node\\nnpx tsc --init",
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "전역으로 nodemon을 설치할 필요는 없습니다. 프로젝트 안의 tsx를 사용하면 팀원과 CI에서도 같은 실행 방식을 유지할 수 있습니다.",
      },
    ],
  },
  {
    type: "heading",
    depth: 2,
    children: [{ type: "text", value: "2. TypeScript와 실행 스크립트 설정" }],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "tsconfig.json은 Node.js 모듈 해석에 맞춰 설정하고, package.json에는 개발·빌드·실행 명령을 분리합니다.",
      },
    ],
  },
  {
    type: "code",
    language: "json",
    value:
      '{\\n  "compilerOptions": {\\n    "target": "ES2022",\\n    "module": "NodeNext",\\n    "moduleResolution": "NodeNext",\\n    "outDir": "dist",\\n    "strict": true,\\n    "esModuleInterop": true,\\n    "skipLibCheck": true\\n  },\\n  "include": ["src"]\\n}',
  },
  {
    type: "code",
    language: "json",
    value:
      '{\\n  "scripts": {\\n    "dev": "tsx watch src/server.ts",\\n    "build": "tsc",\\n    "start": "node dist/server.js"\\n  }\\n}',
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "PowerShell의 실행 정책을 완화해서 해결하는 방식은 권장하지 않습니다. npm 또는 npx 실행이 막힌다면 지원 중인 Node.js LTS를 다시 설치하고 새 터미널을 열어 PATH를 확인하세요.",
      },
    ],
  },
  {
    type: "heading",
    depth: 2,
    children: [{ type: "text", value: "3. Express 서버 작성" }],
  },
  {
    type: "code",
    language: "ts",
    value:
      'import express from "express";\\n\\nconst app = express();\\nconst port = Number(process.env.PORT ?? 3000);\\n\\napp.get("/", (_request, response) => {\\n  response.json({ ok: true });\\n});\\n\\napp.listen(port, () => {\\n  console.log("Server listening on port " + port);\\n});',
  },
  {
    type: "code",
    language: "bash",
    value: "npm run dev",
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "브라우저나 curl로 http://localhost:3000에 요청해 { ok: true } 응답을 확인합니다. 배포 전에는 npm run build로 타입 검사와 JavaScript 출력이 모두 성공하는지 확인하세요.",
      },
    ],
  },
  {
    type: "heading",
    depth: 2,
    children: [{ type: "text", value: "확인 목록" }],
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
            children: [{ type: "text", value: "지원 중인 Node.js LTS를 사용한다." }],
          },
        ],
      },
      {
        type: "listItem",
        children: [
          {
            type: "paragraph",
            children: [{ type: "text", value: "개발 의존성은 프로젝트에만 설치한다." }],
          },
        ],
      },
      {
        type: "listItem",
        children: [
          {
            type: "paragraph",
            children: [{ type: "text", value: "운영 환경에서는 PORT를 환경 변수로 주입한다." }],
          },
        ],
      },
    ],
  },
] satisfies PostDocumentNode[];

const DevTypescriptExpressSetupPost = () => {
  return <BlogPostDocument nodes={nodes} />;
};

export default DevTypescriptExpressSetupPost;
