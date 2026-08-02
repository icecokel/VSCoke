import {
  PostEmphasis,
  PostHeading1,
  PostHeading2,
  PostImage,
  PostInlineCode,
  PostListItem,
  PostOrderedList,
  PostParagraph,
  PostStrong,
  PostUnorderedList,
} from "@/components/blog/blog-post-elements";

const JournalJourneyToIncreaseGameUsersPost = () => {
  return (
    <>
      <PostHeading1>게임 유저를 늘리기위한 여정</PostHeading1>
      <PostParagraph>
        {
          '단순히 "게임을 만들었다"에서 끝나는 것이 아니라, **"사람들이 이 게임을 어떻게 공유하고 즐길까?"**를 고민하며 기능을 붙여나간 과정입니다.\n(그리고 그 과정에서 마주친 수많은 버그와 삽질의 기록이기도 합니다.)'
        }
      </PostParagraph>
      <PostHeading2>1. &quot;자랑하기&quot;와 &quot;이미지 다운로드&quot; 개발</PostHeading2>
      <PostParagraph>
        {
          "게임의 핵심 바이럴 요소는 **'점수 자랑'**이라고 생각했습니다.\n그래서 게임 오버 화면에 두 가지 핵심 기능을 넣었습니다."
        }
      </PostParagraph>
      <PostOrderedList start={1}>
        <PostListItem>
          <PostParagraph>
            <PostStrong>이미지 저장</PostStrong>
            {": 처음엔 "}
            <PostInlineCode>html2canvas</PostInlineCode>
            {"를 썼지만, 그라데이션과 텍스트 그림자가 깨지는 문제가 있어 "}
            <PostInlineCode>html-to-image</PostInlineCode>로 교체했습니다.
          </PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>
            <PostStrong>공유하기</PostStrong>: Web Share API를 사용해 친구들에게 바로 링크 보내기.
          </PostParagraph>
        </PostListItem>
      </PostOrderedList>
      <PostParagraph>
        여기까지는 정말 순조로웠습니다. (라이브러리 교체라는 작은 소동만 빼면요) &quot;와, 이제
        공유도 되니까 유저가 늘겠지?&quot;라고 생각했죠.
      </PostParagraph>
      <PostHeading2>2. 첫 번째 난관: 게임이 다시 시작되지 않는다?</PostHeading2>
      <PostParagraph>
        {"QA(라고 쓰고 혼자 테스트라고 읽음)를 하던 중 치명적인 문제를 발견했습니다.\n"}
        <PostStrong>&quot;다시 하기&quot; 버튼을 눌렀는데 게임이 멈춰버리는 현상.</PostStrong>
      </PostParagraph>
      <PostParagraph>
        원인은 **React와 Phaser 엔진 사이의 타이밍 미스매치(Race Condition)**였습니다.
      </PostParagraph>
      <PostUnorderedList>
        <PostListItem>
          <PostParagraph>
            {"React 컴포넌트는 재빠르게 재렌더링되며 "}
            <PostInlineCode>game:start</PostInlineCode>
            {" 이벤트를 쐈고,"}
          </PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>
            Phaser 게임 인스턴스는 아직 리소스를 로딩 중이라 그 신호를 듣지 못했습니다.
          </PostParagraph>
        </PostListItem>
      </PostUnorderedList>
      <PostParagraph>
        결국 &quot;야, 너 준비 됐어?&quot;를 확인하는 절차(<PostInlineCode>isLoaded</PostInlineCode>
        {" 체크)를 추가하고 나서야 게임이 정상적으로 돌아가기 시작했습니다."}
      </PostParagraph>
      <PostHeading2>3. OG(Open Graph) 이미지 추가: &quot;0점의 악몽&quot;</PostHeading2>
      <PostParagraph>
        {"공유 기능의 화룡점정을 위해 "}
        <PostStrong>Next.js의 OG Image Generation</PostStrong>(
        <PostInlineCode>opengraph-image.tsx</PostInlineCode>
        {")을 도입했습니다.\n카카오톡이나 문자로 링크를 보냈을 때, 밋밋한 텍스트 대신 "}
        <PostStrong>&quot;5200점 달성!&quot;</PostStrong>
        {" 이렇게 이미지가 뜨면 클릭률이 200% 오를 거라 확신했거든요."}
      </PostParagraph>
      <PostParagraph>하지만 현실은...</PostParagraph>
      <PostParagraph>
        <PostImage alt={"0점 이미지"} src={"/images/blog/og-fail.png"} />
        {"\n"}
        <PostEmphasis>(상상도: 모든 공유 이미지에 0점이 찍혀 나가는 상황)</PostEmphasis>
      </PostParagraph>
      <PostParagraph>
        친구에게 &quot;나 5000점 찍었어!&quot; 하고 보냈는데, 정작 썸네일에는
        **&quot;0점&quot;**이라고 박혀있는 상황.
      </PostParagraph>
      <PostHeading2>4. OG 삽질과 대공사</PostHeading2>
      <PostParagraph>
        원인은 Next.js의 파일 기반 메타데이터(<PostInlineCode>opengraph-image.tsx</PostInlineCode>
        {")가 "}
        <PostStrong>
          Query Parameter (<PostInlineCode>?score=5000</PostInlineCode>)를 지원하지 않기 때문
        </PostStrong>
        이었습니다.
      </PostParagraph>
      <PostParagraph>결국 눈물을 머금고 URL 구조 자체를 갈아엎었습니다.</PostParagraph>
      <PostUnorderedList>
        <PostListItem>
          <PostParagraph>
            <PostStrong>Before</PostStrong>
            {": "}
            <PostInlineCode>vscoke.vercel.app/game/sky-drop/share?score=5000</PostInlineCode>
          </PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>
            <PostStrong>After</PostStrong>
            {": "}
            <PostInlineCode>vscoke.vercel.app/game/sky-drop/5000/share</PostInlineCode>
          </PostParagraph>
        </PostListItem>
      </PostUnorderedList>
      <PostParagraph>
        {"점수를 URL 경로(Path)의 일부인 "}
        <PostStrong>Dynamic Route</PostStrong>로 밀어 넣어서, 서버 사이드에서 OG 이미지를 생성할 때
        점수를 확실하게 읽을 수 있도록 만들었습니다.
      </PostParagraph>
      <PostHeading2>5. 끝없는 디자인 욕심</PostHeading2>
      <PostParagraph>
        {
          '기능이 해결되니 이제 "예쁨"이 신경 쓰이기 시작했습니다.\n처음엔 "다양하면 좋겠지!" 하고 10가지 파스텔 톤을 넣었는데, 막상 모바일에서 보니 색깔 구분이 안 되는 대참사가...'
        }
      </PostParagraph>
      <PostParagraph>
        {"결국 다시 "}
        <PostStrong>8가지 고대비(High Contrast) 컬러</PostStrong>로 압축하고, 블록 내부에 진한 이너
        테두리를 추가해서 &quot;누가 봐도 이건 다른 블록이다&quot; 싶게 시인성을 개선했습니다.
      </PostParagraph>
      <PostHeading2>마치며</PostHeading2>
      <PostParagraph>
        {"기능 하나 추가하는 게 이렇게 험난할 줄 몰랐습니다.\n하지만 덕분에 "}
        <PostStrong>타이밍 이슈 핸들링</PostStrong>
        {", "}
        <PostStrong>Next.js의 심화 라우팅</PostStrong>
        {", "}
        <PostStrong>사용자 경험(UX)을 고려한 디자인</PostStrong>까지 깊게 고민해 볼 수 있었던 소중한
        시간이었습니다.
      </PostParagraph>
      <PostParagraph>이제 여러분도 제 삽질의 결과물을 즐겨주세요!</PostParagraph>
    </>
  );
};

export default JournalJourneyToIncreaseGameUsersPost;
