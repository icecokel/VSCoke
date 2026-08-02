import {
  PostBlockquote,
  PostCodeBlock,
  PostHeading1,
  PostHeading2,
  PostHeading3,
  PostHorizontalRule,
  PostInlineCode,
  PostLink,
  PostListItem,
  PostOrderedList,
  PostParagraph,
  PostStrong,
  PostUnorderedList,
} from "@/components/blog/blog-post-elements";

const JournalGalaxyTabNeverDiesPost = () => {
  return (
    <>
      <PostHeading1>갤럭시탭 넌 죽지못해</PostHeading1>
      <PostParagraph>
        {
          "서랍 속에서 먼지만 쌓이고 있는 갤럭시탭, 혹시 있으신가요? 저도 그랬습니다. 새 태블릿을 사고 나면 이전 기기는 자연스럽게 방치되기 마련이죠. 하지만 이 녀석들, 아직 쓸모가 남아있습니다. 바로 "
        }
        <PostStrong>Termux</PostStrong>를 활용한 홈 서버로 재탄생시키는 것입니다.
      </PostParagraph>
      <PostHorizontalRule />
      <PostHeading2>1. Termux란?</PostHeading2>
      <PostParagraph>
        <PostStrong>Termux</PostStrong>는 안드로이드 기기에서 리눅스 환경을 제공하는 터미널
        에뮬레이터입니다. 루팅 없이도 사용할 수 있으며, apt 패키지 매니저를 통해 다양한 리눅스
        패키지를 설치할 수 있습니다.
      </PostParagraph>
      <PostParagraph>주요 특징:</PostParagraph>
      <PostUnorderedList>
        <PostListItem>
          <PostParagraph>
            <PostStrong>루팅 불필요</PostStrong>: 일반 앱처럼 설치하고 바로 사용
          </PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>
            <PostStrong>패키지 매니저 지원</PostStrong>
            {": "}
            <PostInlineCode>pkg</PostInlineCode>
            {" 혹은 "}
            <PostInlineCode>apt</PostInlineCode>
            {" 명령어로 패키지 관리"}
          </PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>
            <PostStrong>SSH, Python, Node.js, Git 등</PostStrong>: 개발 환경 구축 가능
          </PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>
            <PostStrong>proot-distro</PostStrong>: Ubuntu, Debian 등 다양한 리눅스 배포판 설치 가능
          </PostParagraph>
        </PostListItem>
      </PostUnorderedList>
      <PostParagraph>
        {"공식 사이트: "}
        <PostLink href={"https://termux.dev"}>https:&#47;&#47;termux.dev</PostLink>
      </PostParagraph>
      <PostHorizontalRule />
      <PostHeading2>2. Termux 설치 방법</PostHeading2>
      <PostHeading3>⚠️ 중요: Google Play 스토어 버전은 사용하지 마세요!</PostHeading3>
      <PostParagraph>
        {"Google Play의 Termux는 "}
        <PostStrong>2020년 이후 업데이트가 중단</PostStrong>되었습니다. 오래된 버전은 패키지 설치 시
        오류가 발생하고, 보안 취약점이 존재할 수 있습니다.
      </PostParagraph>
      <PostHeading3>✅ 권장: F-Droid에서 설치</PostHeading3>
      <PostParagraph>
        <PostLink href={"https://f-droid.org"}>F-Droid</PostLink>는 오픈소스 앱 마켓으로, Termux
        개발자가 직접 최신 버전을 배포합니다.
      </PostParagraph>
      <PostParagraph>
        <PostStrong>설치 순서:</PostStrong>
      </PostParagraph>
      <PostOrderedList start={1}>
        <PostListItem>
          <PostParagraph>
            <PostStrong>알 수 없는 출처 앱 허용</PostStrong>
          </PostParagraph>
          <PostUnorderedList>
            <PostListItem>
              <PostParagraph>
                <PostInlineCode>설정</PostInlineCode>
                {" → "}
                <PostInlineCode>보안</PostInlineCode>
                {" (또는 "}
                <PostInlineCode>개인정보 보호</PostInlineCode>
                {") → "}
                <PostInlineCode>알 수 없는 출처</PostInlineCode>
                {" 활성화"}
              </PostParagraph>
            </PostListItem>
          </PostUnorderedList>
        </PostListItem>
        <PostListItem>
          <PostParagraph>
            <PostStrong>F-Droid 설치</PostStrong>
          </PostParagraph>
          <PostUnorderedList>
            <PostListItem>
              <PostParagraph>
                {"브라우저에서 "}
                <PostLink href={"https://f-droid.org"}>f-droid.org</PostLink>
                {" 접속"}
              </PostParagraph>
            </PostListItem>
            <PostListItem>
              <PostParagraph>
                <PostInlineCode>Download F-Droid</PostInlineCode>
                {" 버튼으로 APK 다운로드 → 설치"}
              </PostParagraph>
            </PostListItem>
          </PostUnorderedList>
        </PostListItem>
        <PostListItem>
          <PostParagraph>
            <PostStrong>Termux 검색 및 설치</PostStrong>
          </PostParagraph>
          <PostUnorderedList>
            <PostListItem>
              <PostParagraph>F-Droid 앱 실행 → &quot;Termux&quot; 검색 → 설치</PostParagraph>
            </PostListItem>
          </PostUnorderedList>
        </PostListItem>
      </PostOrderedList>
      <PostBlockquote>
        <PostParagraph>
          <PostStrong>Tip</PostStrong>: Termux:API, Termux:Styling 같은 애드온도 F-Droid에서 함께
          설치하면 좋습니다.
        </PostParagraph>
      </PostBlockquote>
      <PostHorizontalRule />
      <PostHeading2>3. Termux 초기 세팅</PostHeading2>
      <PostParagraph>
        설치가 끝났다면, 먼저 패키지를 업데이트하고 SSH 서버를 설정합니다.
      </PostParagraph>
      <PostHeading3>3-1. 패키지 업데이트</PostHeading3>
      <PostCodeBlock
        code={
          "# 저장소 변경 (미러 선택 화면이 나오면 가까운 지역 선택)\ntermux-change-repo\n\n# 패키지 업데이트\npkg update && pkg upgrade -y"
        }
        language={"bash"}
      />
      <PostHeading3>3-2. 기본 패키지 설치</PostHeading3>
      <PostCodeBlock
        code={"# 자주 사용하는 기본 도구들\npkg install -y openssh vim git curl wget"}
        language={"bash"}
      />
      <PostHeading3>3-3. SSH 서버 설정 (sshd)</PostHeading3>
      <PostParagraph>외부에서 태블릿에 접속하려면 SSH 서버가 필요합니다.</PostParagraph>
      <PostCodeBlock
        code={"# SSH 서버 시작 (기본 포트: 8022)\nsshd\n\n# 비밀번호 설정\npasswd"}
        language={"bash"}
      />
      <PostParagraph>
        <PostStrong>접속 방법:</PostStrong>
      </PostParagraph>
      <PostCodeBlock
        code={"# 다른 기기에서 접속 (태블릿 IP 확인: ifconfig)\nssh -p 8022 사용자명@태블릿IP"}
        language={"bash"}
      />
      <PostBlockquote>
        <PostParagraph>
          <PostStrong>참고</PostStrong>: Termux의 SSH는 8022 포트를 사용합니다 (기본 22번 아님).
        </PostParagraph>
      </PostBlockquote>
      <PostHeading3>3-4. 부팅 시 자동 시작</PostHeading3>
      <PostParagraph>
        Termux:Boot 앱을 설치하면 기기 재부팅 후 자동으로 sshd를 실행할 수 있습니다.
      </PostParagraph>
      <PostCodeBlock
        code={
          '# ~/.termux/boot/ 디렉토리 생성\nmkdir -p ~/.termux/boot\n\n# 자동 시작 스크립트 작성\necho "sshd" > ~/.termux/boot/start-sshd.sh\nchmod +x ~/.termux/boot/start-sshd.sh'
        }
        language={"bash"}
      />
      <PostHorizontalRule />
      <PostHeading2>4. Termux로 이런 것도 가능해요</PostHeading2>
      <PostParagraph>
        Termux만으로도 다양한 프로젝트를 진행할 수 있습니다. 별도의 리눅스 배포판 설치 없이
        네이티브하게 사용할 수 있는 활용 사례들을 소개합니다.
      </PostParagraph>
      <PostHeading3>🐍 Python 개발 환경</PostHeading3>
      <PostCodeBlock
        code={"pkg install python\npip install flask requests numpy"}
        language={"bash"}
      />
      <PostUnorderedList>
        <PostListItem>
          <PostParagraph>
            <PostStrong>웹 서버 구축</PostStrong>: Flask, FastAPI로 간단한 API 서버
          </PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>
            <PostStrong>자동화 스크립트</PostStrong>: 파일 정리, 데이터 수집, 알림 봇
          </PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>
            <PostStrong>IoT 연동</PostStrong>: MQTT 클라이언트로 스마트홈 제어
          </PostParagraph>
        </PostListItem>
      </PostUnorderedList>
      <PostParagraph>
        {"📎 "}
        <PostLink href={"https://wiki.termux.com/wiki/Python"}>Termux Python 가이드</PostLink>
      </PostParagraph>
      <PostHeading3>🟢 Node.js 서버</PostHeading3>
      <PostCodeBlock code={"pkg install nodejs\nnpm install -g http-server"} language={"bash"} />
      <PostUnorderedList>
        <PostListItem>
          <PostParagraph>
            <PostStrong>로컬 웹 서버</PostStrong>: 정적 파일 호스팅
          </PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>
            <PostStrong>Express.js API</PostStrong>: REST API 서버 구축
          </PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>
            <PostStrong>개발 테스트</PostStrong>: 프론트엔드 프로젝트 로컬 테스트
          </PostParagraph>
        </PostListItem>
      </PostUnorderedList>
      <PostParagraph>
        {"📎 "}
        <PostLink href={"https://wiki.termux.com/wiki/Node.js"}>Termux Node.js 위키</PostLink>
      </PostParagraph>
      <PostHeading3>🗄️ 데이터베이스</PostHeading3>
      <PostCodeBlock
        code={"pkg install mariadb   # MySQL 호환\npkg install postgresql\npkg install redis"}
        language={"bash"}
      />
      <PostUnorderedList>
        <PostListItem>
          <PostParagraph>로컬 개발용 DB 서버로 활용</PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>간단한 데이터 저장소</PostParagraph>
        </PostListItem>
      </PostUnorderedList>
      <PostParagraph>
        {"📎 "}
        <PostLink href={"https://wiki.termux.com/wiki/MariaDB"}>Termux MariaDB 가이드</PostLink>
      </PostParagraph>
      <PostHeading3>🌐 웹 서버</PostHeading3>
      <PostCodeBlock code={"pkg install nginx\npkg install apache2"} language={"bash"} />
      <PostUnorderedList>
        <PostListItem>
          <PostParagraph>정적 웹사이트 호스팅</PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>리버스 프록시 설정</PostParagraph>
        </PostListItem>
      </PostUnorderedList>
      <PostParagraph>
        {"📎 "}
        <PostLink href={"https://wiki.termux.com/wiki/Nginx"}>Termux Nginx 위키</PostLink>
      </PostParagraph>
      <PostHeading3>📡 네트워크 도구</PostHeading3>
      <PostCodeBlock
        code={
          "pkg install nmap      # 네트워크 스캐닝\npkg install traceroute\npkg install netcat-openbsd"
        }
        language={"bash"}
      />
      <PostUnorderedList>
        <PostListItem>
          <PostParagraph>네트워크 진단 및 보안 테스트</PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>포트 스캐닝, 연결 테스트</PostParagraph>
        </PostListItem>
      </PostUnorderedList>
      <PostHeading3>🔧 개발 도구</PostHeading3>
      <PostCodeBlock
        code={
          "pkg install git vim tmux\npkg install clang      # C/C++ 컴파일러\npkg install rust       # Rust 개발\npkg install golang     # Go 개발"
        }
        language={"bash"}
      />
      <PostUnorderedList>
        <PostListItem>
          <PostParagraph>Git 서버로 활용 (git daemon)</PostParagraph>
        </PostListItem>
        <PostListItem>
          <PostParagraph>다양한 언어 개발 환경</PostParagraph>
        </PostListItem>
      </PostUnorderedList>
      <PostParagraph>
        {"📎 "}
        <PostLink href={"https://wiki.termux.com/wiki/Development_Environments"}>
          Termux 개발 환경 구축
        </PostLink>
      </PostParagraph>
      <PostHeading3>📱 Termux:API 활용</PostHeading3>
      <PostParagraph>
        {"F-Droid에서 "}
        <PostStrong>Termux:API</PostStrong>
        {" 앱을 추가로 설치하면:"}
      </PostParagraph>
      <PostCodeBlock
        code={
          "pkg install termux-api\n\n# 사용 예시\ntermux-battery-status    # 배터리 상태\ntermux-sms-send          # SMS 전송\ntermux-notification      # 알림 표시\ntermux-camera-photo      # 카메라 촬영\ntermux-location          # 위치 정보"
        }
        language={"bash"}
      />
      <PostParagraph>스크립트와 연동하면 강력한 자동화가 가능합니다!</PostParagraph>
      <PostParagraph>
        {"📎 "}
        <PostLink href={"https://wiki.termux.com/wiki/Termux:API"}>Termux:API 문서</PostLink>
      </PostParagraph>
      <PostHorizontalRule />
      <PostHeading2>마무리</PostHeading2>
      <PostParagraph>
        이렇게 해서 서랍 속 갤럭시탭이 리눅스 서버로 다시 태어났습니다. 가벼운 홈 자동화 서버, Git
        서버, 개발 테스트 환경 등 다양하게 활용할 수 있습니다.
      </PostParagraph>
      <PostParagraph>
        다음 글에서는 이 환경 위에 특정 서비스를 배포하는 방법을 다뤄보겠습니다.
      </PostParagraph>
      <PostParagraph>갤럭시탭, 이제 진짜 죽지 못합니다. 🔋</PostParagraph>
    </>
  );
};

export default JournalGalaxyTabNeverDiesPost;
