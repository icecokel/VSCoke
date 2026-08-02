import {
  PostBlockquote,
  PostCodeBlock,
  PostHeading1,
  PostHeading2,
  PostHeading3,
  PostInlineCode,
  PostListItem,
  PostOrderedList,
  PostParagraph,
  PostStrong,
} from "@/components/blog/blog-post-elements";

const DevGitBranchCommandsPost = () => {
  return (
    <>
      <PostHeading1>Git 브랜치 전략: 협업을 위한 필수 명령어</PostHeading1>
      <PostParagraph>
        {
          "Git의 진가는 **브랜치(Branch)**를 사용할 때 발휘됩니다.\n독립적인 작업 공간을 만들고, 안전하게 코드를 실험하고, 동료와 협업하는 방법을 알아봅시다."
        }
      </PostParagraph>
      <PostHeading2>
        {"1. 브랜치 생성과 조회: "}
        <PostInlineCode>git branch</PostInlineCode>
      </PostHeading2>
      <PostHeading3>현재 브랜치 확인</PostHeading3>
      <PostCodeBlock code={"git branch"} language={"bash"} />
      <PostHeading3>새로운 브랜치 생성</PostHeading3>
      <PostCodeBlock code={"git branch feature/login"} language={"bash"} />
      <PostBlockquote>
        <PostParagraph>
          <PostStrong>Naming Rule:</PostStrong>
          {" 보통 "}
          <PostInlineCode>feature/기능명</PostInlineCode>
          {", "}
          <PostInlineCode>fix/버그명</PostInlineCode>과 같은 규칙을 사용합니다.
        </PostParagraph>
      </PostBlockquote>
      <PostHeading2>
        {"2. 브랜치 이동: "}
        <PostInlineCode>git switch</PostInlineCode>
        {" (또는 "}
        <PostInlineCode>git checkout</PostInlineCode>)
      </PostHeading2>
      <PostParagraph>
        {"새로 만든 작업 공간(브랜치)으로 이동합니다.\n"}
        <PostInlineCode>checkout</PostInlineCode>
        {"은 옛날 방식이고, 최근에는 명확한 의미의 "}
        <PostInlineCode>switch</PostInlineCode>를 권장합니다.
      </PostParagraph>
      <PostCodeBlock
        code={"# 최신 방식\ngit switch feature/login\n\n# 구 방식\ngit checkout feature/login"}
        language={"bash"}
      />
      <PostHeading2>
        {"3. 브랜치 병합: "}
        <PostInlineCode>git merge</PostInlineCode>
      </PostHeading2>
      <PostParagraph>
        {"작업이 끝난 브랜치를 메인 브랜치와 합칠 때 사용합니다.\n보통 "}
        <PostInlineCode>main</PostInlineCode>
        {" 브랜치로 이동한 후, 작업한 브랜치를 끌어와서 합칩니다."}
      </PostParagraph>
      <PostCodeBlock
        code={
          "# 1. 메인 브랜치로 이동\ngit switch main\n\n# 2. 작업한 브랜치 내용 합치기\ngit merge feature/login"
        }
        language={"bash"}
      />
      <PostBlockquote>
        <PostParagraph>
          <PostStrong>Note:</PostStrong>
          {
            " 병합 과정에서 충돌(Conflict)이 발생할 수 있습니다. 당황하지 말고 코드를 수정한 후 다시 add, commit 하면 됩니다."
          }
        </PostParagraph>
      </PostBlockquote>
      <PostHeading2>
        {"4. 히스토리 확인: "}
        <PostInlineCode>git log</PostInlineCode>
      </PostHeading2>
      <PostParagraph>
        프로젝트의 변경 기록을 그래프 형태로 확인하면 흐름을 이해하기 쉽습니다.
      </PostParagraph>
      <PostCodeBlock
        code={"# 한 줄로 그래프와 함께 보기\ngit log --oneline --graph --all --decorate"}
        language={"bash"}
      />
      <PostHeading2>협업 시나리오 요약</PostHeading2>
      <PostOrderedList start={1}>
        <PostListItem>
          <PostParagraph>
            <PostInlineCode>git pull origin main</PostInlineCode>: 최신 코드 받기
          </PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>
            <PostInlineCode>git branch feature/new-page</PostInlineCode>: 작업 브랜치 생성
          </PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>
            <PostInlineCode>git switch feature/new-page</PostInlineCode>: 브랜치 이동
          </PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>
            <PostInlineCode>(작업 진행)</PostInlineCode>
            {" -> "}
            <PostInlineCode>git add</PostInlineCode>
            {" -> "}
            <PostInlineCode>git commit</PostInlineCode>
          </PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>
            <PostInlineCode>git push origin feature/new-page</PostInlineCode>: 작업 내용 공유
          </PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>(GitHub 등에서 Pull Request 생성 및 머지)</PostParagraph>
        </PostListItem>
      </PostOrderedList>
      <PostParagraph>이제 브랜치를 두려워하지 말고 자유롭게 활용해보세요!</PostParagraph>
    </>
  );
};

export default DevGitBranchCommandsPost;
