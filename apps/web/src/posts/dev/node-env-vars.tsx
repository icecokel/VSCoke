import {
  PostBlockquote,
  PostHeading3,
  PostHorizontalRule,
  PostImage,
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

const DevNodeEnvVarsPost = () => {
  return (
    <>
      <PostParagraph>
        안녕하세요 환경변수문제로 node같은 명령어가 먹지 않을 때가 종종 있어서 문제해결 포스팅을
        진행하겠습니다.
      </PostParagraph>
      <PostBlockquote>
        <PostParagraph>
          node : &apos;node&apos; 용어가 cmdlet, 함수, 스크립트 파일 또는 실행할 수 있는 프로그램
          이름으로 인식되지 않습니다. 이름이 정확한지 확인하고 경로가 포함된 경우 경로가 올바른지
          검증한 다음 다시 시도하십시오.
        </PostParagraph>
      </PostBlockquote>
      <PostHorizontalRule />
      <PostOrderedList start={1}>
        <PostListItem>
          <PostParagraph>
            <PostStrong>작업 환경</PostStrong>
          </PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>
            <PostStrong>환경변수 작업</PostStrong>
          </PostParagraph>
        </PostListItem>
      </PostOrderedList>
      <PostHorizontalRule />
      <PostHeading3>
        <PostStrong>1. 작업 환경</PostStrong>
      </PostHeading3>
      <PostTable>
        <PostTableHead>
          <PostTableRow>
            <PostTableHeader>운영체제</PostTableHeader>
            <PostTableHeader>Windows 10 Pro</PostTableHeader>
          </PostTableRow>
        </PostTableHead>
        <PostTableBody>
          <PostTableRow>
            <PostTableCell>node</PostTableCell>
            <PostTableCell>v14.17.3</PostTableCell>
          </PostTableRow>
          <PostTableRow>
            <PostTableCell>npm</PostTableCell>
            <PostTableCell>6.14.13</PostTableCell>
          </PostTableRow>
        </PostTableBody>
      </PostTable>
      <PostHorizontalRule />
      <PostHeading3>
        <PostStrong>2. 환경변수 작업</PostStrong>
      </PostHeading3>
      <PostParagraph>
        windows 10 기준 [시작]버튼 을 클릭하고, (또는 [Windows 버튼]) &quot;고급 시스템 설정
        보기&quot; 이라고 쳐줍니다.
      </PostParagraph>
      <PostImage
        alt={""}
        src={
          "https://blog.kakaocdn.net/dna/nWGE7/btrc2J569OF/AAAAAAAAAAAAAAAAAAAAANs8gJBXuS53b4G8edDtVcQk1wKSmBVWjGKn4ppLyCHM/img.jpg?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1767193199&allow_ip=&allow_referer=&signature=DaaTRLHZUahYEl5NtsuG9MUJ3cE%3D"
        }
      />
      <PostParagraph>[고급 시스템 설정 보기]를 실행해 줍니다.</PostParagraph>
      <PostImage
        alt={""}
        src={
          "https://blog.kakaocdn.net/dna/dwHps4/btrcSsdZjrM/AAAAAAAAAAAAAAAAAAAAAPCuTNGDE0kMhA6Q6yGOEHcjUaBj52kULWi85d0gm6WI/img.jpg?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1767193199&allow_ip=&allow_referer=&signature=q30Kh%2FyUEh7Q25yhUUQzBcrR3gg%3D"
        }
      />
      <PostParagraph>[환경변수]버튼을 클릭해 줍니다.</PostParagraph>
      <PostImage
        alt={""}
        src={
          "https://blog.kakaocdn.net/dna/bAehO0/btrc1U74bFu/AAAAAAAAAAAAAAAAAAAAADLIEqKoKeoVcMz2eIoA3WcFZbI5VY07ZgCCc7-bMZi0/img.png?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1767193199&allow_ip=&allow_referer=&signature=ZQ3al7Q5lAY%2BbdqtprXO4lgELEk%3D"
        }
      />
      <PostParagraph>사용자 변수 탭에서 [새로 만들기] 버튼을 클릭합니다.</PostParagraph>
      <PostImage
        alt={""}
        src={
          "https://blog.kakaocdn.net/dna/vvujr/btrcUkGlhKJ/AAAAAAAAAAAAAAAAAAAAADdUmgEQW49eWGWxwipVvydznA5WXKHV2A0CFEWw2Hr1/img.jpg?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1767193199&allow_ip=&allow_referer=&signature=U1x4xZciskPIvDfwK4hAcujTk3I%3D"
        }
      />
      <PostParagraph>시스템 변수 탭에서 [Path] 를 찾아 더블 클릭 해줍니다.</PostParagraph>
      <PostImage
        alt={""}
        src={
          "https://blog.kakaocdn.net/dna/UNKgd/btrc13cG2jv/AAAAAAAAAAAAAAAAAAAAANmPhdndCwxGttACgip52Tq5jqbQ1Kms8D2fIb-68QIF/img.jpg?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1767193199&allow_ip=&allow_referer=&signature=ajjEIAH4giDYLrk%2FlHg7kVsX%2BOU%3D"
        }
      />
      <PostParagraph>
        [새로 만들기]버튼을 클릭해 주고 표시된것와 같이 설정을 해줍니다.
      </PostParagraph>
      <PostImage
        alt={""}
        src={
          "https://blog.kakaocdn.net/dna/bavcU6/btrcYbCjNiY/AAAAAAAAAAAAAAAAAAAAAALUynKDiEOC6Pn3KKRZ-DtOwLRkE3Wj6QbrRzmWnzU4/img.jpg?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1767193199&allow_ip=&allow_referer=&signature=5wePuf%2FFfU1bYj8aWdtUdf0WL1A%3D"
        }
      />
      <PostParagraph>모두 설정했다면 말썽피우던 명령을 확인해 봐야겠죠.?</PostParagraph>
      <PostImage
        alt={""}
        src={
          "https://blog.kakaocdn.net/dna/cwvxyL/btrcRoIZWuB/AAAAAAAAAAAAAAAAAAAAAP5vynH4Mi34vhnWYFzxQomLFE-Rl4X3Sv50rvqZV6xo/img.jpg?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1767193199&allow_ip=&allow_referer=&signature=9T3Ur9ZbYUO4nNJUNaYm33DQAms%3D"
        }
      />
      <PostParagraph>
        저를 스트레스를 주던 nodemon이 정상적으로 실행이 되네여. 이로써 좀 더 스마트하게 스터디를 할
        수 있겠네요.
      </PostParagraph>
    </>
  );
};

export default DevNodeEnvVarsPost;
