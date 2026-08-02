import {
  PostBlockquote,
  PostCodeBlock,
  PostHeading1,
  PostHeading2,
  PostHeading3,
  PostHorizontalRule,
  PostInlineCode,
  PostListItem,
  PostOrderedList,
  PostParagraph,
  PostStrong,
} from "@/components/blog/blog-post-elements";

const DevGitBasicCommandsPost = () => {
  return (
    <>
      <PostHeading1>Git 기본 명령어: 작업 흐름 마스터하기</PostHeading1>
      <PostParagraph>
        {"개발자라면 피할 수 없는 도구, "}
        <PostStrong>Git</PostStrong>
        {
          ".\n복잡해 보이지만 사실 우리가 매일 사용하는 명령어는 정해져 있습니다.\n이번 글에서는 작업 영역 관리를 위한 핵심 명령어들을 살펴보겠습니다."
        }
      </PostParagraph>
      <PostHeading2>
        {"1. 저장소 시작하기: "}
        <PostInlineCode>git init</PostInlineCode>
        {" & "}
        <PostInlineCode>git clone</PostInlineCode>
      </PostHeading2>
      <PostParagraph>모든 프로젝트의 시작입니다.</PostParagraph>
      <PostHeading3>
        <PostInlineCode>git init</PostInlineCode>
      </PostHeading3>
      <PostParagraph>현재 디렉토리를 새로운 Git 저장소로 만듭니다.</PostParagraph>
      <PostCodeBlock code={"git init"} language={"bash"} />
      <PostHeading3>
        <PostInlineCode>git clone</PostInlineCode>
      </PostHeading3>
      <PostParagraph>이미 존재하는 원격 저장소를 내 컴퓨터로 가져옵니다.</PostParagraph>
      <PostCodeBlock code={"git clone <repository-url>"} language={"bash"} />
      <PostHeading2>
        {"2. 상태 확인: "}
        <PostInlineCode>git status</PostInlineCode>
      </PostHeading2>
      <PostParagraph>
        {
          "현재 내 작업 공간의 상태를 확인하는 가장 중요한 명령어입니다.\n어떤 파일이 수정되었는지, 어떤 파일이 스테이징(Staging) 영역에 올라갔는지 알 수 있습니다."
        }
      </PostParagraph>
      <PostCodeBlock code={"git status"} language={"bash"} />
      <PostBlockquote>
        <PostParagraph>
          <PostStrong>Tip:</PostStrong>
          {" 습관적으로 "}
          <PostInlineCode>git status</PostInlineCode>를 입력하는 것이 실수를 줄이는 지름길입니다.
        </PostParagraph>
      </PostBlockquote>
      <PostHeading2>
        {"3. 변경 사항 저장: "}
        <PostInlineCode>git add</PostInlineCode>
        {" & "}
        <PostInlineCode>git commit</PostInlineCode>
      </PostHeading2>
      <PostHeading3>
        <PostInlineCode>git add</PostInlineCode>
      </PostHeading3>
      <PostParagraph>
        작업한 파일을 스테이징 영역(Staging Area)으로 올립니다. 커밋할 준비를 하는 과정입니다.
      </PostParagraph>
      <PostCodeBlock
        code={"# 특정 파일만 추가\ngit add filename.txt\n\n# 모든 변경 사항 추가\ngit add ."}
        language={"bash"}
      />
      <PostHeading3>
        <PostInlineCode>git commit</PostInlineCode>
      </PostHeading3>
      <PostParagraph>
        {"스테이징 된 변경 사항을 확정하여 기록(스냅샷)으로 남깁니다.\n"}
        <PostStrong>의미 있는 메시지</PostStrong>를 남기는 것이 협업의 에티켓입니다.
      </PostParagraph>
      <PostCodeBlock code={'git commit -m "feat: 로그인 기능 구현 완료"'} language={"bash"} />
      <PostHeading2>
        {"4. 원격 저장소와 동기화: "}
        <PostInlineCode>git pull</PostInlineCode>
        {" & "}
        <PostInlineCode>git push</PostInlineCode>
      </PostHeading2>
      <PostHeading3>
        <PostInlineCode>git pull</PostInlineCode>
      </PostHeading3>
      <PostParagraph>
        {
          "원격 저장소의 최신 변경 내용을 가져와 내 로컬 저장소와 합칩니다.\n작업을 시작하기 전에 항상 먼저 실행하는 습관을 들이세요."
        }
      </PostParagraph>
      <PostCodeBlock code={"git pull origin main"} language={"bash"} />
      <PostHeading3>
        <PostInlineCode>git push</PostInlineCode>
      </PostHeading3>
      <PostParagraph>로컬에서 커밋한 내용을 원격 저장소에 업로드합니다.</PostParagraph>
      <PostCodeBlock code={"git push origin main"} language={"bash"} />
      <PostHorizontalRule />
      <PostHeading2>요약</PostHeading2>
      <PostOrderedList start={1}>
        <PostListItem>
          <PostParagraph>
            <PostInlineCode>git init</PostInlineCode>
            {" / "}
            <PostInlineCode>git clone</PostInlineCode>: 시작
          </PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>
            <PostInlineCode>git status</PostInlineCode>: 확인
          </PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>
            <PostInlineCode>git add</PostInlineCode>: 준비
          </PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>
            <PostInlineCode>git commit</PostInlineCode>: 저장
          </PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>
            <PostInlineCode>git pull</PostInlineCode>: 가져오기
          </PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>
            <PostInlineCode>git push</PostInlineCode>: 보내기
          </PostParagraph>
        </PostListItem>
      </PostOrderedList>
      <PostParagraph>
        {"이 흐름만 익혀도 Git 사용의 80%는 해결됩니다.\n다음 글에서는 협업의 꽃인 "}
        <PostStrong>브랜치(Branch)</PostStrong>
        {" 관련 명령어에 대해 알아보겠습니다."}
      </PostParagraph>
    </>
  );
};

export default DevGitBasicCommandsPost;
