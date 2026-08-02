import {
  PostCodeBlock,
  PostHeading1,
  PostHeading2,
  PostListItem,
  PostParagraph,
  PostUnorderedList,
} from "@/components/blog/blog-post-elements";

const DevTypescriptExpressLogin3Post = () => {
  return (
    <>
      <PostHeading1>
        TypeScript와 Express-session으로 로그인 처리하기 (3): 로그인 유지와 로그아웃
      </PostHeading1>
      <PostParagraph>
        로그인 유지 기능은 인증을 대신하지 않습니다. 비밀번호 검증과 세션 재발급이 성공한 뒤에만
        사용자의 선택에 따라 세션 수명을 늘리고, 로그아웃 때는 서버 저장소의 세션까지 파기해야
        합니다.
      </PostParagraph>
      <PostHeading2>remember-me 수명 설정</PostHeading2>
      <PostCodeBlock
        code={
          "const fourteenDaysInMs = 14 * 24 * 60 * 60 * 1000;\n\nreq.session.cookie.maxAge = isRemember\n  ? fourteenDaysInMs\n  : undefined;"
        }
        language={"typescript"}
      />
      <PostParagraph>
        express-session의 cookie.maxAge 단위는 밀리초입니다. 로그인 유지 체크 값은 클라이언트가
        보내더라도, 계정의 위험도·기기 신뢰도·조직 정책에 따라 서버가 최대 수명을 제한해야 합니다.
      </PostParagraph>
      <PostHeading2>로그아웃은 쿠키와 서버 세션을 함께 지운다</PostHeading2>
      <PostCodeBlock
        code={
          'router.post("/logout", (req, res, next) => {\n  return req.session.destroy(error => {\n    if (error) return next(error);\n\n    res.clearCookie("sid");\n    return res.status(204).end();\n  });\n});'
        }
        language={"typescript"}
      />
      <PostParagraph>
        브라우저 쿠키만 지우면 서버 저장소의 세션은 남을 수 있습니다. 비밀번호 변경, 계정 비활성화,
        의심스러운 로그인 대응에서도 해당 사용자의 활성 세션을 폐기하는 정책을 마련하세요.
      </PostParagraph>
      <PostHeading2>점검 목록</PostHeading2>
      <PostUnorderedList>
        <PostListItem>
          <PostParagraph>운영 환경은 HTTPS와 secure cookie를 사용한다.</PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>세션 ID는 로그인 성공 시 재발급한다.</PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>
            만료·로그아웃·비밀번호 변경 시 서버 저장소의 세션도 제거한다.
          </PostParagraph>
        </PostListItem>
      </PostUnorderedList>
    </>
  );
};

export default DevTypescriptExpressLogin3Post;
