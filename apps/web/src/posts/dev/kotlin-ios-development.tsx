import { PostLink, PostParagraph } from "@/components/blog/blog-post-elements";

const DevKotlinIosDevelopmentPost = () => {
  return (
    <>
      <PostParagraph>
        Kotlin은 그냥 안드로이드 개발하는 언어 정도, Swift랑 비슷하게 생긴 언어 정도로만 생각했는데,
      </PostParagraph>
      <PostParagraph>
        <PostLink href={"https://kotlinlang.org/docs/reference/native-overview.html"}>
          kotlinlang.org/docs/reference/native-overview.html
        </PostLink>
      </PostParagraph>
      <PostParagraph>{" [Kotlin/Native - Kotlin Programming Language"}</PostParagraph>
      <PostParagraph>
        kotlinlang.org](https:&#47;&#47;kotlinlang.org/docs/reference/native-overview.html)
      </PostParagraph>
      <PostParagraph>
        {"를 보니 ... 다른 부분에서 도 많이 쓰고 있는 듯하다. "}
        <PostLink href={"https://kotlinlang.org/docs/reference/native-overview.html"}>
          kotlinlang.org/docs/reference/native-overview.html
        </PostLink>
      </PostParagraph>
      <PostParagraph>
        이전에 영상 강의에서 일부 백엔드 모듈을 Kotlin으로 제작하고 있다 정도는 들었봤었는데, 굉장히
        흥미로운 사항을 찾은 듯 하다.
      </PostParagraph>
      <PostParagraph>
        이전에 간단하게 Kotlin으로 Android App 작성했던 코드를 찾아서 한번 리프레쉬 해야할 듯 하다.
      </PostParagraph>
    </>
  );
};

export default DevKotlinIosDevelopmentPost;
