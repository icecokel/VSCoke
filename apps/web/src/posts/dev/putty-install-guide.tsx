import {
  PostHeading3,
  PostHorizontalRule,
  PostImage,
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

const DevPuttyInstallGuidePost = () => {
  return (
    <>
      <PostParagraph>
        안녕하세요. 오늘은 Putty설치 및 사용 방법에 대해서 알아보겠습니다.
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
            <PostStrong>설치</PostStrong>
          </PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>
            <PostStrong>사용방법 및 팁</PostStrong>
          </PostParagraph>
        </PostListItem>
      </PostOrderedList>
      <PostHorizontalRule />
      <PostHeading3>
        <PostStrong>1. 개념</PostStrong>
      </PostHeading3>
      <PostParagraph>
        사실 Putty는 사용방법 보다 어떤 프로그램인 먼저 이해하는 것이 사용하는데 큰 도움이 된다고
        생각되어, Putty의 개념을 잡고 시작하겠습니다. Putty는 원격 프로토콜을 사용하기 위한 툴 또는
        프로그램 정도로 이해하시면 됩니다.
      </PostParagraph>
      <PostParagraph>
        {"프로토콜이란 컴퓨터와 컴퓨터, 또는 컴퓨터와 서버등 통신을 하기위한 통신 규약입니다. "}
      </PostParagraph>
      <PostParagraph>
        그중 이원지에서 원격으로 접속해서 작업을 할 수 있도록 도와주는 원격 프로토콜을 대표적으로
        3가지 알아보겠습니다.
      </PostParagraph>
      <PostTable>
        <PostTableHead>
          <PostTableRow>
            <PostTableHeader>프로토콜</PostTableHeader>
            <PostTableHeader>용도</PostTableHeader>
            <PostTableHeader>기본포트</PostTableHeader>
            <PostTableHeader>비고</PostTableHeader>
          </PostTableRow>
        </PostTableHead>
        <PostTableBody>
          <PostTableRow>
            <PostTableCell>RDP</PostTableCell>
            <PostTableCell>
              Windows OS에서 원격으로 접속하여 GUI 환경을 제공 받을때 쓰는 프로토콜
            </PostTableCell>
            <PostTableCell>3389</PostTableCell>
            <PostTableCell>
              GUI 리눅스 환경에서는 xrdp로 비슷한 기능을 제공받을 수 있습니다.
            </PostTableCell>
          </PostTableRow>
          <PostTableRow>
            <PostTableCell>telnet</PostTableCell>
            <PostTableCell>
              cli환경, 장비나 서버단에 원격으로 접속할 때 사용하는 프로토콜
            </PostTableCell>
            <PostTableCell>25</PostTableCell>
            <PostTableCell></PostTableCell>
          </PostTableRow>
          <PostTableRow>
            <PostTableCell>SSH</PostTableCell>
            <PostTableCell>
              telnet에 보안 개념추가 된 형태이며 사실상 가장 많이 사용 되는 프로토콜
            </PostTableCell>
            <PostTableCell>22</PostTableCell>
            <PostTableCell></PostTableCell>
          </PostTableRow>
        </PostTableBody>
      </PostTable>
      <PostParagraph>
        위의 프로토콜중 SSH를 window 환경에서 사용할 때 사용하는 툴이 Putty 입니다.
      </PostParagraph>
      <PostParagraph>
        장비와 시리얼 통신할때도 많이 사용하지만, 실제로는 리눅스 서버를 이원지에서 작업할때 가장
        많이 사용합니다.
      </PostParagraph>
      <PostHorizontalRule />
      <PostHeading3>
        <PostStrong>2. 설치</PostStrong>
      </PostHeading3>
      <PostParagraph>
        설치를 진행하겠습니다. 우선 Putty 공식홈페이지로 이동하여 설치를 진행합니다.
      </PostParagraph>
      <PostParagraph>
        <PostLink href={"https://www.putty.org/"}>www.putty.org/</PostLink>
      </PostParagraph>
      <PostParagraph>{" [Download PuTTY - a free SSH and telnet client for Windows"}</PostParagraph>
      <PostParagraph>
        Is Bitvise affiliated with PuTTY? Bitvise is not affiliated with PuTTY. We develop our SSH
        Server for Windows, which is compatible with PuTTY. Many PuTTY users are therefore our users
        as well. From time to time, they need to find the PuTTY download link. W
      </PostParagraph>
      <PostParagraph>www.putty.org](https:&#47;&#47;www.putty.org/)</PostParagraph>
      <PostImage
        alt={""}
        src={
          "https://blog.kakaocdn.net/dna/bWCevt/btqNke58g5B/AAAAAAAAAAAAAAAAAAAAAKPArEsXtrl0c_Z8bHCuahnu88a0hd22m8vqUuIq2NB5/img.png?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1767193199&allow_ip=&allow_referer=&signature=hrAjB7YYGVD68ni7OhF%2F%2Fm9MmXI%3D"
        }
      />
      <PostParagraph>
        Package files 중 본인 OS 환경에 맞는 것을 선택해 Setup 파일을 다운로드 합니다.
      </PostParagraph>
      <PostImage
        alt={""}
        src={
          "https://blog.kakaocdn.net/dna/LOd6u/btqNnwrfwqc/AAAAAAAAAAAAAAAAAAAAAGjGJzZRNTGTL9qEYv3EWOUS0oMfMEc_cc8d-_7V-sFj/img.png?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1767193199&allow_ip=&allow_referer=&signature=clvKm0lS0LXtrPmU%2Fdfzcft7%2BsQ%3D"
        }
      />
      <PostParagraph>Setup 파일을 실행시켜 설치를 진행합니다.</PostParagraph>
      <PostHorizontalRule />
      <PostHeading3>
        <PostStrong>3. 사용방법 및 팁</PostStrong>
      </PostHeading3>
      <PostParagraph>{" Putty를 설치 했으니 사용방법을 알아보도록 하겠습니다."}</PostParagraph>
      <PostImage
        alt={""}
        src={
          "https://blog.kakaocdn.net/dna/wDFnR/btqNpGl5QI1/AAAAAAAAAAAAAAAAAAAAADumC6eW-05toOmZTG-LEZ18YwupT8YakMMcNDtW6G7h/img.jpg?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1767193199&allow_ip=&allow_referer=&signature=ESv3PQ5DKtZ2cnl833CL2ZLZPdw%3D"
        }
      />
      <PostParagraph>
        Host Name 에 접속할 IP 또는 도메인 주소를 적고, Port 번호를 기입하고 Open 버튼을 클릭합니다.
      </PostParagraph>
      <PostImage
        alt={""}
        src={
          "https://blog.kakaocdn.net/dna/7csMO/btqNmcfswCa/AAAAAAAAAAAAAAAAAAAAAG4httgq4GuV6bCdR6FGLBZ3GCkcQbni4KmZqhj-SI7N/img.jpg?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1767193199&allow_ip=&allow_referer=&signature=RCdq6toRMKd09BkxYkIQIcxaiwM%3D"
        }
      />
      <PostParagraph>{"SSH 접속이 완료됩니다.  이후 서버작업을 진행하면 됩니다. "}</PostParagraph>
      <PostParagraph>
        {"** 저는 집안에 Linux서버를 만들어 놔서 바로 작업을 진행할 수 있었습니다. "}
      </PostParagraph>
      <PostParagraph>
        putty에 생각보다 편한 기능이 있는데 대부분에 사람이 모르거나 사용 안하시는 거 같아서 사용
        팁을 공유해 드리겠습니다.
      </PostParagraph>
      <PostParagraph>1. logging</PostParagraph>
      <PostImage
        alt={""}
        src={
          "https://blog.kakaocdn.net/dna/yEImv/btqNkQRuhul/AAAAAAAAAAAAAAAAAAAAANENWT4sr2Dwn8v9cS4w2HXJwThC1ofXOGfBAmKBHgwn/img.jpg?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1767193199&allow_ip=&allow_referer=&signature=qGzK2JDg%2FHXFFGYv709IqxuqkAg%3D"
        }
      />
      <PostParagraph>
        좌측 Cetegory 트리에서 [Session] - [ Logging ] 을 클릭해서 로깅으로 이동하고 설정을
        진행합니다.
      </PostParagraph>
      <PostParagraph>A : 모든 세션의 아웃풋을 로깅하겠다는 의미</PostParagraph>
      <PostParagraph>
        B : 어디에 로깅을 적재 할 지, 어떤 형식으로 적재 할지 정하는 부분입니다.
      </PostParagraph>
      <PostParagraph>
        {
          " - [Browse...]를 클릭해 저장할 위치를 지정하고 &을 이용해 파일 이름의 형식을 지정해줍니다."
        }
      </PostParagraph>
      <PostParagraph>
        {" &H(호스트 이름 or 접속한 IP 주소) &Y(로깅년도)-&M(로깅월)-&D(로깅일) &T(로깅시간).log"}
      </PostParagraph>
      <PostParagraph>등으로 지정함.</PostParagraph>
      <PostParagraph>2. 세션정보저장</PostParagraph>
      <PostImage
        alt={""}
        src={
          "https://blog.kakaocdn.net/dna/bJi68e/btqNoumrgXu/AAAAAAAAAAAAAAAAAAAAAPwI8tYSsqoPbZRMGzXOE3s30rMlspDm_esqI2CRXPog/img.jpg?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1767193199&allow_ip=&allow_referer=&signature=jW1qXhKOIL1JGVVEA23tbB4mpEs%3D"
        }
      />
      <PostParagraph>
        {
          "평소에 접속하시는거와 같이 접속정보를 기입한 후 Open를 누르지 않고 Saved Sessions 에 이름을 정해주고 [ Save ] 버튼을 눌르면 활성화 된거와 같이 접속정보를 저장할 수 있습니다. "
        }
      </PostParagraph>
      <PostParagraph>
        한번 저장해두면 같은서버에 접속할 때 더블 클릭만하면되니 작업이 편해지겠죠?
      </PostParagraph>
      <PostParagraph>3. Session 우클릭 기능들</PostParagraph>
      <PostImage
        alt={""}
        src={
          "https://blog.kakaocdn.net/dna/bBHAsr/btqNpf3qPmS/AAAAAAAAAAAAAAAAAAAAAEFVWhdmWlVSQOHrdDHaGm5HJrxLK-m6GXCiauzjsGJF/img.jpg?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1767193199&allow_ip=&allow_referer=&signature=r32G3h0gbgKjBJulR8F8D4bF3S8%3D"
        }
      />
      <PostParagraph>
        세션 연결 후 상단을 우클릭 하면 위와 같은 칸이 나옵니다. 제가 표시한 항목을 차례대로
        설명하겠습니다.
      </PostParagraph>
      <PostTable>
        <PostTableHead>
          <PostTableRow>
            <PostTableHeader>New Session</PostTableHeader>
            <PostTableHeader>
              현재 Session말고 새로운 세션을 접속 시도할 때 씁니다. Putty가 새로 열립니다.
            </PostTableHeader>
          </PostTableRow>
        </PostTableHead>
        <PostTableBody>
          <PostTableRow>
            <PostTableCell>Duplicate Session</PostTableCell>
            <PostTableCell>
              현재의 접속 정보와 같은 Session 하나를 새로운 창으로 띄웁니다.
            </PostTableCell>
          </PostTableRow>
          <PostTableRow>
            <PostTableCell>Saved Sessions</PostTableCell>
            <PostTableCell>미리 저장해둔 Session중 하나를 새로운 창으로 띄웁니다.</PostTableCell>
          </PostTableRow>
          <PostTableRow>
            <PostTableCell>Reset Terminal</PostTableCell>
            <PostTableCell>
              {"현재 띄워둔  터미널을 비웁니다. 리눅스의 Clear 명령어와 비슷합니다."}
            </PostTableCell>
          </PostTableRow>
        </PostTableBody>
      </PostTable>
      <PostImage
        alt={""}
        src={
          "https://blog.kakaocdn.net/dna/kPZ4V/btqNpeSwap1/AAAAAAAAAAAAAAAAAAAAACe--ltKJ8UMH3N03FEjC6h47Iyr_7tPko-tyyMa-C31/img.jpg?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1767193199&allow_ip=&allow_referer=&signature=4NQWu8nPXj3H0vB%2BTA5JNvLtA80%3D"
        }
      />
      <PostParagraph>
        다음은 Restart Session 입니다. 연결이 끊어졌을때, 같은 세션을 다시 접속하고 싶을 때
        사용합니다.
      </PostParagraph>
      <PostHorizontalRule />
      <PostParagraph>
        이렇게 Putty 사용법에 대해서 알아 봤습니다. 개발이 아니더라도 IT 업계에서는 쓸일이 빈번한데,
        사회에 입문한지 얼마 안된 신입들은 모르는 경우가 더러 있었습니다. 미리 사용방법을 숙지해서
        빠른 업무적응이 되시길 바랍니다.
      </PostParagraph>
    </>
  );
};

export default DevPuttyInstallGuidePost;
