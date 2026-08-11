import {
  PostCodeBlock,
  PostHeading1,
  PostHeading2,
  PostListItem,
  PostParagraph,
  PostUnorderedList,
} from "@/components/blog/blog-post-elements";
import { MermaidDiagram } from "@/components/blog/mermaid-diagram";

const DevTypescriptExpressLogin2Post = () => {
  return (
    <>
      <PostHeading1>
        TypeScript와 Express-session으로 로그인 처리하기 (2): 인증 뒤 세션 발급
      </PostHeading1>
      <PostParagraph>
        요청 본문에 이메일이나 닉네임이 들어 있다고 로그인된 사용자가 되는 것은 아닙니다. 서버는
        저장된 비밀번호 해시를 검증한 뒤에만 세션을 만들고, 기존 세션 ID를 새 ID로 교체해야 합니다.
      </PostParagraph>
      <PostHeading2>검증과 세션 재발급</PostHeading2>
      <PostCodeBlock
        code={
          'router.post("/login", async (req, res, next) => {\n  const { email, password } = req.body;\n  const account = await accountRepository.findByEmail(email);\n  const isPasswordValid = account\n    ? await passwordHasher.verify(account.passwordHash, password)\n    : false;\n\n  if (!isPasswordValid) {\n    return res.status(401).send({ error: "invalid_credentials" });\n  }\n\n  return req.session.regenerate(error => {\n    if (error) return next(error);\n\n    req.session.userId = account.id;\n    return req.session.save(saveError => {\n      if (saveError) return next(saveError);\n      return res.send({ result: true });\n    });\n  });\n});'
        }
        language={"typescript"}
      />
      <MermaidDiagram
        chart={
          "sequenceDiagram\n  participant user as 사용자\n  participant api as POST /login\n  participant account as account repository\n  participant session as session store\n  user->>api: email과 password\n  api->>account: findByEmail\n  account-->>api: account와 password hash\n  api->>api: password hash 검증\n  alt 인증 실패\n    api-->>user: 401 invalid_credentials\n  else 인증 성공\n    api->>session: session ID 재발급\n    session-->>api: 새 session\n    api->>session: userId 저장\n    session-->>api: 저장 완료\n    api-->>user: result true\n  end"
        }
        description="로그인 요청의 계정 조회와 비밀번호 검증, 인증 실패 응답 또는 세션 재발급 후 성공 응답 흐름"
      />
      <PostParagraph>
        세션 재발급은 로그인 전에 공격자가 고정해 둔 세션 ID를 로그인 뒤에도 이어 쓰는 세션 고정
        공격을 막는 핵심 단계입니다. 실패 응답은 계정 존재 여부를 구분하지 않아야 하며, 비밀번호
        원문은 로그나 세션에 저장하지 않습니다.
      </PostParagraph>
      <PostHeading2>추가로 확인할 항목</PostHeading2>
      <PostUnorderedList>
        <PostListItem>
          <PostParagraph>
            비밀번호는 Argon2 또는 bcrypt 같은 검증된 해시 알고리즘으로 저장합니다.
          </PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>로그인 API에는 요청 횟수 제한과 감사 로그를 추가합니다.</PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>
            권한은 세션 생성 시점만이 아니라 권한이 필요한 요청마다 서버에서 확인합니다.
          </PostParagraph>
        </PostListItem>
      </PostUnorderedList>
    </>
  );
};

export default DevTypescriptExpressLogin2Post;
