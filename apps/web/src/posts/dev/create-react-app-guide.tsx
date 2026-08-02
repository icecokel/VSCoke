import {
  PostHeading3,
  PostHorizontalRule,
  PostImage,
  PostLink,
  PostListItem,
  PostOrderedList,
  PostParagraph,
  PostStrong,
} from "@/components/blog/blog-post-elements";

const DevCreateReactAppGuidePost = () => {
  return (
    <>
      <PostParagraph>
        안녕하세요. 오늘은 React 시자하는 방법에 대하여 포스팅을 진행하겠습니다.
      </PostParagraph>
      <PostHorizontalRule />
      <PostOrderedList start={1}>
        <PostListItem>
          <PostParagraph>
            <PostStrong>사전설치</PostStrong>
          </PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>
            <PostStrong>create-react-app으로 React 설치하기</PostStrong>
          </PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>
            <PostStrong>react 시작하기</PostStrong>
          </PostParagraph>
        </PostListItem>
      </PostOrderedList>
      <PostHorizontalRule />
      <PostHeading3>
        <PostStrong>1. 사전설치</PostStrong>
      </PostHeading3>
      <PostParagraph>
        개발을 시작하기전 개발 할 툴이 있어야겠죠. 저는 VSCode를 사용해보겠습니다
      </PostParagraph>
      <PostParagraph>
        <PostLink href={"https://code.visualstudio.com/download"}>
          code.visualstudio.com/download
        </PostLink>
      </PostParagraph>
      <PostParagraph>{" [Download Visual Studio Code - Mac, Linux, Windows"}</PostParagraph>
      <PostParagraph>
        Visual Studio Code is free and available on your favorite platform - Linux, macOS, and
        Windows. Download Visual Studio Code to experience a redefined code editor, optimized for
        building and debugging modern web and cloud applications.
      </PostParagraph>
      <PostParagraph>
        code.visualstudio.com](https:&#47;&#47;code.visualstudio.com/download)
      </PostParagraph>
      <PostParagraph>
        해당 URL을 타고 들어가 Visual Studio Code (약칭 VSCode)를 본인에 OS에 맞는 버전으로 설치를
        진행합니다.
      </PostParagraph>
      <PostParagraph>설치가 완료되면 VSCode 실행하여 설치 확인을 한다.</PostParagraph>
      <PostImage
        alt={""}
        src={
          "https://blog.kakaocdn.net/dna/bOduoP/btqNgtCcSjV/AAAAAAAAAAAAAAAAAAAAALQRsfHkNwMY1dgIV4J3WGonYXkzDlars4j955wmk8Yn/img.jpg?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1767193199&allow_ip=&allow_referer=&signature=WCi48AOSNBkE1OQorubkYW3xa8E%3D"
        }
      />
      <PostParagraph>다음 패키지 관리를 위한 npm을 설치 진행합니다.</PostParagraph>
      <PostParagraph>
        <PostLink href={"https://nodejs.org/en/"}>nodejs.org/en/</PostLink>
      </PostParagraph>
      <PostParagraph>{" [Node.js"}</PostParagraph>
      <PostParagraph>
        Node.js® is a JavaScript runtime built on Chrome&apos;s V8 JavaScript engine.
      </PostParagraph>
      <PostParagraph>nodejs.org](https:&#47;&#47;nodejs.org/en/)</PostParagraph>
      <PostParagraph>해당 URL을 타고 들어가 npm을 설치합니다.</PostParagraph>
      <PostParagraph>
        왼쪽은 가장많은 유저가 사용하는 즉, 가장 안정적인 버전이고, 오른쪽은 가장 최신의 버전입니다.
        기호에 맞게 설치를 진행합니다. (저는 왼쪽으로 진행했습니다)
      </PostParagraph>
      <PostImage
        alt={""}
        src={
          "https://blog.kakaocdn.net/dna/lcqx7/btqNkfJL6dh/AAAAAAAAAAAAAAAAAAAAAFH0ApwZSqsbN3qYjB6MMZFVl7aqAKuTvUbq9GmD6hJe/img.jpg?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1767193199&allow_ip=&allow_referer=&signature=t7erUmUzpmLxil202riwLHV%2Ffp8%3D"
        }
      />
      <PostParagraph>
        설치가 완료 되면 [명령프롬프트] (cmd) 창을 열어 npm -v 로 설치 확인 및 설치 버전을
        확인합니다.
      </PostParagraph>
      <PostImage
        alt={""}
        src={
          "https://blog.kakaocdn.net/dna/crnASc/btqNkQXhikL/AAAAAAAAAAAAAAAAAAAAAOFBEe-Enx7kv-Lk_wGN4qyEC87RnF4hqE3UzvhF2uTT/img.jpg?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1767193199&allow_ip=&allow_referer=&signature=I60cqkmyTWm4tywjUMXjXcYt6Zg%3D"
        }
      />
      <PostParagraph>
        정상설치가 완료되었다면, React를 시작하기 위한 사전준비가 끝납니다.
      </PostParagraph>
      <PostHorizontalRule />
      <PostHeading3>
        <PostStrong>2. create-react-app으로 React 설치하기</PostStrong>
      </PostHeading3>
      <PostParagraph>
        명령프롬프트에서도 진행이 가능하고, vscode내에 있는 터미널에서도 작업이 가능합니다. 저는
        vscode에서 진행을 시작하겠습니다.
      </PostParagraph>
      <PostImage
        alt={""}
        src={
          "https://blog.kakaocdn.net/dna/nN0QD/btqNkeYnwZ3/AAAAAAAAAAAAAAAAAAAAACqoY-XGunHUCEL2jRisNbUyKISYDPM1sBMqsX-Dt0Jz/img.jpg?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1767193199&allow_ip=&allow_referer=&signature=4%2BAL7JzjKGa6eW2RFe%2F8jnIaBS4%3D"
        }
      />
      <PostParagraph>
        VSCode 상단 탭중 [File] - [Open Folder]를 눌러 작업할 폴더를 지정해 줍니다.
      </PostParagraph>
      <PostImage
        alt={""}
        src={
          "https://blog.kakaocdn.net/dna/bvuv5K/btqNlmPcudq/AAAAAAAAAAAAAAAAAAAAAFO642SUjxA3h6A_lxjOgnYsjetUuk25OuDKrYqnFSCP/img.jpg?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1767193199&allow_ip=&allow_referer=&signature=ercsphNPjFpyPgLleV4jl7hfkkM%3D"
        }
      />
      <PostParagraph>
        저는 react폴더를 생성해서 해당 폴더를 react 전용으로 사용하겠습니다.
      </PostParagraph>
      <PostImage
        alt={""}
        src={
          "https://blog.kakaocdn.net/dna/bs3K07/btqNmcS43fM/AAAAAAAAAAAAAAAAAAAAABcjJm_lg5Xk0x2r3-U8vEuc9z3fGcLjKhOsn3_UxLOg/img.jpg?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1767193199&allow_ip=&allow_referer=&signature=ICsBI60V5drCdSsTay2SHP5x6t8%3D"
        }
      />
      <PostParagraph>
        {
          "작업 폴더를 지정했으니, 터미널을 열어 환경 세팅 및 create-react-app를 설치할 준비를 하겠습니다.  "
        }
      </PostParagraph>
      <PostParagraph>
        상단 탭 중 [Terminal] - [New Terminal]를 클릭해 터미널을 열어줍니다.
      </PostParagraph>
      <PostParagraph>
        (명령 프롬프트로 진행하거나, Mac환경에서 진행중이신 분들은 cd 명령을 통해 작업 디렉터리로
        이동해주시고 작업을 해주셔야 합니다)
      </PostParagraph>
      <PostImage
        alt={""}
        src={
          "https://blog.kakaocdn.net/dna/bMMsp7/btqNiVE8d65/AAAAAAAAAAAAAAAAAAAAADBkHlknAAxTKG6TaOblJo_BiIOb3GODWIFlrvuOKGMz/img.jpg?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1767193199&allow_ip=&allow_referer=&signature=ovDnPGmpU85o9LXPAjU5x%2FQ5E0k%3D"
        }
      />
      <PostParagraph>
        우측하단에 생긴 터미널에서 npx create-react-app (작업할 프로젝트명)을 적어
        create-react-app을 설치 진행 해줍니다.
      </PostParagraph>
      <PostHorizontalRule />
      <PostHeading3>
        <PostStrong>3. react 시작하기</PostStrong>
      </PostHeading3>
      <PostImage
        alt={""}
        src={
          "https://blog.kakaocdn.net/dna/cxTNAN/btqNhabnNMN/AAAAAAAAAAAAAAAAAAAAACJORqCQaENNE57_c9j11v0v7Ey0LDd2T0npWsR6zdiU/img.jpg?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1767193199&allow_ip=&allow_referer=&signature=JOSMKblLsc26gcBmUkcIHMvRAfU%3D"
        }
      />
      <PostParagraph>
        프로젝트 디렉토리로 이동하고, npm start로 프로젝트를 시작해 줍니다.
      </PostParagraph>
      <PostImage
        alt={""}
        src={
          "https://blog.kakaocdn.net/dna/2KPaq/btqNiVFfFuW/AAAAAAAAAAAAAAAAAAAAAKlZ7cvvh2nzWdxBUG-kPfmy2kjqIkE7J9m3GJBFWfuz/img.jpg?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1767193199&allow_ip=&allow_referer=&signature=O0KnqXpljHyfMJaCAx8kXwaP9CE%3D"
        }
      />
      <PostHorizontalRule />
      <PostParagraph>
        보시는 거와 같이 기본 브라우저에서 react가 열리는 것을 확인 할 수 있습니다.
      </PostParagraph>
    </>
  );
};

export default DevCreateReactAppGuidePost;
