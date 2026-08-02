import {
  PostCodeBlock,
  PostHeading3,
  PostHorizontalRule,
  PostLink,
  PostListItem,
  PostOrderedList,
  PostParagraph,
  PostStrong,
} from "@/components/blog/blog-post-elements";

const DevJavascriptLastDayOfMonthPost = () => {
  return (
    <>
      <PostParagraph>
        안녕하세요. 요즘 급하게 다른 회사에서 진행하던 프로젝트를 받아서, 거의 마무리
        되어가고있는데, 매달의 마지막날 계산하는 방법을 배열로 정리해놓은것을 확인했습니다. 더 쉽게
        계산할 방법이 있는데, 모르시는 분들이 있을 수 있겠다 싶어서, 공유하고자 합니다. 그래서
        오늘은 매달의 마지막날을 구하는 방법에 대해서 포스팅을 해보겠습니다.
      </PostParagraph>
      <PostHorizontalRule />
      <PostOrderedList start={1}>
        <PostListItem>
          <PostParagraph>
            <PostStrong>매달 마지막 날 계산</PostStrong>
          </PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>
            <PostStrong>코드 설명</PostStrong>
          </PostParagraph>
        </PostListItem>
      </PostOrderedList>
      <PostHorizontalRule />
      <PostHeading3>
        <PostStrong>1. 매달 마지막 날 계산 (JavaScript 코드)</PostStrong>
      </PostHeading3>
      <PostParagraph>
        {"See the Pen "}
        <PostLink href={"https://codepen.io/icecokel/pen/rNdNPML"}>Untitled</PostLink>
        {" by icecokel ("}
        <PostLink href={"https://codepen.io/icecokel"}>@icecokel</PostLink>
        {") on "}
        <PostLink href={"https://codepen.io"}>CodePen</PostLink>.
      </PostParagraph>
      <PostHorizontalRule />
      <PostHeading3>
        <PostStrong>2. 코드설명</PostStrong>
      </PostHeading3>
      <PostParagraph>
        코드 설명이랄게 없이 간단한 코드라 짧겠지만, 설명을 드려보겠습니다.
        <br />
        머릿글에서 말했던것 처럼 배열로 마지막날을 가지고 다닌다면, 윤달 계산처럼 특이 케이스 경우를
        예외로 걸어야합니다.
        <br />
        소스가 위에 작성된 JS 코드에 비하면 꽤나 지저분해 보일수 있습니다.
      </PostParagraph>
      <PostParagraph>
        {"하지만 new Date를 선언할때 0을 매개변수로 주면, 알아서 Date에서 마지막 날을 계산해주죠. "}
        <br />
        앞서 기재한 윤달 계산도 알아서 진행되고 코드도 간결해집니다.
      </PostParagraph>
      <PostCodeBlock
        code={
          "const getLastDayFromMonth = (month = 1) => {\n  return new Date(2022,month,0).getDate();   <== 이쪽부분\n}"
        }
      />
      <PostHorizontalRule />
      <PostParagraph>
        생각보다 간단한 방법인데 의외로 모르는 분들이 있는듯 보여서, 간단하게 계산할수 있는 방법을
        포스팅해봅니다. 개발 처음 공부할때 알고리즘으로 윤달 계산하는 방법을 이용해서 다들 검색
        않고, 코딩하시겠지만, 때로는 내 머리보다 자체 제공되는 기능을 활용하는것이 나에게도
        시스템에게도 안정적일 수 있습니다.
      </PostParagraph>
    </>
  );
};

export default DevJavascriptLastDayOfMonthPost;
