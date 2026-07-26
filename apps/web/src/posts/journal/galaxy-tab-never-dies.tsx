import { BlogPostDocument, type PostDocumentNode } from "@/components/blog/blog-post-document";

const nodes = [
  {
    type: "heading",
    depth: 1,
    children: [
      {
        type: "text",
        value: "갤럭시탭 넌 죽지못해",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "서랍 속에서 먼지만 쌓이고 있는 갤럭시탭, 혹시 있으신가요? 저도 그랬습니다. 새 태블릿을 사고 나면 이전 기기는 자연스럽게 방치되기 마련이죠. 하지만 이 녀석들, 아직 쓸모가 남아있습니다. 바로 ",
      },
      {
        type: "strong",
        children: [
          {
            type: "text",
            value: "Termux",
          },
        ],
      },
      {
        type: "text",
        value: "를 활용한 홈 서버로 재탄생시키는 것입니다.",
      },
    ],
  },
  {
    type: "thematicBreak",
  },
  {
    type: "heading",
    depth: 2,
    children: [
      {
        type: "text",
        value: "1. Termux란?",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "strong",
        children: [
          {
            type: "text",
            value: "Termux",
          },
        ],
      },
      {
        type: "text",
        value:
          "는 안드로이드 기기에서 리눅스 환경을 제공하는 터미널 에뮬레이터입니다. 루팅 없이도 사용할 수 있으며, apt 패키지 매니저를 통해 다양한 리눅스 패키지를 설치할 수 있습니다.",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "주요 특징:",
      },
    ],
  },
  {
    type: "list",
    ordered: false,
    start: null,
    children: [
      {
        type: "listItem",
        children: [
          {
            type: "paragraph",
            children: [
              {
                type: "strong",
                children: [
                  {
                    type: "text",
                    value: "루팅 불필요",
                  },
                ],
              },
              {
                type: "text",
                value: ": 일반 앱처럼 설치하고 바로 사용",
              },
            ],
          },
        ],
      },
      {
        type: "listItem",
        children: [
          {
            type: "paragraph",
            children: [
              {
                type: "strong",
                children: [
                  {
                    type: "text",
                    value: "패키지 매니저 지원",
                  },
                ],
              },
              {
                type: "text",
                value: ": ",
              },
              {
                type: "inlineCode",
                value: "pkg",
              },
              {
                type: "text",
                value: " 혹은 ",
              },
              {
                type: "inlineCode",
                value: "apt",
              },
              {
                type: "text",
                value: " 명령어로 패키지 관리",
              },
            ],
          },
        ],
      },
      {
        type: "listItem",
        children: [
          {
            type: "paragraph",
            children: [
              {
                type: "strong",
                children: [
                  {
                    type: "text",
                    value: "SSH, Python, Node.js, Git 등",
                  },
                ],
              },
              {
                type: "text",
                value: ": 개발 환경 구축 가능",
              },
            ],
          },
        ],
      },
      {
        type: "listItem",
        children: [
          {
            type: "paragraph",
            children: [
              {
                type: "strong",
                children: [
                  {
                    type: "text",
                    value: "proot-distro",
                  },
                ],
              },
              {
                type: "text",
                value: ": Ubuntu, Debian 등 다양한 리눅스 배포판 설치 가능",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "공식 사이트: ",
      },
      {
        type: "link",
        url: "https://termux.dev",
        title: null,
        children: [
          {
            type: "text",
            value: "https://termux.dev",
          },
        ],
      },
    ],
  },
  {
    type: "thematicBreak",
  },
  {
    type: "heading",
    depth: 2,
    children: [
      {
        type: "text",
        value: "2. Termux 설치 방법",
      },
    ],
  },
  {
    type: "heading",
    depth: 3,
    children: [
      {
        type: "text",
        value: "⚠️ 중요: Google Play 스토어 버전은 사용하지 마세요!",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "Google Play의 Termux는 ",
      },
      {
        type: "strong",
        children: [
          {
            type: "text",
            value: "2020년 이후 업데이트가 중단",
          },
        ],
      },
      {
        type: "text",
        value:
          "되었습니다. 오래된 버전은 패키지 설치 시 오류가 발생하고, 보안 취약점이 존재할 수 있습니다.",
      },
    ],
  },
  {
    type: "heading",
    depth: 3,
    children: [
      {
        type: "text",
        value: "✅ 권장: F-Droid에서 설치",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "link",
        url: "https://f-droid.org",
        title: null,
        children: [
          {
            type: "text",
            value: "F-Droid",
          },
        ],
      },
      {
        type: "text",
        value: "는 오픈소스 앱 마켓으로, Termux 개발자가 직접 최신 버전을 배포합니다.",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "strong",
        children: [
          {
            type: "text",
            value: "설치 순서:",
          },
        ],
      },
    ],
  },
  {
    type: "list",
    ordered: true,
    start: 1,
    children: [
      {
        type: "listItem",
        children: [
          {
            type: "paragraph",
            children: [
              {
                type: "strong",
                children: [
                  {
                    type: "text",
                    value: "알 수 없는 출처 앱 허용",
                  },
                ],
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            start: null,
            children: [
              {
                type: "listItem",
                children: [
                  {
                    type: "paragraph",
                    children: [
                      {
                        type: "inlineCode",
                        value: "설정",
                      },
                      {
                        type: "text",
                        value: " → ",
                      },
                      {
                        type: "inlineCode",
                        value: "보안",
                      },
                      {
                        type: "text",
                        value: " (또는 ",
                      },
                      {
                        type: "inlineCode",
                        value: "개인정보 보호",
                      },
                      {
                        type: "text",
                        value: ") → ",
                      },
                      {
                        type: "inlineCode",
                        value: "알 수 없는 출처",
                      },
                      {
                        type: "text",
                        value: " 활성화",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        type: "listItem",
        children: [
          {
            type: "paragraph",
            children: [
              {
                type: "strong",
                children: [
                  {
                    type: "text",
                    value: "F-Droid 설치",
                  },
                ],
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            start: null,
            children: [
              {
                type: "listItem",
                children: [
                  {
                    type: "paragraph",
                    children: [
                      {
                        type: "text",
                        value: "브라우저에서 ",
                      },
                      {
                        type: "link",
                        url: "https://f-droid.org",
                        title: null,
                        children: [
                          {
                            type: "text",
                            value: "f-droid.org",
                          },
                        ],
                      },
                      {
                        type: "text",
                        value: " 접속",
                      },
                    ],
                  },
                ],
              },
              {
                type: "listItem",
                children: [
                  {
                    type: "paragraph",
                    children: [
                      {
                        type: "inlineCode",
                        value: "Download F-Droid",
                      },
                      {
                        type: "text",
                        value: " 버튼으로 APK 다운로드 → 설치",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        type: "listItem",
        children: [
          {
            type: "paragraph",
            children: [
              {
                type: "strong",
                children: [
                  {
                    type: "text",
                    value: "Termux 검색 및 설치",
                  },
                ],
              },
            ],
          },
          {
            type: "list",
            ordered: false,
            start: null,
            children: [
              {
                type: "listItem",
                children: [
                  {
                    type: "paragraph",
                    children: [
                      {
                        type: "text",
                        value: 'F-Droid 앱 실행 → "Termux" 검색 → 설치',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    type: "blockquote",
    children: [
      {
        type: "paragraph",
        children: [
          {
            type: "strong",
            children: [
              {
                type: "text",
                value: "Tip",
              },
            ],
          },
          {
            type: "text",
            value: ": Termux:API, Termux:Styling 같은 애드온도 F-Droid에서 함께 설치하면 좋습니다.",
          },
        ],
      },
    ],
  },
  {
    type: "thematicBreak",
  },
  {
    type: "heading",
    depth: 2,
    children: [
      {
        type: "text",
        value: "3. Termux 초기 세팅",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "설치가 끝났다면, 먼저 패키지를 업데이트하고 SSH 서버를 설정합니다.",
      },
    ],
  },
  {
    type: "heading",
    depth: 3,
    children: [
      {
        type: "text",
        value: "3-1. 패키지 업데이트",
      },
    ],
  },
  {
    type: "code",
    language: "bash",
    value:
      "# 저장소 변경 (미러 선택 화면이 나오면 가까운 지역 선택)\ntermux-change-repo\n\n# 패키지 업데이트\npkg update && pkg upgrade -y",
  },
  {
    type: "heading",
    depth: 3,
    children: [
      {
        type: "text",
        value: "3-2. 기본 패키지 설치",
      },
    ],
  },
  {
    type: "code",
    language: "bash",
    value: "# 자주 사용하는 기본 도구들\npkg install -y openssh vim git curl wget",
  },
  {
    type: "heading",
    depth: 3,
    children: [
      {
        type: "text",
        value: "3-3. SSH 서버 설정 (sshd)",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "외부에서 태블릿에 접속하려면 SSH 서버가 필요합니다.",
      },
    ],
  },
  {
    type: "code",
    language: "bash",
    value: "# SSH 서버 시작 (기본 포트: 8022)\nsshd\n\n# 비밀번호 설정\npasswd",
  },
  {
    type: "paragraph",
    children: [
      {
        type: "strong",
        children: [
          {
            type: "text",
            value: "접속 방법:",
          },
        ],
      },
    ],
  },
  {
    type: "code",
    language: "bash",
    value: "# 다른 기기에서 접속 (태블릿 IP 확인: ifconfig)\nssh -p 8022 사용자명@태블릿IP",
  },
  {
    type: "blockquote",
    children: [
      {
        type: "paragraph",
        children: [
          {
            type: "strong",
            children: [
              {
                type: "text",
                value: "참고",
              },
            ],
          },
          {
            type: "text",
            value: ": Termux의 SSH는 8022 포트를 사용합니다 (기본 22번 아님).",
          },
        ],
      },
    ],
  },
  {
    type: "heading",
    depth: 3,
    children: [
      {
        type: "text",
        value: "3-4. 부팅 시 자동 시작",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "Termux:Boot 앱을 설치하면 기기 재부팅 후 자동으로 sshd를 실행할 수 있습니다.",
      },
    ],
  },
  {
    type: "code",
    language: "bash",
    value:
      '# ~/.termux/boot/ 디렉토리 생성\nmkdir -p ~/.termux/boot\n\n# 자동 시작 스크립트 작성\necho "sshd" > ~/.termux/boot/start-sshd.sh\nchmod +x ~/.termux/boot/start-sshd.sh',
  },
  {
    type: "thematicBreak",
  },
  {
    type: "heading",
    depth: 2,
    children: [
      {
        type: "text",
        value: "4. Termux로 이런 것도 가능해요",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "Termux만으로도 다양한 프로젝트를 진행할 수 있습니다. 별도의 리눅스 배포판 설치 없이 네이티브하게 사용할 수 있는 활용 사례들을 소개합니다.",
      },
    ],
  },
  {
    type: "heading",
    depth: 3,
    children: [
      {
        type: "text",
        value: "🐍 Python 개발 환경",
      },
    ],
  },
  {
    type: "code",
    language: "bash",
    value: "pkg install python\npip install flask requests numpy",
  },
  {
    type: "list",
    ordered: false,
    start: null,
    children: [
      {
        type: "listItem",
        children: [
          {
            type: "paragraph",
            children: [
              {
                type: "strong",
                children: [
                  {
                    type: "text",
                    value: "웹 서버 구축",
                  },
                ],
              },
              {
                type: "text",
                value: ": Flask, FastAPI로 간단한 API 서버",
              },
            ],
          },
        ],
      },
      {
        type: "listItem",
        children: [
          {
            type: "paragraph",
            children: [
              {
                type: "strong",
                children: [
                  {
                    type: "text",
                    value: "자동화 스크립트",
                  },
                ],
              },
              {
                type: "text",
                value: ": 파일 정리, 데이터 수집, 알림 봇",
              },
            ],
          },
        ],
      },
      {
        type: "listItem",
        children: [
          {
            type: "paragraph",
            children: [
              {
                type: "strong",
                children: [
                  {
                    type: "text",
                    value: "IoT 연동",
                  },
                ],
              },
              {
                type: "text",
                value: ": MQTT 클라이언트로 스마트홈 제어",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "📎 ",
      },
      {
        type: "link",
        url: "https://wiki.termux.com/wiki/Python",
        title: null,
        children: [
          {
            type: "text",
            value: "Termux Python 가이드",
          },
        ],
      },
    ],
  },
  {
    type: "heading",
    depth: 3,
    children: [
      {
        type: "text",
        value: "🟢 Node.js 서버",
      },
    ],
  },
  {
    type: "code",
    language: "bash",
    value: "pkg install nodejs\nnpm install -g http-server",
  },
  {
    type: "list",
    ordered: false,
    start: null,
    children: [
      {
        type: "listItem",
        children: [
          {
            type: "paragraph",
            children: [
              {
                type: "strong",
                children: [
                  {
                    type: "text",
                    value: "로컬 웹 서버",
                  },
                ],
              },
              {
                type: "text",
                value: ": 정적 파일 호스팅",
              },
            ],
          },
        ],
      },
      {
        type: "listItem",
        children: [
          {
            type: "paragraph",
            children: [
              {
                type: "strong",
                children: [
                  {
                    type: "text",
                    value: "Express.js API",
                  },
                ],
              },
              {
                type: "text",
                value: ": REST API 서버 구축",
              },
            ],
          },
        ],
      },
      {
        type: "listItem",
        children: [
          {
            type: "paragraph",
            children: [
              {
                type: "strong",
                children: [
                  {
                    type: "text",
                    value: "개발 테스트",
                  },
                ],
              },
              {
                type: "text",
                value: ": 프론트엔드 프로젝트 로컬 테스트",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "📎 ",
      },
      {
        type: "link",
        url: "https://wiki.termux.com/wiki/Node.js",
        title: null,
        children: [
          {
            type: "text",
            value: "Termux Node.js 위키",
          },
        ],
      },
    ],
  },
  {
    type: "heading",
    depth: 3,
    children: [
      {
        type: "text",
        value: "🗄️ 데이터베이스",
      },
    ],
  },
  {
    type: "code",
    language: "bash",
    value: "pkg install mariadb   # MySQL 호환\npkg install postgresql\npkg install redis",
  },
  {
    type: "list",
    ordered: false,
    start: null,
    children: [
      {
        type: "listItem",
        children: [
          {
            type: "paragraph",
            children: [
              {
                type: "text",
                value: "로컬 개발용 DB 서버로 활용",
              },
            ],
          },
        ],
      },
      {
        type: "listItem",
        children: [
          {
            type: "paragraph",
            children: [
              {
                type: "text",
                value: "간단한 데이터 저장소",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "📎 ",
      },
      {
        type: "link",
        url: "https://wiki.termux.com/wiki/MariaDB",
        title: null,
        children: [
          {
            type: "text",
            value: "Termux MariaDB 가이드",
          },
        ],
      },
    ],
  },
  {
    type: "heading",
    depth: 3,
    children: [
      {
        type: "text",
        value: "🌐 웹 서버",
      },
    ],
  },
  {
    type: "code",
    language: "bash",
    value: "pkg install nginx\npkg install apache2",
  },
  {
    type: "list",
    ordered: false,
    start: null,
    children: [
      {
        type: "listItem",
        children: [
          {
            type: "paragraph",
            children: [
              {
                type: "text",
                value: "정적 웹사이트 호스팅",
              },
            ],
          },
        ],
      },
      {
        type: "listItem",
        children: [
          {
            type: "paragraph",
            children: [
              {
                type: "text",
                value: "리버스 프록시 설정",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "📎 ",
      },
      {
        type: "link",
        url: "https://wiki.termux.com/wiki/Nginx",
        title: null,
        children: [
          {
            type: "text",
            value: "Termux Nginx 위키",
          },
        ],
      },
    ],
  },
  {
    type: "heading",
    depth: 3,
    children: [
      {
        type: "text",
        value: "📡 네트워크 도구",
      },
    ],
  },
  {
    type: "code",
    language: "bash",
    value:
      "pkg install nmap      # 네트워크 스캐닝\npkg install traceroute\npkg install netcat-openbsd",
  },
  {
    type: "list",
    ordered: false,
    start: null,
    children: [
      {
        type: "listItem",
        children: [
          {
            type: "paragraph",
            children: [
              {
                type: "text",
                value: "네트워크 진단 및 보안 테스트",
              },
            ],
          },
        ],
      },
      {
        type: "listItem",
        children: [
          {
            type: "paragraph",
            children: [
              {
                type: "text",
                value: "포트 스캐닝, 연결 테스트",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    type: "heading",
    depth: 3,
    children: [
      {
        type: "text",
        value: "🔧 개발 도구",
      },
    ],
  },
  {
    type: "code",
    language: "bash",
    value:
      "pkg install git vim tmux\npkg install clang      # C/C++ 컴파일러\npkg install rust       # Rust 개발\npkg install golang     # Go 개발",
  },
  {
    type: "list",
    ordered: false,
    start: null,
    children: [
      {
        type: "listItem",
        children: [
          {
            type: "paragraph",
            children: [
              {
                type: "text",
                value: "Git 서버로 활용 (git daemon)",
              },
            ],
          },
        ],
      },
      {
        type: "listItem",
        children: [
          {
            type: "paragraph",
            children: [
              {
                type: "text",
                value: "다양한 언어 개발 환경",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "📎 ",
      },
      {
        type: "link",
        url: "https://wiki.termux.com/wiki/Development_Environments",
        title: null,
        children: [
          {
            type: "text",
            value: "Termux 개발 환경 구축",
          },
        ],
      },
    ],
  },
  {
    type: "heading",
    depth: 3,
    children: [
      {
        type: "text",
        value: "📱 Termux:API 활용",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "F-Droid에서 ",
      },
      {
        type: "strong",
        children: [
          {
            type: "text",
            value: "Termux:API",
          },
        ],
      },
      {
        type: "text",
        value: " 앱을 추가로 설치하면:",
      },
    ],
  },
  {
    type: "code",
    language: "bash",
    value:
      "pkg install termux-api\n\n# 사용 예시\ntermux-battery-status    # 배터리 상태\ntermux-sms-send          # SMS 전송\ntermux-notification      # 알림 표시\ntermux-camera-photo      # 카메라 촬영\ntermux-location          # 위치 정보",
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "스크립트와 연동하면 강력한 자동화가 가능합니다!",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "📎 ",
      },
      {
        type: "link",
        url: "https://wiki.termux.com/wiki/Termux:API",
        title: null,
        children: [
          {
            type: "text",
            value: "Termux:API 문서",
          },
        ],
      },
    ],
  },
  {
    type: "thematicBreak",
  },
  {
    type: "heading",
    depth: 2,
    children: [
      {
        type: "text",
        value: "마무리",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value:
          "이렇게 해서 서랍 속 갤럭시탭이 리눅스 서버로 다시 태어났습니다. 가벼운 홈 자동화 서버, Git 서버, 개발 테스트 환경 등 다양하게 활용할 수 있습니다.",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "다음 글에서는 이 환경 위에 특정 서비스를 배포하는 방법을 다뤄보겠습니다.",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "갤럭시탭, 이제 진짜 죽지 못합니다. 🔋",
      },
    ],
  },
] satisfies PostDocumentNode[];

const JournalGalaxyTabNeverDiesPost = () => {
  return <BlogPostDocument nodes={nodes} />;
};

export default JournalGalaxyTabNeverDiesPost;
