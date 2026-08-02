import {
  PostCodeBlock,
  PostHeading1,
  PostHeading2,
  PostInlineCode,
  PostListItem,
  PostParagraph,
  PostUnorderedList,
} from "@/components/blog/blog-post-elements";

const DevTypescriptExpressLogin1Post = () => {
  return (
    <>
      <PostHeading1>
        TypeScript와 Express-session으로 로그인 처리하기 (1): 안전한 세션 설정
      </PostHeading1>
      <PostParagraph>
        세션은 로그인 여부를 저장하는 편의 기능이 아니라 인증 경계입니다. 개발 서버에서 보였던 기본
        설정을 운영 환경에 그대로 두면 세션 탈취, 불필요한 쿠키 발급, 서버 재시작 시 로그인 손실
        같은 문제가 생길 수 있습니다.
      </PostParagraph>
      <PostHeading2>세션 저장소와 비밀값</PostHeading2>
      <PostParagraph>
        기본 MemoryStore는 개발 확인용입니다. 운영에서는 Redis 또는 데이터베이스 기반 저장소를
        사용하고, SESSION_SECRET은 코드가 아니라 환경 변수 또는 비밀 관리 도구에서 공급하세요.
      </PostParagraph>
      <PostCodeBlock
        code={
          'import session from "express-session";\n\nconst sessionSecret = process.env.SESSION_SECRET;\nif (!sessionSecret) {\n  throw new Error("SESSION_SECRET is required");\n}\n\nconst isProduction = process.env.NODE_ENV === "production";\n\napp.use(\n  session({\n    name: "sid",\n    secret: sessionSecret,\n    resave: false,\n    saveUninitialized: false,\n    store: sessionStore,\n    cookie: {\n      httpOnly: true,\n      sameSite: "lax",\n      secure: isProduction,\n      maxAge: 1000 * 60 * 60 * 8,\n    },\n  }),\n);'
        }
        language={"typescript"}
      />
      <PostUnorderedList>
        <PostListItem>
          <PostParagraph>
            <PostInlineCode>saveUninitialized: false</PostInlineCode>는 로그인 전의 빈 세션 쿠키를
            만들지 않습니다.
          </PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>
            <PostInlineCode>httpOnly</PostInlineCode>
            {"는 클라이언트 JavaScript의 쿠키 접근을 막고, "}
            <PostInlineCode>sameSite</PostInlineCode>는 CSRF 위험을 낮춥니다.
          </PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>
            <PostInlineCode>secure: true</PostInlineCode>는 HTTPS에서만 사용해야 합니다. TLS 종료
            프록시 뒤라면 Express trust proxy 설정도 함께 검토하세요.
          </PostParagraph>
        </PostListItem>
      </PostUnorderedList>
      <PostHeading2>세션에 저장할 값</PostHeading2>
      <PostParagraph>
        세션에는 이메일, 닉네임, 권한 목록처럼 클라이언트가 보낸 프로필 전체를 저장하지 말고 검증된
        최소 식별자만 저장하세요. 다음 편에서 비밀번호 검증 후 세션 ID를 재발급하는 흐름을 다룹니다.
      </PostParagraph>
      <PostCodeBlock
        code={
          'declare module "express-session" {\n  interface SessionData {\n    userId?: string;\n  }\n}'
        }
        language={"typescript"}
      />
    </>
  );
};

export default DevTypescriptExpressLogin1Post;
