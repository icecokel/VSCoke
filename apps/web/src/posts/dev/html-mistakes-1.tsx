import {
  PostBlockquote,
  PostCodeBlock,
  PostHeading3,
  PostHorizontalRule,
  PostImage,
  PostInlineCode,
  PostLink,
  PostListItem,
  PostOrderedList,
  PostParagraph,
  PostStrong,
  PostTable,
  PostTableBody,
  PostTableCell,
  PostTableHead,
  PostTableHeader,
  PostTableRow,
} from "@/components/blog/blog-post-elements";

const DevHtmlMistakes1Post = () => {
  return (
    <>
      <PostParagraph>
        안녕하세요. 저희 회사에서는 개발하면서 Warning과 Error관해 깐깐한 편인데요. 이전 회사와,
        공부할 때는 원하는 기능만 되면, 개발이 완료되었다고 생각했었는데, Warning까지 다 잡아가면서
        개발을 하니, 확실히 배우는 부분이 많습니다. 그래서 오늘은 많지는 않지만, 현재 사이드
        프로젝트를 하면서 보였던 쉽게 놓치고 지나갈 수 있는 실수를 포스팅해보겠습니다.
      </PostParagraph>
      <PostHorizontalRule />
      <PostOrderedList start={1}>
        <PostListItem>
          <PostParagraph>
            <PostStrong>body태그</PostStrong>
          </PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>
            <PostStrong>input:passowrd 태그</PostStrong>
          </PostParagraph>
        </PostListItem>
      </PostOrderedList>
      <PostHorizontalRule />
      <PostHeading3>
        <PostStrong>1. body태그</PostStrong>
      </PostHeading3>
      <PostParagraph>
        {"HTML 시멘틱에 대해서 알고 나서부터 신경 쓰면서 개발을 진행하고 있습니다. "}
        <PostInlineCode>&lt;div&gt;</PostInlineCode>
        {
          " 난사를 막고, 좀 더 가독성 있는 코드를 짜고 싶은 욕심에 개발하고 있는 사이드 프로젝트에서도 적용시키려고 하고 있습니다."
        }
      </PostParagraph>
      <PostCodeBlock
        code={
          " // app.tsx\n\n const app = ()= >{\n\n return (\n    <body>\n    \t<Router>\n\n    ..."
        }
      />
      <PostParagraph>
        {
          "현재 진행하고 있는 사이드 프로젝트에 앞부분입니다. body 태그와 main 태그를 고민하던 도중, 개발 초기 당시에 왜 그렇게 생각했는지 모르겠지만, "
        }
        <PostInlineCode>&lt;body&gt;</PostInlineCode>
        {" 태그로 선정하고 진행을 했습니다. "}
      </PostParagraph>
      <PostImage
        alt={""}
        src={
          "https://blog.kakaocdn.net/dna/bg0RYs/btrdqh9IWyX/AAAAAAAAAAAAAAAAAAAAAJIP7IschJZ_i8UT3-IMTg51P-olg-fq6OYjcytdEsw7/img.jpg?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1767193199&allow_ip=&allow_referer=&signature=xKgqyrgNbFLkgiIR%2FkUh3nkQLHY%3D"
        }
      />
      <PostParagraph>
        {
          "그랬더니 두둥... 개발자 도구 Console 탭에 버젓이 Warning이 떠 있었습니다. 짧은 영어 실력으로 읽어본바. body는 div의 자식이 될 수 없다는 것 같습니다. 저는 위에 "
        }
        <PostInlineCode>&lt;div&gt;</PostInlineCode>
        {"를 잡아 둔 적이 없는데 말이죠. "}
      </PostParagraph>
      <PostParagraph>개발자 도구에서 Elements탭을 보니</PostParagraph>
      <PostCodeBlock code={'<div id="root">\n\t<body>\n\n    ...'} />
      <PostParagraph>
        {
          "제가 선언하지 않은 div가 선언되어있었습니다. 그래서 고민하던 도중, 태그를 변경하기로 했습니다. "
        }
        <PostInlineCode>&lt;main&gt;</PostInlineCode>
        {" 태그로요"}
      </PostParagraph>
      <PostCodeBlock code={"  return (\n    <main>\n    \t<Router>\n\n        ..."} />
      <PostParagraph>
        변경했더니 문제가 사라졌습니다. 변경과 동시에 몇 가지 확인해본 부분이 있어서 같이
        공유드립니다.
      </PostParagraph>
      <PostTable>
        <PostTableHead>
          <PostTableRow>
            <PostTableHeader>
              <PostInlineCode>&lt;body&gt;</PostInlineCode>
            </PostTableHeader>
            <PostTableHeader>
              {"HTML 문서에 단 하나의 "}
              <PostInlineCode>&lt;body&gt;</PostInlineCode>
              {" 요소만 존재 할 수 있습니다."}
              <br />
              브라우저 화면에 보이는 것들이 주로 들어갑니다.
              <br />
              <PostInlineCode>&lt;head&gt;</PostInlineCode>
              {" 태그와 대조적입니다."}
              <br />
              <PostInlineCode>&lt;div&gt;</PostInlineCode>의 자식이 될 수 없습니다.
            </PostTableHeader>
          </PostTableRow>
        </PostTableHead>
        <PostTableBody>
          <PostTableRow>
            <PostTableCell>
              <PostInlineCode>&lt;main&gt;</PostInlineCode>
            </PostTableCell>
            <PostTableCell>
              <PostInlineCode>&lt;body&gt;</PostInlineCode>
              {" 태그 요소의 주된 내용(content)를 정의 할 때 사용합니다."}
              <br />
              {"단 하나의 "}
              <PostInlineCode>&lt;main&gt;</PostInlineCode>
              {" 요소만 존재 할 수 있습니다."}
              <br />
              <PostInlineCode>&lt;header&gt;</PostInlineCode>,
              <PostInlineCode>&lt;nav&gt;</PostInlineCode>
              {", "}
              <PostInlineCode>&lt;aside&gt;</PostInlineCode>,
              <PostInlineCode>&lt;article&gt;</PostInlineCode>
              {", "}
              <PostInlineCode>&lt;footer&gt;</PostInlineCode>
              {" 요소의 자식이 될 수 없습니다."}
            </PostTableCell>
          </PostTableRow>
        </PostTableBody>
      </PostTable>
      <PostHorizontalRule />
      <PostHeading3>
        <PostStrong>2. input:password 태그</PostStrong>
      </PostHeading3>
      <PostParagraph>
        {" 로그인 페이지 구성할 때 많이 사용하는 "}
        <PostInlineCode>&lt;input type=&quot;password&quot;/&gt;</PostInlineCode>
        {" 인데요."}
      </PostParagraph>
      <PostBlockquote>
        <PostParagraph>&quot;Password field is not contained in a form...&quot;</PostParagraph>
      </PostBlockquote>
      <PostImage
        alt={""}
        src={
          "https://blog.kakaocdn.net/dna/bEtGLT/btrdpqFYxlb/AAAAAAAAAAAAAAAAAAAAAG0Bzxtz4qov9rf7Z1BONfE1pPyi9dUpY456BiGf1dcP/img.jpg?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1767193199&allow_ip=&allow_referer=&signature=7nf0srDbnRIT1ZgW%2FjMekub0YyA%3D"
        }
      />
      <PostParagraph>
        {
          " 노란 문구가 거슬려 확인해 보니. Password는 form 안에 있어야 하나 봅니다. 이 부분은 어렵지 않으니 "
        }
        <PostInlineCode>&lt;form&gt;</PostInlineCode>
        {"으로 감싸서 줍니다. "}
      </PostParagraph>
      <PostBlockquote>
        <PostParagraph>
          &quot;Input elements should have autocomplete attributes...&quot;
        </PostParagraph>
      </PostBlockquote>
      <PostImage
        alt={""}
        src={
          "https://blog.kakaocdn.net/dna/bw3YKP/btrdkJT5ZqV/AAAAAAAAAAAAAAAAAAAAAFUw1OwBIZPSauKlvMZrU8tKufNZnLuIisnRv5nPdMtU/img.jpg?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1767193199&allow_ip=&allow_referer=&signature=K4kVbZItjUS9uaJuvPYQGuaie%2F8%3D"
        }
      />
      <PostParagraph>
        새로운 문제가 생겼습니다. password에서는 autocomplete 요소가 있어야 한다고 하는 것 같습니다.
        부끄럽지만 autocomplete 요소가 뭔지 전혀 이해가 가질 않아, 열심히 검색해봤습니다.
      </PostParagraph>
      <PostParagraph>
        <PostLink href={"https://developer.mozilla.org/ko/docs/Web/HTML/Attributes/autocomplete"}>
          https:&#47;&#47;developer.mozilla.org/ko/docs/Web/HTML/Attributes/autocomplete
        </PostLink>
      </PostParagraph>
      <PostParagraph>
        {" [HTML autocomplete 특성 - HTML: Hypertext Markup Language | MDN"}
      </PostParagraph>
      <PostParagraph>
        autocomplete 특성을 사용하면 사용자 에이전트의 자동완성을 허용할 양식 입력 필드를 지정할 수
        있으며, 사용자 에이전트에게 어떤 정보에 대한 자동완성을 원하는지 안내할 수도 있습니다.
      </PostParagraph>
      <PostParagraph>
        developer.mozilla.org](https:&#47;&#47;developer.mozilla.org/ko/docs/Web/HTML/Attributes/autocomplete)
      </PostParagraph>
      <PostParagraph>
        자동 완성에 대한 부분인데, password가 자동되는 것이 문제가 될 수 있으니 막으라고 하는
        듯합니다.
      </PostParagraph>
      <PostCodeBlock code={'autoComplete="off"'} />
      <PostParagraph>
        을 추가해줬습니다. password니 아무래도 off가 맞는 듯하여 off로 진행해서, 경고문구를
        해결했습니다만,
      </PostParagraph>
      <PostBlockquote>
        <PostParagraph>
          참고: 대부분의 최신 브라우저에서는 autocomplete을 off로 지정하더라도 브라우저가 사용자에게
          계정 이름과 비밀번호 저장 여부를 묻는 것을 막을 수 없으며, 저장한 값을 사용해 자동
          완성하는 것도 막을 수 없습니다. The autocomplete attribute and login fields 문서를
          참고하세요.
        </PostParagraph>
      </PostBlockquote>
      <PostParagraph>라고 합니다.. 조금 아쉬운 부분인 듯합니다.</PostParagraph>
      <PostHorizontalRule />
      <PostParagraph>
        오늘은 제가 사이드 프로젝트하면서, 간과했던 부분들을 정리해봤는데요. 개인적으로 이런
        부분까지 신경 쓰면서 개발하다 보면, 제 성장 속도가 빨라지는 듯하여 개발이 더 재밌어지는
        듯합니다. 그리고 디버깅하고 문제를 해결하는 것보다 사실 간단한 문제는 포스팅할 때 더 많은
        시간이 쏟지만 그러면서 더 양질의 학습이 되는 것 같아서 뿌듯합니다. 앞으로도 더 신경 쓰며
        개발하고, 휘발될 수 있는 정보들은 포스팅하는 습관을 들여야겠습니다.
      </PostParagraph>
    </>
  );
};

export default DevHtmlMistakes1Post;
