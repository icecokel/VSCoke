import {
  PostHeading3,
  PostHorizontalRule,
  PostImage,
  PostListItem,
  PostOrderedList,
  PostParagraph,
  PostStrong,
  PostTable,
  PostTableHead,
  PostTableHeader,
  PostTableRow,
} from "@/components/blog/blog-post-elements";

const DevWindowsRdpGuidePost = () => {
  return (
    <>
      <PostParagraph>
        안녕하세요. 오늘은 개발할 때 있으면 편한기능인 RDP에 대해서 포스팅을 해보겠습니다.
      </PostParagraph>
      <PostHorizontalRule />
      <PostOrderedList start={1}>
        <PostListItem>
          <PostParagraph>
            <PostStrong>개념</PostStrong>
          </PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>
            <PostStrong>환경</PostStrong>
          </PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>
            <PostStrong>사용방법</PostStrong>
          </PostParagraph>
        </PostListItem>
      </PostOrderedList>
      <PostHorizontalRule />
      <PostHeading3>
        <PostStrong>1. 개념</PostStrong>
      </PostHeading3>
      <PostParagraph>RDP (Remote Desktop Protocol)</PostParagraph>
      <PostParagraph>
        쉽게 말하는 윈도우원격데스크톱을 의미합니다. 집에서 코딩작업을 하던 부분을 보고 싶을때, 또는
        집에 작성해둔 문서나 자료를 확인하고 싶을때 사용하면 좋은 기능중 하나입니다. 또는, 집에
        컴퓨터가 두대 이상일 경우 현재 컴퓨터에서 다른 컴퓨터를 조작할때 사용하면 편한 기능이기도
        하죠.
      </PostParagraph>
      <PostHorizontalRule />
      <PostHeading3>
        <PostStrong>2. 환경</PostStrong>
      </PostHeading3>
      <PostTable>
        <PostTableHead>
          <PostTableRow>
            <PostTableHeader>운영체제</PostTableHeader>
            <PostTableHeader>Windows 10 Pro</PostTableHeader>
          </PostTableRow>
        </PostTableHead>
      </PostTable>
      <PostHorizontalRule />
      <PostHeading3>
        <PostStrong>3. 사용방법</PostStrong>
      </PostHeading3>
      <PostParagraph>
        RDP를 사용하려면 일단 이원조작을 하려는 컴퓨터의 설정이 잡혀있어야 합니다. 다른 컴퓨터가
        조작 할 수 있도록 허용해줘야 하는 거죠. 설정하는 방법을 보여드리겠습니다.
      </PostParagraph>
      <PostImage
        alt={""}
        src={
          "https://blog.kakaocdn.net/dna/tBhCM/btqNe5neMvi/AAAAAAAAAAAAAAAAAAAAAOxGGkAv68ELPcXacAmuV4gVQ7U2l7SHdMin_zbQ0b9j/img.jpg?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1767193199&allow_ip=&allow_referer=&signature=HtdcHg7tn%2Fa3ZcePL5ouu2oRpDU%3D"
        }
      />
      <PostParagraph>우선 시작 버튼을 누르고 [설정]으로 들어가 줍니다.</PostParagraph>
      <PostImage
        alt={""}
        src={
          "https://blog.kakaocdn.net/dna/FOW0i/btqNgus1BSS/AAAAAAAAAAAAAAAAAAAAAENn8zCTtcEwRVEkMnGHPlxsU5aktgp-VMjXWexOV1b7/img.png?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1767193199&allow_ip=&allow_referer=&signature=AhV8kgFGND70aDpNY6nhI8HzEgw%3D"
        }
      />
      <PostParagraph>설정창에서 [시스템] 설정으로 들어가 줍니다.</PostParagraph>
      <PostImage
        alt={""}
        src={
          "https://blog.kakaocdn.net/dna/SzQpz/btqNiVDERsE/AAAAAAAAAAAAAAAAAAAAAFdWUgDcmkj9f2525AFnVk4SqyqHN0gjjuwmt5cZv5X6/img.jpg?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1767193199&allow_ip=&allow_referer=&signature=BoLm33Pz8HtVgv45jb3KrhPWdv0%3D"
        }
      />
      <PostParagraph>
        좌측 사이드바에서 [원격 데스크톱]을 클릭해주시고, 원격 테스크톱 설정에서 [원격 테스트톱
        활성화]를 켬으로 바꿔주면 설정 끝.
      </PostParagraph>
      <PostParagraph>이제 들어갈 컴퓨터를 설정했으니 접속하는 방법을 알아 봅시다.</PostParagraph>
      <PostParagraph>{"첫번째로 "}</PostParagraph>
      <PostImage
        alt={""}
        src={
          "https://blog.kakaocdn.net/dna/F1UMH/btqNg991OPL/AAAAAAAAAAAAAAAAAAAAAB4z4TEZlf_DhGuIYhtpfI70hb8lGDj-beTqIYhx813r/img.jpg?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1767193199&allow_ip=&allow_referer=&signature=zg0BOXFVRa9yZ5prECo7%2F%2FnVnyU%3D"
        }
      />
      <PostParagraph>[시작]에서 [원격 데스크톱 연결]을 검색하고 실행 시킵니다.</PostParagraph>
      <PostImage
        alt={""}
        src={
          "https://blog.kakaocdn.net/dna/cuH6aO/btqNf6T0bOX/AAAAAAAAAAAAAAAAAAAAAEEkQJf7RB3ctYRso-Uoqyk3UwpLJiD6L_MvDiM7vQhi/img.jpg?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1767193199&allow_ip=&allow_referer=&signature=ySHO8wzXEgAbK5FKLcQC5WvScWk%3D"
        }
      />
      <PostParagraph>접속할 IP 주소와 포트 번호를 기재하고 연결.</PostParagraph>
      <PostImage
        alt={""}
        src={
          "https://blog.kakaocdn.net/dna/cmS9bO/btqNftaTm0I/AAAAAAAAAAAAAAAAAAAAAJppNIoCwYwI22sUVlEYHYskJ4d8drvx9VZpkfQDuCDv/img.jpg?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1767193199&allow_ip=&allow_referer=&signature=sx7FuOWl%2BKct750G5F1PULok7oI%3D"
        }
      />
      <PostParagraph>접속할 Windows에 계정정보를 기입하고 [확인]</PostParagraph>
      <PostParagraph>** 인증서 관련나오면 [예]를 누르시면 연결이 됩니다.</PostParagraph>
      <PostParagraph>
        두번째 방법입니다. 실행창을 열어주시고,( [시작]-[실행] 또는 [window]+r )
        &quot;mstsc&quot;라고 쓰고 [확인] 눌러진행
      </PostParagraph>
      <PostImage
        alt={""}
        src={
          "https://blog.kakaocdn.net/dna/FB0j6/btqNiWb77Tg/AAAAAAAAAAAAAAAAAAAAAMvDZmf3EQOgPUFKW9ZOLuNB0AWCAWaZ8REILQH6S0Jk/img.jpg?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1767193199&allow_ip=&allow_referer=&signature=gcQTHgFxBddmyXXfJLsDRhtlV40%3D"
        }
      />
      <PostParagraph>그럼 위처럼 원격 데스크톱 연결 창이 뜨고 나머지는 위와 동일.</PostParagraph>
      <PostHorizontalRule />
      <PostParagraph>
        위 설명처럼 세팅 및 사용을 하면 내 컴퓨터를 원격으로 접속을 할 수 있습니다. 상황에 따라
        사용하면 매우 편한 기능이며, 나중에는 네트워크 문제도 해결해줄 iptime 세팅방법을
        포스팅하겠습니다.
      </PostParagraph>
    </>
  );
};

export default DevWindowsRdpGuidePost;
