import type {
  ResumeContentDto,
  ResumeLocale,
  ResumeDetailDto,
} from '../../resume/resume.dto';

// 초기 공개 원본을 고정하여 migration 실행 시 웹 소스에 의존하지 않는다.
export const resumeDocumentSnapshot: (ResumeContentDto & {
  locale: ResumeLocale;
})[] = [
  {
    locale: 'ko-KR',
    name: '이상민',
    title: '비즈니스 가치를 만들고, 팀의 고통을 줄이는 개발자',
    contact: {
      phone: '+821020809652',
      email: 'red9runge@gmail.com',
    },
    introduction: [
      '안녕하세요. 프론트엔드를 중심으로 제품과 운영에 필요한 기능을 개발해 온 이상민입니다.',
      '커머스, 모바일 WebView, 보험, 웹게임 등 다양한 경험을 했고, 최근에는 의료·임상 분석 제품을 개발하며 화면의 반응형·접근성·성능뿐 아니라 배포와 로그 저장·요청 추적까지 제품에 필요한 작업을 직접 맡고 있습니다.',
      'AI 개발 보조 도구는 코드 생성에만 사용하지 않습니다.',
      '운영팀에 필요한 기능을 시스템화하며, 프로젝트별 지침·Skill·Hook·PR 검증 기준을 두고, LLM Wiki와 MCP를 통해 Codex·Claude가 참고하게 했습니다.',
      '기술 자체보다 그 선택이 사용자와 팀의 다음 작업을 어떻게 바꾸는지를 중요하게 생각합니다.',
    ],
    totalExperience: '7년 5개월',
    careers: [
      {
        id: 'oprimed',
        company: '주식회사오프리메드',
        period: '2026.02 - 재직 중',
        employmentType: '정규직',
        role: '풀스택 개발자',
        projects: [
          {
            id: 'medicalFrontendProductization',
            title: '의료·임상 분석 제품',
            descriptions: [
              {
                subtitle: '의료·임상 분석 화면 개발',
                detail:
                  '의료·임상 분석 제품의 화면 개발과 접근성·성능 개선, 개발 환경 개선과 백엔드 작업을 함께 맡고 있습니다.',
                tasks: [
                  '긴 분석 과정에서 조건 설정부터 결과 확인까지 이어지도록 입력·실행·결과·리포트 화면과 ECharts·Plotly 기반 비교 차트를 개발했습니다.',
                  '화면 크기가 달라지거나 오류 후 재진입해도 사용자가 작업을 이어갈 수 있도록, 기획서에 없던 반응형·오류·재진입 동작을 제안하고 기획·디자인·백엔드 담당자와 정해 적용했습니다.',
                  '입력 항목이 많은 화면에서 반복 입력과 마우스 이동의 피로를 줄이기 위해 키보드 탭 이동과 import 기능을 추가했습니다.',
                  '이미지 요청과 UI 수정 범위를 줄이기 위해 이미지 기반 UI를 공통 컴포넌트로 바꾸고, 정적 이미지를 화면 크기별 WebP로 변환하는 빌드 작업을 추가했습니다. 빌드 기준 이미지 전송 용량은 계산상 약 95% 줄었고, 별도 Lighthouse 비교에서 LCP는 1.3초에서 1.0초, Speed Index는 3.4초에서 0.7초로 줄었습니다.',
                  '같은 질병 목록을 화면마다 다시 요청하지 않도록 직접 조회 코드를 공통 TanStack Query hook으로 바꾸고, 캐시와 재요청 기준을 한곳에서 관리했습니다.',
                ],
              },
              {
                subtitle: 'AI 개발 도구 활용 경험',
                tasks: [
                  'AI가 의료·임상 용어와 화면 동작을 임의로 해석하지 않도록 프로젝트 지침, 작업별 Skill, 실행 Hook, PR 규칙을 저장소에 두고 Codex와 Claude가 참고하게 했습니다.',
                  '비개발 직군도 도메인 자료를 쉽게 이해할 수 있도록 기획·히스토리 문서를 Markdown으로 옮기고, Codex·Claude에서 검색할 수 있는 로컬 LLM Wiki 기반으로 MCP 서버를 만들어 배포했습니다.',
                ],
              },
              {
                subtitle: '개발 환경과 백엔드 운영',
                skills:
                  'Next.js, React, TypeScript, Tailwind CSS, Radix UI, TanStack Query, Zustand, React Hook Form, ECharts, Plotly, Vitest, Playwright, axe-core, GitHub Actions, Husky, Docker, Python, Django, Django REST Framework, PostgreSQL, Codex, Claude, MCP',
                tasks: [
                  'Vite·Next.js Pages Router 기반으로 나뉘어 구조와 코드 작성 방식이 달랐던 프론트엔드 프로젝트 4개의 구조와 배포 흐름을 통일하고, 기존 코드를 공통 코딩 컨벤션에 맞춰 수정했습니다.',
                  '수동 Docker 배포를 GitHub Actions로 전환하는 작업을 주도했으며, 배포 후 백엔드 HTTP 응답과 컨테이너 상태에 이상이 있으면 Actions Summary와 로그를 남기게 했습니다.',
                  '타입·테스트·빌드 오류가 원격 브랜치에 올라가지 않도록 Husky pre-commit·pre-push에 typecheck·test·build를 연결했습니다.',
                  '서비스 오류를 제품·환경·요청 단위로 추적하기 위해 세 백엔드의 로그를 업무 DB와 분리해 환경·서비스·요청 ID별로 저장했습니다. Admin에는 로그 조회와 프론트엔드 오류 보고 API를 추가하고, 프론트엔드 오류 유형을 서버 로그와 연결할 수 있게 매핑했습니다.',
                ],
              },
            ],
            fileRef: 'oprimed-medical-frontend-productization',
          },
        ],
      },
      {
        id: 'codecrayon',
        company: '주식회사 코드크레용',
        period: '2023.05 - 2025.07 (2년 3개월)',
        employmentType: '정규직',
        role: '프론트엔드 개발',
        projects: [
          {
            id: 'shortimePlayground',
            title: 'WebView 제품과 웹게임',
            descriptions: [
              {
                subtitle: 'WebView 제품과 웹게임',
                tasks: [
                  '영상 플랫폼에 반복해서 방문할 콘텐츠가 필요했지만 이벤트·게임을 앱에 넣으면 변경할 때마다 앱 배포를 기다려야 했습니다. WebView Playground를 제안해 프로토타입으로 시연했고, 채택 후에는 전용 프론트엔드 프로젝트 구축을 주도했습니다. 이후 운세·이벤트를 옮기고 기프트 코드·럭키드로우·설문으로 확장했습니다.',
                  '사용자가 영상 시청 외에도 앱에서 가볍게 즐기고 다시 방문할 콘텐츠가 필요했습니다. Phaser 기반 플라잉팝과 보너스를 사용하는 열려라 참깨를 개발했습니다. 당시 DB 확인에 대한 본인 회고 기준 두 게임의 주간 고유 이용자는 약 2,000~3,000명이었습니다.',
                  '앱·백엔드 담당자와 Flutter bridge·게임 API를 연동하고, 광고 완료·딥링크·Safari 오디오·중복 진행·timeout 문제를 처리했습니다.',
                ],
              },
            ],
            fileRef: 'shortime-playground',
          },
          {
            id: 'subtitleSystem',
            title: 'AI 활용과 콘텐츠 운영 도구',
            descriptions: [
              {
                subtitle: 'AI 활용과 콘텐츠 운영 도구',
                tasks: [
                  '운영팀이 에피소드별 자막을 8개 언어로 반복 번역하는 부담을 줄이기 위해 CLI를 웹 도구로 옮기고 숏타임 백오피스에 편입했습니다. 본인 회고 기준 1명이 에피소드 1편에 약 3일 쓰던 작업을 하루 6~8편 처리하는 수준으로 바꿨습니다.',
                  '사용자 리텐션을 높일 콘텐츠를 확보하고 백링크를 활용한 SEO 유입 전략을 검증하기 위해, 셀렉터스 상품 블로그 초안을 AI로 생성하는 프로토타입을 제작했습니다.',
                  '운영팀이 세 영상 플랫폼을 반복 검색하는 시간을 줄이기 위해 후보 영상을 한 화면에 모았습니다. 비슷한 키워드 수에서 약 50분 걸리던 확인이 10분 이내가 됐다는 운영자 피드백을 받았습니다.',
                ],
              },
            ],
            fileRef: 'translate',
          },
          {
            id: 'commerceBackoffice',
            title: '고객용 커머스',
            descriptions: [
              {
                subtitle: '고객용 커머스',
                detail:
                  '초기 멤버로 고객용 커머스와 판매자·운영자 화면, 모바일 WebView·웹게임, 콘텐츠 운영 도구를 프론트엔드 중심으로 개발했습니다.',
                tasks: [
                  '국내외 사용자가 각자의 언어와 결제 환경에서 주문할 수 있도록 한국어·일본어·영어·번체 중국어를 제공하고, 해외 사용자 여부에 따라 국내 결제수단과 해외 카드·PayPal을 나눴습니다. 국가별 주소 입력과 해외 배송비도 주문 흐름에 연결했습니다.',
                  '결제 이후에도 선물 수령부터 구매 확정, 클레임, 리뷰까지 이어지는 전체 흐름이 필요했습니다. 선물 수령·취소와 구매 확정, 반품·교환·환불과 부분 반품 금액 처리, 리뷰 목록·작성·수정과 사진 리뷰를 개발하고, 구매 확정 여부·동일 상품 주문 항목·반품 상태에 따라 리뷰 작성 조건을 나눴습니다.',
                  '주 이용 환경이 모바일이었고 PC·모바일 화면을 각각 개발하는 공수가 다른 제품 작업에 영향을 주고 있었습니다. 고객 화면은 PC에서도 같은 App-like 모바일 UI를 사용하도록 구성했습니다.',
                  '라이브 판매 참여자가 판매 흐름을 놓치지 않고 새로운 참여를 빠르게 인지할 수 있도록 상품·참여 상태를 5초마다 갱신했습니다. 신규 참여에는 confetti와 직접 제안한 AWS Polly 음성 안내를 연결했습니다.',
                  '카테고리와 셀러샵의 무한 스크롤·목록 상태 복원을 함께 설계·구현했습니다.',
                ],
              },
              {
                subtitle: '판매자 화면과 운영자 백오피스',
                skills:
                  'Next.js, React, TypeScript, MUI, Tailwind CSS, Jotai, SWR, React Hook Form, Toss Payments, PayPal, Phaser, Flutter InAppWebView, Branch.io, Airbridge, Node.js, Express, AWS Bedrock, OpenAI API, Google Cloud Translation, Axios, Cheerio',
                tasks: [
                  '판매자가 상품과 여러 주문 정보를 넓은 화면에서 확인하고 직접 처리할 수 있도록 데스크톱 레이아웃의 상품·배송 설정과 주문·취소·교환·환불 화면을 개발했습니다.',
                  '기존 담당자의 앱 개발 이동과 운영 요청 대응을 위해 Flutter Web 백오피스를 Next.js로 한 번에 교체하고 프론트엔드 구현을 단독으로 맡았습니다.',
                  '운영팀이 상품·셀러 승인과 주문·클레임·정산·문의, 배너·검색 키워드를 직접 관리하도록 화면을 이관·개발하고 검색 초기화·Excel 내보내기·드래그 정렬을 추가했습니다.',
                ],
              },
            ],
            fileRef: 'commerce-backoffice-product',
          },
        ],
      },
      {
        id: 'allofthem',
        company: 'all of them Co., Ltd. · Japan',
        period: '2021.07 - 2023.04 (1년 10개월)',
        employmentType: '정규직',
        role: '프론트엔드 개발자',
        projects: [
          {
            id: 'insuranceSubscription',
            title: '공통 가입 진입과 성능 개선',
            descriptions: [
              {
                subtitle: '공통 가입 진입과 성능 개선',
                tasks: [
                  '여러 고객사 페이지에서 같은 보험 가입 모달을 재사용할 수 있도록 공통 CDN SDK를 만들었습니다. API key와 노출 옵션은 설정으로 받고, 상품별 화면 자산은 planId 경로로 분리했습니다.',
                  '가입 화면에서 흰 화면과 로더가 약 5초간 보여 초기 조회를 Promise.all로 묶고 고객 정보 조회를 앞당겼습니다. 추가 개선을 위해 담당 흐름을 Next.js로 옮겨 초기 데이터를 SSR에서 처리했으며, Lighthouse LCP 1.2초와 일본 현지 진입 시간 1.2~1.5초를 확인한 뒤 배포했습니다.',
                ],
              },
            ],
            fileRef: 'allofthem-insurance-platform',
          },
          {
            id: 'insuranceResponsive',
            title: '가입·운영 시스템',
            descriptions: [
              {
                subtitle: '가입·운영 시스템',
                skills:
                  'React, Next.js, TypeScript, Redux, Context API, Java, Spring Boot, Doma2, MySQL, Redis, GraphQL, DynamoDB, S3, Sass, GitLab CI/CD',
                tasks: [
                  '사용자가 보험료 확인부터 신청 완료까지 온라인에서 이어서 진행할 수 있도록 직업 기반 보험료 산정, 가입자 정보·고지, 카드 결제를 연결했습니다. 가입 단계가 긴 별도 암·입원보험에는 중도 저장·복원을 적용하고, 복원 시 카드 정보는 초기화했습니다.',
                  '운영자가 보험 고객·거래·가입 이력과 계약·대리점 정보를 조회하고 파일 업무를 처리할 수 있도록 관리자 시스템과 별도 백오피스를 개발했습니다. 검색·상세 화면과 Spring 백엔드, CSV 파일 S3 저장 모듈, 지점·모집인·계약·결제·보험료 청구서 조회와 파일 업로드를 맡았습니다.',
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'datalogics',
        company: '데이터로직스',
        period: '2020.08 - 2021.07 (1년)',
        employmentType: '정규직',
        role: '운영/유지보수 및 개발',
        projects: [
          {
            id: 'consularCallCenter',
            title: '외교부 영사콜센터 유지보수',
            descriptions: [
              {
                subtitle: '외교부 영사콜센터 유지보수',
                tasks: [
                  '영사콜센터의 운영 요구와 장애에 대응하기 위해 상담 애플리케이션의 기능 개선·버그 수정과 무료전화 앱 트러블슈팅을 맡았습니다. 설문 조사용 JSP 화면과 DB 배치 서버 연계 API도 개발했습니다.',
                ],
              },
            ],
          },
          {
            id: 'smartDis',
            title: 'Smart-DIS 데이터 마이그레이션과 실행 환경 전환',
            period: '2020.08 - 2020.09',
            descriptions: [
              {
                subtitle: 'Smart-DIS 데이터 마이그레이션과 실행 환경 전환',
                skills:
                  'Java, JavaScript, JSP, eGovFrame, MyBatis, MariaDB, Oracle, Linux, HTML, CSS',
                tasks: [
                  'Smart-DIS를 데이터베이스·운영체제·네트워크 환경이 다른 기관에도 배포할 수 있도록 데이터 마이그레이션 기능을 개발하고 Oracle 쿼리를 MariaDB에서도 동작하게 했습니다. Linux 전용 기능은 Windows로 옮기고, 폐쇄망에서는 온라인 라이브러리를 대체한 뒤 운영 매뉴얼을 작성했습니다.',
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'datalogicsInfra',
        company: '데이터로직스',
        period: '2017.08 - 2019.05 (1년 10개월)',
        employmentType: '정규직',
        role: '인프라 엔지니어',
        projects: [
          {
            id: 'policyCoordination',
            title: '공공기관 인프라 구축과 운영',
            descriptions: [
              {
                subtitle: '공공기관 인프라 구축과 운영',
                skills:
                  'Linux, Server, Network, L2/L3, Firewall, IPS, TMS, Backup',
                tasks: [
                  '공공기관 시스템의 장애와 감사에 대응할 수 있도록 국무조정실의 세종·서울 서버와 네트워크·보안·백업 장비를 운영하고, 장애 복구·보안 감사·국정감사 준비를 맡았습니다.',
                ],
              },
            ],
          },
          {
            id: 'socialSecurity',
            title: '사회보장정보원 고도화 사업',
            period: '2018.01 - 2018.02',
            descriptions: [
              {
                subtitle: '사회보장정보원 고도화 사업',
                tasks: [
                  '신규 장비와 기관을 운영 일정에 맞춰 개통하기 위해 사회보장정보원 고도화 사업에서 장비 검수·마운팅·설치 테스트를 맡았습니다.',
                ],
              },
            ],
          },
          {
            id: 'childProtection',
            title: '아동보호전문기관 구축 및 유지보수',
            period: '2017.08 - 2017.12',
            descriptions: [
              {
                subtitle: '아동보호전문기관 구축 및 유지보수',
                tasks: [
                  '아동보호전문기관의 콜센터 이전과 신규 기관 개소에서는 장비 이전과 인프라 구축을 진행했습니다.',
                ],
              },
            ],
          },
        ],
      },
    ],
    education: [
      {
        school: '서일대학교',
        period: '2010.03 - 2017.02',
        status: '졸업',
        major: '정보통신학과',
      },
    ],
    skills: [
      'React',
      'CSS',
      'JavaScript',
      'TypeScript',
      'HTML5',
      'Java',
      'Spring Boot',
      'Spring Framework',
      'AWS',
      'Git',
      'GitLab',
      'MySQL',
      'Figma',
      'GraphQL',
    ],
    certifications: [
      {
        name: '하이브리드 앱 및 웹 개발자 양성과정',
        date: '2020.03',
        type: '기타',
        details: [
          '인프라에서 개발 직무로 전환하기 위해 Java·Spring 기반 웹과 REST API, Android·iOS 앱 개발 기초를 학습했습니다.',
        ],
      },
    ],
    links: [
      'https://vscoke.icecoke.kr/ko-KR',
      'https://github.com/icecokel',
      'https://vscoke.icecoke.kr/ko-KR/blog/dashboard',
    ],
    personalProjects: [
      {
        id: 'worxphere',
        title: '웍스피어 채용 파이프라인 보드',
        description:
          '2026.08 · 가상 지원자 1,000건을 다루는 개인 과제입니다. 단계 변경의 확인·실패 복구, 전체 검색과 성능 검증의 판단 근거를 기록했습니다.',
        fileRef: 'worxphere-recruitment-board',
      },
    ],
    lastUpdated: '2026.09',
  },
  {
    locale: 'en-US',
    name: 'Sangmin Lee',
    title:
      'A developer who creates business value and reduces team pain points',
    contact: {
      phone: '+821020809652',
      email: 'red9runge@gmail.com',
    },
    introduction: [
      "Hello, I'm Sangmin Lee. I have developed the product and operational features teams need, with a focus on frontend development.",
      'I have worked across commerce, mobile WebView, insurance, and web games. More recently, while building medical and clinical analysis products, I have taken on responsive behavior, accessibility, and performance as well as deployment, log storage, and request tracing.',
      'I use AI development assistants for more than code generation.',
      'I systematized features needed by operations teams and set project-specific instructions, Skills, Hooks, and PR validation rules, making them available to Codex and Claude through an LLM Wiki and MCP.',
      "I care more about how a technical choice changes the user's and team's next task than about the technology itself.",
    ],
    totalExperience: '7 years 5 months',
    careers: [
      {
        id: 'oprimed',
        company: 'Oprimed Co., Ltd.',
        period: '2026.02 - Present',
        employmentType: 'Full-time',
        role: 'Full-Stack Developer',
        projects: [
          {
            id: 'medicalFrontendProductization',
            title: 'Medical and Clinical Analysis Products',
            descriptions: [
              {
                subtitle: 'Medical and Clinical Analysis Screen Development',
                detail:
                  'I work on screens, accessibility and performance improvements, development environments, and backend tasks for medical and clinical analysis products.',
                tasks: [
                  'I developed input, execution, result, and report screens plus ECharts and Plotly comparison charts so users could move from condition setup through result review across long-running analyses.',
                  'To let users continue when the viewport changed or they returned after an error, I proposed responsive, error, and re-entry behavior that was missing from the plan and defined and applied it with product, design, and backend teammates.',
                  'To reduce repetitive input and mouse movement on input-heavy screens, I added keyboard tab navigation and import features.',
                  'To reduce image requests and the scope of UI changes, I replaced image-based UI with shared components and added a build task that converts static images into viewport-specific WebP assets. Calculated image transfer size fell by about 95%, while a separate Lighthouse comparison reduced LCP from 1.3 to 1.0 seconds and Speed Index from 3.4 to 0.7 seconds.',
                  'To avoid requesting the same disease list on every screen, I replaced direct requests with a shared TanStack Query hook and managed cache and refetch rules in one place.',
                ],
              },
              {
                subtitle: 'AI Development Tooling Experience',
                tasks: [
                  'To keep AI from interpreting medical and clinical terminology and screen behavior on its own, I stored project instructions, task-specific Skills, execution Hooks, and PR rules in the repositories for Codex and Claude to reference.',
                  'To make domain material easier for non-engineering roles to understand, I converted planning and history documents to Markdown and built and deployed an MCP server backed by a local LLM Wiki searchable from Codex and Claude.',
                ],
              },
              {
                subtitle: 'Development Environment and Backend Operations',
                skills:
                  'Next.js, React, TypeScript, Tailwind CSS, Radix UI, TanStack Query, Zustand, React Hook Form, ECharts, Plotly, Vitest, Playwright, axe-core, GitHub Actions, Husky, Docker, Python, Django, Django REST Framework, PostgreSQL, Codex, Claude, MCP',
                tasks: [
                  'I unified the structure and deployment flow of four frontend projects split between Vite and Next.js Pages Router, then updated the existing code to a shared coding convention.',
                  'I led the move from manual Docker deployment to GitHub Actions and made the workflow leave an Actions Summary and logs when backend HTTP responses or container status were abnormal after deployment.',
                  'I connected typecheck, test, and build to Husky pre-commit and pre-push so type, test, and build failures could not reach remote branches.',
                  'To trace service errors by product, environment, and request, I separated logs from business databases across three backends and stored them by environment, service, and request ID. In Admin, I added log-query and frontend error-reporting APIs and mapped frontend error types to server logs.',
                ],
              },
            ],
            fileRef: 'oprimed-medical-frontend-productization',
          },
        ],
      },
      {
        id: 'codecrayon',
        company: 'CodeCrayon',
        period: '2023.05 - 2025.07 (2 years 3 months)',
        employmentType: 'Full-time',
        role: 'Frontend Development',
        projects: [
          {
            id: 'shortimePlayground',
            title: 'WebView Products and Web Games',
            descriptions: [
              {
                subtitle: 'WebView Products and Web Games',
                tasks: [
                  'The video platform needed content worth revisiting, but putting events and games in the app meant waiting for an app release for every change. I proposed and demonstrated a WebView Playground prototype, then led the setup of a dedicated frontend project after it was adopted. I later moved fortune and event content into it and expanded it with gift codes, lucky draws, and surveys.',
                  'Users needed light content to enjoy beyond watching videos and a reason to return. Built FlyingPop and OpenSesame with Phaser, using existing bonuses for OpenSesame. Based on my recollection of database checks at the time, the games had roughly 2,000–3,000 weekly unique users.',
                  'I integrated the Flutter bridge and game APIs with app and backend teammates and handled ad completion, deep links, Safari audio, duplicate progression, and timeout issues.',
                ],
              },
            ],
            fileRef: 'shortime-playground',
          },
          {
            id: 'subtitleSystem',
            title: 'AI Use and Content Operations Tools',
            descriptions: [
              {
                subtitle: 'AI Use and Content Operations Tools',
                tasks: [
                  'Moved the subtitle translation CLI into a web tool and integrated it into the Shortime backoffice to reduce repetitive translation across eight languages. Based on my recollection, one operator went from roughly three days per episode to processing six to eight episodes per day.',
                  'To secure content that could improve user retention and test an SEO acquisition strategy using backlinks, I built a prototype that generates drafts for Sellectors product blog posts with AI.',
                  'Brought candidate videos from three platforms into one screen to reduce repetitive searches. Operators reported that checks with a similar number of keywords fell from about 50 minutes to under 10 minutes.',
                ],
              },
            ],
            fileRef: 'translate',
          },
          {
            id: 'commerceBackoffice',
            title: 'Customer-Facing Commerce',
            descriptions: [
              {
                subtitle: 'Customer-Facing Commerce',
                detail:
                  'As an early team member, I focused on frontend development for customer-facing commerce, seller and operator screens, mobile WebView and web games, and content-operations tools.',
                tasks: [
                  'To let domestic and international users order in their own language and payment environment, I supported Korean, Japanese, English, and Traditional Chinese and separated domestic payment methods from international cards and PayPal. I also connected country-specific address input and international shipping fees to the order flow.',
                  'The experience needed to continue after payment through gift receipt, purchase confirmation, claims, and reviews. I developed gift receipt and cancellation, purchase confirmation, returns, exchanges, refunds and partial-return amounts, plus review lists, create and edit flows, and photo reviews, separating review eligibility by purchase confirmation, matching order items, and return status.',
                  'Because mobile was the primary environment and maintaining separate desktop and mobile screens was taking time from other product work, I used the same app-like mobile UI on desktop customer screens.',
                  'To keep live-sale participants aware of the sale and new activity, I refreshed product and participation status every five seconds and connected confetti and an AWS Polly voice notification that I proposed for new participants.',
                  'I designed and implemented infinite scrolling and list-state restoration for categories and seller shops.',
                ],
              },
              {
                subtitle: 'Seller Screens and Operator Back Office',
                skills:
                  'Next.js, React, TypeScript, MUI, Tailwind CSS, Jotai, SWR, React Hook Form, Toss Payments, PayPal, Phaser, Flutter InAppWebView, Branch.io, Airbridge, Node.js, Express, AWS Bedrock, OpenAI API, Google Cloud Translation, Axios, Cheerio',
                tasks: [
                  'I developed desktop layouts for product and shipping settings and for order, cancellation, exchange, and refund screens so sellers could review and process products and multiple orders on a wide screen.',
                  'When the previous owner moved to app development, I replaced the Flutter Web back office with Next.js in one pass and owned the frontend implementation so operations requests could continue.',
                  'I migrated and developed screens for operators to manage products, seller approvals, orders, claims, settlements, inquiries, banners, and search keywords, adding search reset, Excel export, and drag sorting.',
                ],
              },
            ],
            fileRef: 'commerce-backoffice-product',
          },
        ],
      },
      {
        id: 'allofthem',
        company: 'all of them Co., Ltd. · Japan',
        period: '2021.07 - 2023.04 (1 year 10 months)',
        employmentType: 'Full-time',
        role: 'Frontend Developer',
        projects: [
          {
            id: 'insuranceSubscription',
            title: 'Shared Subscription Entry and Performance Improvement',
            descriptions: [
              {
                subtitle:
                  'Shared Subscription Entry and Performance Improvement',
                tasks: [
                  'I built a shared CDN SDK so the same insurance subscription modal could be reused across multiple client pages. It accepts an API key and display options as configuration and separates product-specific screen assets by planId path.',
                  'When a blank screen and loader remained visible for about five seconds on subscription entry, I grouped initial requests with Promise.all and moved customer-data loading earlier. I then moved the flow I owned to Next.js and handled initial data through SSR, confirming Lighthouse LCP of 1.2 seconds and an actual entry time of about 1.2 to 1.5 seconds in Japan before deployment.',
                ],
              },
            ],
            fileRef: 'allofthem-insurance-platform',
          },
          {
            id: 'insuranceResponsive',
            title: 'Subscription and Operations Systems',
            descriptions: [
              {
                subtitle: 'Subscription and Operations Systems',
                skills:
                  'React, Next.js, TypeScript, Redux, Context API, Java, Spring Boot, Doma2, MySQL, Redis, GraphQL, DynamoDB, S3, Sass, GitLab CI/CD',
                tasks: [
                  'I connected occupation-based premium calculation, applicant information and disclosures, card payment, and completion so users could continue online from checking premiums through finishing an application. For separate cancer and hospitalization insurance, I added mid-flow save and restore and cleared card data on restoration.',
                  'I developed an administration system and separate back office so operators could review insurance customers, transactions, subscription history, policies, and agency information and handle file workflows. I worked on search and detail screens, the Spring backend, a module that stores CSV files in S3, branch, agent, policy, payment, and premium-invoice queries, and file uploads.',
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'datalogics',
        company: 'Datalogics',
        period: '2020.08 - 2021.07 (1 year)',
        employmentType: 'Full-time',
        role: 'Operations, Maintenance, and Development',
        projects: [
          {
            id: 'consularCallCenter',
            title:
              'Ministry of Foreign Affairs Consular Call Center Maintenance',
            descriptions: [
              {
                subtitle:
                  'Ministry of Foreign Affairs Consular Call Center Maintenance',
                tasks: [
                  'To respond to operational requests and incidents at the Consular Call Center, I handled feature improvements and bug fixes in the agent application and troubleshot the toll-free calling app. I also developed JSP survey screens and an API connected to the database batch server.',
                ],
              },
            ],
          },
          {
            id: 'smartDis',
            title:
              'Smart-DIS Data Migration and Runtime Environment Transition',
            period: '2020.08 - 2020.09',
            descriptions: [
              {
                subtitle:
                  'Smart-DIS Data Migration and Runtime Environment Transition',
                skills:
                  'Java, JavaScript, JSP, eGovFrame, MyBatis, MariaDB, Oracle, Linux, HTML, CSS',
                tasks: [
                  'To deploy Smart-DIS to institutions with different databases, operating systems, and network environments, I developed data-migration features and made Oracle queries work with MariaDB. I moved Linux-only features to Windows, replaced online libraries for closed networks, and wrote the operations manual.',
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'datalogicsInfra',
        company: 'Datalogics',
        period: '2017.08 - 2019.05 (1 year 10 months)',
        employmentType: 'Full-time',
        role: 'Infrastructure Engineer',
        projects: [
          {
            id: 'policyCoordination',
            title: 'Public-Sector Infrastructure Build and Operations',
            descriptions: [
              {
                subtitle: 'Public-Sector Infrastructure Build and Operations',
                skills:
                  'Linux, Server, Network, L2/L3, Firewall, IPS, TMS, Backup',
                tasks: [
                  "To support incident recovery and audits for public-sector systems, I operated the Office for Government Policy Coordination's servers in Sejong and Seoul together with network, security, and backup equipment and handled incident recovery, security audits, and preparation for National Assembly inspections.",
                ],
              },
            ],
          },
          {
            id: 'socialSecurity',
            title: 'Social Security Information Service Advancement Project',
            period: '2018.01 - 2018.02',
            descriptions: [
              {
                subtitle:
                  'Social Security Information Service Advancement Project',
                tasks: [
                  'To bring new equipment and institutions online on the operations schedule, I handled equipment inspection, rack mounting, and installation tests for the Social Security Information Service advancement project.',
                ],
              },
            ],
          },
          {
            id: 'childProtection',
            title: 'Child Protection Agency Construction and Maintenance',
            period: '2017.08 - 2017.12',
            descriptions: [
              {
                subtitle:
                  'Child Protection Agency Construction and Maintenance',
                tasks: [
                  'For a Child Protection Agency call-center relocation and the opening of new agencies, I moved equipment and built the required infrastructure.',
                ],
              },
            ],
          },
        ],
      },
    ],
    education: [
      {
        school: 'Seoil University',
        period: '2010.03 - 2017.02',
        status: 'Graduated',
        major: 'Information and Communication Engineering',
      },
    ],
    skills: [
      'React',
      'CSS',
      'JavaScript',
      'TypeScript',
      'HTML5',
      'Java',
      'Spring Boot',
      'Spring Framework',
      'AWS',
      'Git',
      'GitLab',
      'MySQL',
      'Figma',
      'GraphQL',
    ],
    certifications: [
      {
        name: 'Hybrid App and Web Developer Training Program',
        date: '2020.03',
        type: 'Other',
        details: [
          'To transition from infrastructure to software development, I studied Java and Spring-based web development, REST APIs, and the fundamentals of Android and iOS app development.',
        ],
      },
    ],
    links: [
      'https://vscoke.icecoke.kr/en-US',
      'https://github.com/icecokel',
      'https://vscoke.icecoke.kr/en-US/blog/dashboard',
    ],
    personalProjects: [
      {
        id: 'worxphere',
        title: 'Worxphere Recruitment Pipeline Board',
        description:
          'August 2026 · A personal assignment with 1,000 fictional applicants, documenting decisions about confirmation, failure recovery, full-dataset search, and performance verification.',
        fileRef: 'worxphere-recruitment-board',
      },
    ],
    lastUpdated: '2026.09',
  },
  {
    locale: 'ja-JP',
    name: 'イ・サンミン',
    title: 'ビジネス価値を生み出し、チームの負担を減らす開発者',
    contact: {
      phone: '+821020809652',
      email: 'red9runge@gmail.com',
    },
    introduction: [
      'こんにちは。フロントエンドを中心に、プロダクトと運用に必要な機能を開発してきたイ・サンミンです。',
      'コマース、モバイルWebView、保険、Webゲームなどを経験し、最近は医療・臨床分析プロダクトを開発しながら、画面のレスポンシブ対応・アクセシビリティ・性能だけでなく、デプロイ、ログ保存、リクエスト追跡まで、プロダクトに必要な作業を直接担当しています。',
      'AI開発支援ツールはコード生成だけに使っているわけではありません。',
      '運用チームに必要な機能をシステム化し、プロジェクト別の指示・Skill・Hook・PR検証基準を設け、LLM WikiとMCPを通じてCodex・Claudeが参照できるようにしました。',
      '技術そのものより、その選択がユーザーとチームの次の作業をどう変えるかを重視しています。',
    ],
    totalExperience: '7年5か月',
    careers: [
      {
        id: 'oprimed',
        company: '株式会社オプリメド',
        period: '2026.02 - 在職中',
        employmentType: '正社員',
        role: 'フルスタック開発者',
        projects: [
          {
            id: 'medicalFrontendProductization',
            title: '医療・臨床分析プロダクト',
            descriptions: [
              {
                subtitle: '医療・臨床分析画面の開発',
                detail:
                  '医療・臨床分析プロダクトの画面開発とアクセシビリティ・性能改善、開発環境の改善、バックエンド作業をあわせて担当しています。',
                tasks: [
                  '長い分析プロセスで条件設定から結果確認まで続けられるよう、入力・実行・結果・レポート画面とECharts・Plotlyベースの比較チャートを開発しました。',
                  '画面サイズが変わった場合やエラー後に再入場した場合でも作業を続けられるよう、企画書になかったレスポンシブ・エラー・再入場時の動作を提案し、企画・デザイン・バックエンド担当者と決めて反映しました。',
                  '入力項目が多い画面で反復入力とマウス移動の負担を減らすため、キーボードのTab移動とimport機能を追加しました。',
                  '画像リクエストとUI修正範囲を減らすため、画像ベースのUIを共通コンポーネントへ置き換え、静的画像を画面サイズ別WebPへ変換するビルド処理を追加しました。計算上の画像転送量は約95%減り、別途行ったLighthouse比較ではLCPが1.3秒から1.0秒、Speed Indexが3.4秒から0.7秒へ短縮しました。',
                  '同じ疾患一覧を画面ごとに再取得しないよう、直接取得コードを共通TanStack Query hookへ置き換え、キャッシュと再取得の基準を一か所で管理しました。',
                ],
              },
              {
                subtitle: 'AI開発ツールの活用経験',
                tasks: [
                  'AIが医療・臨床用語と画面動作を独自に解釈しないよう、プロジェクト指示、作業別Skill、実行Hook、PRルールをリポジトリに置き、CodexとClaudeが参照できるようにしました。',
                  '非開発職もドメイン資料を理解しやすいよう、企画・履歴文書をMarkdownへ移し、Codex・Claudeから検索できるローカルLLM WikiベースのMCPサーバーを開発・配布しました。',
                ],
              },
              {
                subtitle: '開発環境とバックエンド運用',
                skills:
                  'Next.js, React, TypeScript, Tailwind CSS, Radix UI, TanStack Query, Zustand, React Hook Form, ECharts, Plotly, Vitest, Playwright, axe-core, GitHub Actions, Husky, Docker, Python, Django, Django REST Framework, PostgreSQL, Codex, Claude, MCP',
                tasks: [
                  'ViteとNext.js Pages Routerに分かれ、構造と書き方が異なっていた4つのフロントエンドプロジェクトの構造とデプロイフローを統一し、既存コードを共通コーディング規約に合わせて修正しました。',
                  '手動DockerデプロイをGitHub Actionsへ移す作業を主導し、デプロイ後にバックエンドのHTTP応答やコンテナ状態に異常があればActions Summaryとログを残すようにしました。',
                  '型・テスト・ビルドエラーがリモートブランチへ上がらないよう、Husky pre-commit・pre-pushにtypecheck・test・buildを接続しました。',
                  'サービスエラーをプロダクト・環境・リクエスト単位で追跡するため、3つのバックエンドでログを業務DBから分離し、環境・サービス・リクエストID別に保存しました。Adminにはログ照会とフロントエンドエラー報告APIを追加し、フロントエンドのエラー種別をサーバーログへ関連付けられるようマッピングしました。',
                ],
              },
            ],
            fileRef: 'oprimed-medical-frontend-productization',
          },
        ],
      },
      {
        id: 'codecrayon',
        company: '株式会社コードクレヨン',
        period: '2023.05 - 2025.07（2年3か月）',
        employmentType: '正社員',
        role: 'フロントエンド開発',
        projects: [
          {
            id: 'shortimePlayground',
            title: 'WebViewプロダクトとWebゲーム',
            descriptions: [
              {
                subtitle: 'WebViewプロダクトとWebゲーム',
                tasks: [
                  '動画プラットフォームには繰り返し訪問するコンテンツが必要でしたが、イベントやゲームをアプリへ入れると変更のたびにアプリ配布を待つ必要がありました。WebView Playgroundを提案してプロトタイプで実演し、採用後は専用フロントエンドプロジェクトの構築を主導しました。その後、占い・イベントを移し、ギフトコード・ラッキードロー・アンケートへ拡張しました。',
                  '動画視聴以外にも気軽に楽しめ、再訪するきっかけとなるコンテンツが必要でした。PhaserでFlyingPopと既存ボーナスを使うOpenSesameを開発しました。当時のDB確認に関する本人の回想では、両ゲームの週間ユニーク利用者は約2,000〜3,000人でした。',
                  'アプリ・バックエンド担当者とFlutter bridge・ゲームAPIを連携し、広告完了・ディープリンク・Safari音声・重複進行・timeout問題を処理しました。',
                ],
              },
            ],
            fileRef: 'shortime-playground',
          },
          {
            id: 'subtitleSystem',
            title: 'AI活用とコンテンツ運用ツール',
            descriptions: [
              {
                subtitle: 'AI活用とコンテンツ運用ツール',
                tasks: [
                  '8言語への字幕翻訳を繰り返す負担を減らすため、CLIをWebツールに移し、Shortimeのバックオフィスに組み込みました。本人の回想では、1人で1話に約3日かかっていた作業が1日6〜8話を処理する水準になりました。',
                  'ユーザーリテンションを高めるコンテンツを確保し、バックリンクを活用したSEO流入戦略を検証するため、Sellectorsの商品ブログ下書きをAIで生成するプロトタイプを制作しました。',
                  '3つの動画プラットフォームを繰り返し検索する時間を減らすため、候補動画を一画面に集約しました。同程度のキーワード数で約50分の確認が10分以内になったという運用担当者のフィードバックを得ました。',
                ],
              },
            ],
            fileRef: 'translate',
          },
          {
            id: 'commerceBackoffice',
            title: '顧客向けコマース',
            descriptions: [
              {
                subtitle: '顧客向けコマース',
                detail:
                  '初期メンバーとして、顧客向けコマースと販売者・運用者向け画面、モバイルWebView・Webゲーム、コンテンツ運用ツールをフロントエンド中心に開発しました。',
                tasks: [
                  '国内外のユーザーが自分の言語と決済環境で注文できるよう、韓国語・日本語・英語・繁体字中国語に対応し、海外ユーザーかどうかに応じて国内決済手段と海外カード・PayPalを分けました。国別の住所入力と海外送料も注文フローへ接続しました。',
                  '決済後もギフト受取から購入確定、クレーム、レビューまで続くフローが必要でした。ギフト受取・キャンセルと購入確定、返品・交換・返金と一部返品金額の処理、レビュー一覧・作成・修正と写真レビューを開発し、購入確定の有無・同一商品の注文項目・返品状態に応じてレビュー作成条件を分けました。',
                  '主な利用環境がモバイルで、PC・モバイル画面を別々に開発する工数が他のプロダクト作業へ影響していたため、顧客画面はPCでも同じアプリライクなモバイルUIを使用する構成にしました。',
                  'ライブ販売の参加者が販売状況を見失わず新しい参加をすぐ認識できるよう、商品・参加状態を5秒ごとに更新しました。新規参加にはconfettiと、自ら提案したAWS Pollyの音声案内を接続しました。',
                  'カテゴリとセラーショップの無限スクロール・一覧状態の復元をあわせて設計・実装しました。',
                ],
              },
              {
                subtitle: '販売者向け画面と運用者バックオフィス',
                skills:
                  'Next.js, React, TypeScript, MUI, Tailwind CSS, Jotai, SWR, React Hook Form, Toss Payments, PayPal, Phaser, Flutter InAppWebView, Branch.io, Airbridge, Node.js, Express, AWS Bedrock, OpenAI API, Google Cloud Translation, Axios, Cheerio',
                tasks: [
                  '販売者が商品と複数の注文情報を広い画面で確認し直接処理できるよう、デスクトップレイアウトの商品・配送設定と注文・キャンセル・交換・返金画面を開発しました。',
                  '既存担当者のアプリ開発への異動後も運用要望へ対応できるよう、Flutter WebバックオフィスをNext.jsへ一括で置き換え、フロントエンド実装を単独で担当しました。',
                  '運用チームが商品・販売者承認と注文・クレーム・精算・問い合わせ、バナー・検索キーワードを直接管理できるよう画面を移行・開発し、検索リセット・Excelエクスポート・ドラッグ並び替えを追加しました。',
                ],
              },
            ],
            fileRef: 'commerce-backoffice-product',
          },
        ],
      },
      {
        id: 'allofthem',
        company: 'all of them Co., Ltd. · Japan',
        period: '2021.07 - 2023.04（1年10か月）',
        employmentType: '正社員',
        role: 'フロントエンド開発者',
        projects: [
          {
            id: 'insuranceSubscription',
            title: '共通加入導線と性能改善',
            descriptions: [
              {
                subtitle: '共通加入導線と性能改善',
                tasks: [
                  '複数の顧客ページで同じ保険加入モーダルを再利用できるよう、共通CDN SDKを作りました。API keyと表示オプションは設定として受け取り、商品別の画面アセットはplanIdパスへ分離しました。',
                  '加入画面で白い画面とローダーが約5秒表示されていたため、初期取得をPromise.allでまとめ、顧客情報の取得を前倒ししました。さらに担当フローをNext.jsへ移し、初期データをSSRで処理しました。Lighthouse LCP 1.2秒と日本現地での進入時間1.2〜1.5秒を確認した後に配布しました。',
                ],
              },
            ],
            fileRef: 'allofthem-insurance-platform',
          },
          {
            id: 'insuranceResponsive',
            title: '加入・運用システム',
            descriptions: [
              {
                subtitle: '加入・運用システム',
                skills:
                  'React, Next.js, TypeScript, Redux, Context API, Java, Spring Boot, Doma2, MySQL, Redis, GraphQL, DynamoDB, S3, Sass, GitLab CI/CD',
                tasks: [
                  'ユーザーが保険料確認から申込完了までオンラインで続けられるよう、職業ベースの保険料算定、加入者情報・告知、カード決済を接続しました。加入手順の長い別のがん・入院保険には中断保存・復元を適用し、復元時にはカード情報を初期化しました。',
                  '運用者が保険顧客・取引・加入履歴と契約・代理店情報を照会し、ファイル業務を処理できるよう、管理システムと別のバックオフィスを開発しました。検索・詳細画面とSpringバックエンド、CSVファイルのS3保存モジュール、支店・募集人・契約・決済・保険料請求書照会とファイルアップロードを担当しました。',
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'datalogics',
        company: 'データロジックス',
        period: '2020.08 - 2021.07（1年）',
        employmentType: '正社員',
        role: '運用・保守および開発',
        projects: [
          {
            id: 'consularCallCenter',
            title: '外交部領事コールセンター保守',
            descriptions: [
              {
                subtitle: '外交部領事コールセンター保守',
                tasks: [
                  '領事コールセンターの運用要望と障害へ対応するため、相談アプリケーションの機能改善・不具合修正と無料通話アプリのトラブルシューティングを担当しました。アンケート用JSP画面とDBバッチサーバー連携APIも開発しました。',
                ],
              },
            ],
          },
          {
            id: 'smartDis',
            title: 'Smart-DISデータ移行と実行環境の切り替え',
            period: '2020.08 - 2020.09',
            descriptions: [
              {
                subtitle: 'Smart-DISデータ移行と実行環境の切り替え',
                skills:
                  'Java, JavaScript, JSP, eGovFrame, MyBatis, MariaDB, Oracle, Linux, HTML, CSS',
                tasks: [
                  'データベース・OS・ネットワーク環境が異なる機関にもSmart-DISを配布できるよう、データ移行機能を開発し、OracleクエリをMariaDBでも動作させました。Linux専用機能はWindowsへ移し、閉域網ではオンラインライブラリを代替した後、運用マニュアルを作成しました。',
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'datalogicsInfra',
        company: 'データロジックス',
        period: '2017.08 - 2019.05（1年10か月）',
        employmentType: '正社員',
        role: 'インフラエンジニア',
        projects: [
          {
            id: 'policyCoordination',
            title: '公共機関インフラの構築と運用',
            descriptions: [
              {
                subtitle: '公共機関インフラの構築と運用',
                skills:
                  'Linux, Server, Network, L2/L3, Firewall, IPS, TMS, Backup',
                tasks: [
                  '公共機関システムの障害と監査へ対応できるよう、国務調整室の世宗・ソウルのサーバーとネットワーク・セキュリティ・バックアップ機器を運用し、障害復旧・セキュリティ監査・国政監査準備を担当しました。',
                ],
              },
            ],
          },
          {
            id: 'socialSecurity',
            title: '社会保障情報院高度化事業',
            period: '2018.01 - 2018.02',
            descriptions: [
              {
                subtitle: '社会保障情報院高度化事業',
                tasks: [
                  '新しい機器と機関を運用日程に合わせて開通するため、社会保障情報院高度化事業で機器検収・マウント・設置テストを担当しました。',
                ],
              },
            ],
          },
          {
            id: 'childProtection',
            title: '児童保護専門機関の構築および保守',
            period: '2017.08 - 2017.12',
            descriptions: [
              {
                subtitle: '児童保護専門機関の構築および保守',
                tasks: [
                  '児童保護専門機関のコールセンター移転と新規機関の開設で、機器移転とインフラ構築を進めました。',
                ],
              },
            ],
          },
        ],
      },
    ],
    education: [
      {
        school: '瑞逸大学',
        period: '2010.03 - 2017.02',
        status: '卒業',
        major: '情報通信学科',
      },
    ],
    skills: [
      'React',
      'CSS',
      'JavaScript',
      'TypeScript',
      'HTML5',
      'Java',
      'Spring Boot',
      'Spring Framework',
      'AWS',
      'Git',
      'GitLab',
      'MySQL',
      'Figma',
      'GraphQL',
    ],
    certifications: [
      {
        name: 'ハイブリッドアプリ・Web開発者養成課程',
        date: '2020.03',
        type: 'その他',
        details: [
          'インフラ職から開発職へ転向するため、Java・SpringベースのWeb開発とREST API、Android・iOSアプリ開発の基礎を学びました。',
        ],
      },
    ],
    links: [
      'https://vscoke.icecoke.kr/ja-JP',
      'https://github.com/icecokel',
      'https://vscoke.icecoke.kr/ja-JP/blog/dashboard',
    ],
    personalProjects: [
      {
        id: 'worxphere',
        title: 'Worxphere 採用パイプラインボード',
        description:
          '2026.08 · 架空の応募者1,000件を扱う個人課題です。段階変更の確認・失敗時の復元、全件検索と性能検証の判断根拠を記録しました。',
        fileRef: 'worxphere-recruitment-board',
      },
    ],
    lastUpdated: '2026.09',
  },
];

export const resumeDetailSnapshot: ResumeDetailDto[] = [
  {
    slug: 'allofthem-insurance-platform',
    title: 'AOT - 보험 가입 흐름과 공통 연동 SDK',
    startDate: '2021.07',
    endDate: '2023.04',
    content:
      '\n## 기본 정보\n\n- 회사: all of them Co., Ltd. · Japan\n- 재직 기간: 2021.07 - 2023.04\n- 담당: 보험 서비스 프론트엔드, 별도 고객사 관리자 기능의 Spring·SQL 작업\n\n보험 가입 서비스와 고객사 연동 SDK, 관리자 화면을 개발했습니다. 가입 앱, 고객사 거래 관리, 보험 대리점 계약 관리의 업무 범위를 구분해 담당했습니다.\n\n## 고객사별 설정을 하나의 SDK로 연결\n\n고객사마다 보험 가입 기능을 붙여야 하는 요구에 맞춰 CDN으로 배포하는 공통 SDK를 개발했습니다. 고객사별 공통 연동이라는 요구사항을 SDK 설정과 자산 경로에 반영했습니다.\n\nAPI key·옵션·고객 정보로 실행 조건을 받고 planId에 맞는 자산 URL을 연결해 하나의 SDK를 고객사별로 설정할 수 있게 했습니다. 프론트엔드 연동과 가입 흐름을 맡고 보험 정책·결제 처리는 담당자와 협업했습니다.\n\n## 기다리는 구간을 먼저 줄인 뒤 렌더링 방식 전환\n\n고객 정보 조회와 여러 요청이 가입 화면 진입을 지연시키는 구간에서 먼저 고객 조회 시점을 앞당기고 독립 요청을 병렬 처리했습니다. 이후 추가 초기 렌더링 이점과 전환 비용을 고려해 React 기반 화면을 Next.js SSR로 일괄 전환했습니다.\n\n일본 고객사에서 약 5초 걸리던 화면 진입이 1.2~1.5초 수준이 됐다는 고객사 보고가 있었습니다. 별도로 한국 데스크톱 Lighthouse에서 LCP 1.2초를 확인했습니다. 두 수치는 보고 주체·환경·지표가 달라 같은 실험의 전후 값으로 합치지 않으며, 가입 전환율 증가는 측정하지 않았습니다.\n\n## 여러 단계의 가입과 관리자 업무\n\n보험별 가입 앱에서 여러 단계의 입력을 이어가도록 복원을 지원하되 카드 정보는 복원 대상에서 제외했습니다. 화면 크기에 맞춰 가입 흐름을 조정하고, 단계별 입력과 다음 행동을 연결했습니다.\n\n별도 고객사 거래 관리자에서는 Spring·SQL 작업까지 맡았고, 보험 대리점 계약 관리 백오피스도 개발했습니다. 각 서비스의 담당자와 협업하며 맡은 기능의 화면·API·데이터 조회를 연결했습니다.\n\n## 기술\n\nReact, Next.js, TypeScript, JavaScript, CDN SDK, Spring, SQL\n',
  },
  {
    slug: 'commerce-backoffice-product',
    title: 'CodeCrayon - 고객 주문과 판매자·운영자 업무',
    startDate: '2023.05',
    endDate: '2025.07',
    content:
      '\n## 기본 정보\n\n- 회사: 주식회사 코드크레용\n- 재직 기간: 2023.05 - 2025.07\n- 직무: 프론트엔드 개발\n\n고객용 커머스와 판매자·운영자 백오피스를 맡았습니다. 고객의 구매 이후 상태와 운영자가 처리하는 주문·클레임을 연결하고, 앱·백엔드 담당자와 역할을 나눴습니다.\n\n## 고객과 운영자에게 다른 화면 전략 적용\n\n고객 서비스는 모바일 사용 흐름과 개발 여력을 고려해 앱처럼 사용하는 화면을 중심으로 만들고 데스크톱에서도 같은 구조를 재사용했습니다. 반면 판매자·운영자는 주문 목록과 관리 정보를 넓게 확인해야 하므로 데스크톱 중심의 백오피스로 구성했습니다. 두 사용자의 업무 차이를 화면과 개발 범위에 반영한 선택입니다.\n\n고객 화면은 한국어·일본어·영어·중국어 번체를 지원했습니다. 국내·해외 카드와 PayPal 결제 선택, SDK 요청 데이터, 국가별 주소·배송 정보를 연결했습니다. 담당 범위는 결제 프론트엔드와 주문 상태 처리이며 서버 승인·환불 트랜잭션 전체를 소유한 것은 아닙니다.\n\n## 구매 이후에도 이어지는 주문 규칙\n\n결제 이후 선물 수령·취소, 구매 확정, 반품·교환·환불과 리뷰로 이어지는 흐름을 개발했습니다. 부분 반품에서는 대상과 금액을 표시하고, 구매 확정 여부·동일 상품·반품 상태에 따라 리뷰 작성 조건을 적용했습니다. 목록을 오가며 다시 찾는 부담을 줄이도록 무한 스크롤과 복귀 시 목록·스크롤 위치 복원을 다뤘습니다.\n\n라이브 참여 위젯은 5초 간격 조회로 상태를 갱신하고 참여 효과를 표시했습니다. 기본 위젯은 기획 요구사항에서 출발했으며 AWS Polly 음성 안내는 직접 제안해 추가했습니다. 참여율·매출 개선 수치를 측정한 사례는 아닙니다.\n\n## 담당자 변경에 맞춘 백오피스 일괄 전환\n\n기존 Flutter Web 담당자가 앱 개발로 이동한 뒤, 웹 운영 기능을 이어가기 위해 판매자·운영자 백오피스를 Next.js로 일괄 전환했습니다. 이 전환의 프론트엔드를 단독 담당하고 백엔드와 협업했습니다.\n\n판매자 승인, 배너·검색 키워드 관리와 상품·주문·클레임 확인, Excel 작업을 지원했습니다. 판매자·운영자가 담당 업무를 화면에서 처리할 수 있도록 이관·개발했으며 운영 비용 변화는 별도로 측정하지 않았습니다.\n\n## 기술\n\nNext.js, React, TypeScript, MUI, Tailwind CSS, Jotai, SWR, React Hook Form, Toss Payments, PayPal, AWS Polly\n',
  },
  {
    slug: 'freebooting-finder',
    title: 'CodeCrayon - 무단 도용 콘텐츠 확인 후보 검색',
    startDate: '2025.06',
    endDate: '2025.06',
    content:
      '\n## 기본 정보\n\n- 회사: 주식회사 코드크레용\n- 작업 시기: 2025.06\n- 담당: 검색 도구와 결과 확인 화면 개발\n\n## 반복 검색을 후보 검토 작업으로 전환\n\n운영자가 같은 키워드를 여러 영상 플랫폼에 반복 입력하고 결과를 확인해야 했습니다. Bilibili TV·Bilibili·Dailymotion의 키워드별 영상 후보를 수집하고 썸네일·링크를 한 화면에 표시해 검토할 대상을 모았습니다.\n\n무단 도용 여부는 운영자가 확인하도록 했습니다. 검색 결과에 노출된 영상을 자동으로 불법 콘텐츠라고 판정하거나 삭제를 실행하는 도구는 아닙니다.\n\n## 브라우저에서 막힌 검색 처리를 서버로 분리\n\n브라우저 직접 크롤링에서 봇 차단을 겪은 구간을 Node.js 기반 처리로 분리하고 Axios·Cheerio로 검색 결과를 읽었습니다. 프론트엔드는 검색 입력과 결과 확인을 담당하게 했습니다. 이 방식이 플랫폼 차단을 항상 우회하거나 검색 결과의 완전성을 보장하지는 않습니다.\n\n운영자 3명이 사용했으며 비슷한 키워드 수 기준으로 약 50분 걸리던 확인 작업이 10분 이내가 됐다는 운영자 피드백을 받았습니다. 별도 계측 실험 결과나 탐지 정확도·삭제 처리율을 의미하는 수치는 아닙니다.\n\n## 기술\n\nTypeScript, Express, Axios, Cheerio, Vercel Serverless Functions\n',
  },
  {
    slug: 'oprimed-medical-frontend-productization',
    title: '오프리메드 - 의료·임상 제품과 개발·검증 체계',
    startDate: '2026.02',
    endDate: '재직 중',
    content:
      '\n## 기본 정보\n\n- 회사: 주식회사오프리메드\n- 기간: 2026.02 - 재직 중\n- 직무: 풀스택 개발자\n\n의료·임상 분석 제품의 프론트엔드와 개발 환경을 맡고, 백엔드 로그 저장·조회 API까지 담당 범위를 넓혔습니다. 약 6주간 본인을 포함한 3인 팀의 팀장으로 일정 조율, 코드 리뷰, 1:1과 막힌 업무 지원을 맡았습니다.\n\n## 프로젝트마다 달랐던 실행·배포 기준 통일\n\n프론트엔드 프로젝트 4개가 Vite·Next.js Pages Router 등 서로 다른 구조를 사용해 프로젝트를 옮길 때마다 실행 방법과 코드 작성 기준을 다시 확인해야 했습니다. 구조와 코딩 컨벤션, 프레임워크·패키지·런타임 버전과 배포 흐름을 맞췄습니다. Portal은 Vite·React Router에서 Next.js App Router로 새 코드를 작성해 일괄 전환했습니다.\n\n수동으로 Docker 이미지를 전달하던 배포는 GitHub Actions로 전환하는 작업을 주도했습니다. Git SHA와 환경을 식별할 수 있는 이미지로 main·demo 배포를 나누고, 배포 후 백엔드 HTTP 응답과 컨테이너 상태를 검사해 이상을 Actions Summary와 로그에 남겼습니다. 이전 이미지로 되돌리는 절차의 범위는 애플리케이션이며 DB와 환경 설정 전체 복구를 보장하는 방식은 아닙니다.\n\n타입·테스트·빌드 실패를 원격 반영 전에 발견하도록 Husky pre-commit·pre-push 검사를 연결했습니다. Playwright 브라우저 시나리오는 별도로 검증했습니다. 로컬 Hook은 우회할 수 있으므로 모든 PR에 강제되는 중앙 CI 검사로 설명하지 않습니다.\n\n## AI의 작업 맥락을 저장소 규칙과 검증으로 연결\n\nAI가 의료·임상 용어와 화면 동작을 임의로 해석하지 않도록 프로젝트 지침, 작업별 Skill, 실행 Hook과 PR 규칙을 저장소에 두고 Codex·Claude가 참고하게 했습니다. 반복해서 설명하던 프로젝트 맥락을 작업 시 읽을 수 있는 문서로 남기고 일부 동료도 재사용했습니다.\n\n파일명 변경 과정에서 AI가 문자열을 경로로 잘못 해석하고 대소문자 차이가 로컬 환경에 가려진 경험도 있었습니다. 리뷰·푸시 책임을 맡은 개발자로서 경로와 파서 처리를 수정했습니다. 규칙의 존재만으로 오류를 막았다고 보지 않고 실제 diff와 실행 결과를 확인하는 계기로 삼았습니다.\n\n코드 저장소에 접근하기 어려운 디자이너도 도메인 자료를 찾을 수 있도록 기획·히스토리 문서를 Markdown으로 옮기고 로컬 LLM Wiki를 MCP 서버로 연결해 배포했습니다. Codex·Claude에서 자료를 검색하는 도구를 마련한 경험이며, 디자이너 이용률이나 온보딩 시간 단축은 측정하지 않았습니다.\n\n## 제품·환경·요청 단위로 오류를 추적하는 백엔드 기반\n\n여러 서비스에서 발생한 오류를 같은 기준으로 조회하기 위해 Nexus·Admin·OPTIVIS_BE의 로그 저장소를 업무 DB와 분리하고 환경·서비스·요청 ID를 기록하게 했습니다. 요청 ID는 기존 값을 재사용하거나 생성해 응답에도 전달하고, 로그 저장 실패가 원래 요청을 실패시키지 않도록 방어했습니다.\n\nAdmin에는 접근·애플리케이션·감사·서버 로그 조회와 프론트엔드 오류 보고 API를 추가했습니다. 오류 보고는 서비스·이벤트 ID 중복 처리, fingerprint, 요청 제한과 관리자 권한 경계를 다뤘습니다. 서버 코드와 테스트 코드의 반영까지 확인한 범위이며, 프론트엔드 전송 연동과 운영 DB 적용·보존 정책·알림 효과까지 검증한 것은 아닙니다.\n\n## 긴 분석 과정의 취소·오류·재진입 동작\n\n조건 설정부터 결과 비교·리포트까지 긴 분석 과정을 이어갈 수 있도록 화면과 ECharts·Plotly 차트를 개발했습니다. 기획서에 빠진 반응형·오류·재진입 기준을 제안하고 기획·디자인·백엔드 담당자와 결정했습니다. 입력이 많은 화면에는 키보드 탭 이동과 import를 추가했습니다.\n\n분석 취소는 브라우저 요청 중단만으로 끝내지 않고 서버 취소 API 호출, 늦게 도착한 응답 무시, 화면 상태 해제를 함께 처리했습니다. 프론트엔드의 취소 흐름을 맡았으며 실제 분석 프로세스 종료는 백엔드 담당 영역입니다. 반복되는 질병 목록 조회는 공통 TanStack Query hook으로 옮겨 캐시와 재요청 기준을 공유했습니다.\n\n## 화면 외형을 유지한 접근성·전송량 개선\n\nPortal의 오류 안내, 제목·목록 의미 구조와 중복 marquee의 접근성 트리를 수정하고, 모달의 배경 비활성화·Tab 이동 제한·닫은 뒤 포커스 복귀를 다뤘습니다. 당시 검증 기록은 Vitest 39개, E2E 21개, axe 검사 4개와 화면 8개 상태의 픽셀 비교입니다. dev 병합까지 확인했으며 운영 반영이나 WCAG 전체 준수, 실제 보조기기 사용자 검증을 뜻하지 않습니다.\n\n이미지 요청과 UI 수정 범위를 줄이기 위해 이미지 기반 UI를 공통 컴포넌트로 바꾸고 화면 크기별 WebP를 생성하는 빌드 작업을 추가했습니다. 선택한 이미지의 빌드 산출물 기준 용량은 계산상 약 95% 감소했습니다. 별도 Lighthouse 비교에서는 LCP 1.3초→1.0초, Speed Index 3.4초→0.7초를 확인했으며 운영 사용자 전체의 성능 통계는 아닙니다.\n\n## 기술\n\nNext.js, React, TypeScript, Tailwind CSS, Radix UI, TanStack Query, Zustand, React Hook Form, ECharts, Plotly, Vitest, Playwright, axe-core, GitHub Actions, Husky, Docker, Python, Django, Django REST Framework, PostgreSQL, Codex, Claude, MCP\n',
  },
  {
    slug: 'sellectors-admin',
    title: 'CodeCrayon - 판매자·운영자 백오피스 전환',
    startDate: '2023.05',
    endDate: '2025.07',
    content:
      '\n## 기본 정보\n\n- 회사: 주식회사 코드크레용\n- 재직 기간: 2023.05 - 2025.07\n- 담당: 백오피스 전환의 프론트엔드 단독 개발\n\n## 담당자 변경 후에도 이어가야 했던 운영 기능\n\n기존 Flutter Web 담당자가 앱 개발로 이동하면서 판매자·운영자 기능을 웹에서 이어갈 필요가 생겼습니다. Next.js로 백오피스를 일괄 전환하고 이후 기능 개발을 맡았습니다. 프론트엔드는 단독 담당했으며 API와 업무 규칙은 백엔드·기획 담당자와 협업했습니다.\n\n고객용 서비스는 모바일 중심으로 구성했지만 백오피스는 주문 목록과 관리 정보를 넓게 보는 데스크톱 업무에 맞췄습니다. 고객과 운영자에게 같은 화면 전략을 적용하지 않고 실제 사용 흐름에 따라 나눴습니다.\n\n## 승인부터 주문·클레임까지 운영 화면 연결\n\n판매자 승인, 상품·배너·검색 키워드 관리와 주문·클레임 확인, Excel 작업을 지원했습니다. 목록 조회에서 상세 확인과 처리로 이어지는 흐름을 만들고, 입력 폼과 API 조회 상태는 공통으로 사용하는 라이브러리와 패턴에 맞췄습니다.\n\n전환과 운영 기능 개발이 확인된 결과이며 운영 시간 절감, 응답 속도 향상이나 개발자 의존도 감소를 별도로 측정한 수치는 없습니다. 고객 주문과 이어지는 전체 담당 범위는 커머스·백오피스 통합 상세에 함께 기록했습니다.\n\n## 기술\n\nNext.js, React, TypeScript, MUI, Jotai, SWR, React Hook Form\n',
  },
  {
    slug: 'sellectors-frontend',
    title: 'CodeCrayon - 구매 이후 흐름까지 이어지는 고객 커머스',
    startDate: '2023.05',
    endDate: '2025.07',
    content:
      '\n## 기본 정보\n\n- 회사: 주식회사 코드크레용\n- 재직 기간: 2023.05 - 2025.07\n- 담당: 셀렉터스 고객 서비스 프론트엔드\n\n## 모바일 사용 흐름과 개발 범위를 함께 고려\n\n고객의 모바일 사용 흐름과 개발 여력을 고려해 앱처럼 사용하는 화면을 중심으로 만들고 데스크톱에서도 같은 구조를 재사용했습니다. 반대로 판매자·운영자 백오피스는 데스크톱 중심으로 개발했습니다.\n\n고객 서비스에 한국어·일본어·영어·중국어 번체를 적용하고 국내·해외 카드와 PayPal 결제 선택, SDK 요청 데이터, 국가별 주소·배송 정보를 연결했습니다. 결제 화면과 주문 상태 처리를 맡았으며 서버 승인·환불 트랜잭션은 백엔드 협업 영역입니다.\n\n## 결제 뒤에도 계속되는 고객 행동\n\n선물 수령·취소에서 구매 확정, 반품·교환·환불, 리뷰까지 이어지는 프론트엔드를 개발했습니다. 부분 반품 대상과 금액을 표시하고 구매 확정 여부·동일 상품·반품 상태에 맞춰 리뷰 작성 조건을 적용했습니다.\n\n상품 목록과 상세를 오갈 때 다시 탐색해야 하는 부담을 줄이도록 무한 스크롤과 복귀 시 목록·스크롤 위치 복원을 다뤘습니다. 개별 기능을 나열하기보다 주문 상태에 따라 고객이 할 수 있는 다음 행동을 연결하는 데 초점을 뒀습니다.\n\n## 라이브 참여 상태와 음성 안내\n\n라이브 위젯은 5초 간격 조회로 참여 상태를 갱신하고 confetti 효과를 표시했습니다. 기획 요구사항에 따른 위젯에 AWS Polly 음성 안내를 직접 제안해 추가했습니다.\n\n위 작업은 프론트엔드 반영까지 확인한 사례입니다. 구매 전환율·라이브 참여율의 변화는 별도로 측정하지 않았습니다.\n\n## 기술\n\nNext.js, React, TypeScript, Tailwind CSS, Jotai, SWR, React Hook Form, Toss Payments, PayPal, AWS Polly\n',
  },
  {
    slug: 'shortime-frontend',
    title: 'CodeCrayon - 숏타임 자막 운영 흐름',
    startDate: '2023.05',
    endDate: '2025.07',
    content:
      '\n## 기본 정보\n\n- 회사: 주식회사 코드크레용\n- 재직 기간: 2023.05 - 2025.07\n- 담당: 숏타임 converter·AI 자막 도구와 일부 에피소드 플레이어 테스트\n\n## 운영자가 직접 처리하는 자막 변환·번역\n\n개발자용 CLI로 시작한 자막 번역 도구를 운영자가 직접 사용할 수 있도록 여러 파일을 처리하는 웹 화면으로 옮기고 숏타임 백오피스에 편입했습니다. VTT·SRT 변환, 8개 언어 번역과 결과 확인을 하나의 운영 흐름에서 다뤘습니다.\n\n번역 결과의 개수·누락·빈 항목·시간 정보·형식을 검사하고 분할 처리와 재시도를 적용했습니다. 운영자가 확인한 것은 구조와 오류·누락 중심이며 전체 언어의 번역 품질 검수나 자동 품질 보증을 뜻하지 않습니다.\n\n## 직접 담당한 범위와 협업 경계\n\n직접 개발한 범위는 converter와 AI 자막 도구이며 일부 에피소드 플레이어 테스트를 함께 다뤘습니다. AI 번역 고지 배지 UI는 동료가 담당했습니다.\n\n본인 회고 기준 1명이 에피소드 1편에 약 3일 쓰던 작업을 하루 6~8편 처리하는 수준으로 바꿨습니다. 같은 조건의 실험 로그를 비교한 지표는 아니며 운영 과정과 수치의 맥락은 AI 활용·콘텐츠 운영 도구 상세에 기록했습니다.\n\n## 기술\n\nNext.js, React, TypeScript, Node.js, AWS Bedrock, OpenAI API, Google Cloud Translation\n',
  },
  {
    slug: 'shortime-playground',
    title: 'CodeCrayon - 제안에서 운영까지 이어진 WebView·웹게임',
    startDate: '2023.05',
    endDate: '2025.07',
    content:
      '\n## 기본 정보\n\n- 회사: 주식회사 코드크레용\n- 재직 기간: 2023.05 - 2025.07\n- 직무: 프론트엔드 개발\n\n모바일 앱 안에서 운세·이벤트·웹게임·설문을 제공하는 Playground를 제안하고, 채택 후 프론트엔드 프로젝트 구성을 주도했습니다.\n\n## 아이디어를 동작하는 시제품으로 설명\n\n앱에 참여형 콘텐츠를 더할 방법을 조사하고 Playground 프로토타입을 만들어 시연했습니다. 제안이 채택된 뒤 기존 운세·이벤트를 먼저 옮기고 선물하기·럭키드로우·설문 등으로 범위를 넓혔습니다. 화면 제작뿐 아니라 앱·백엔드 담당자와 연결할 브리지와 API 계약을 함께 조율했습니다.\n\nPhaser로 FlyingPop과 OpenSesame을 개발했습니다. FlyingPop의 피드백을 바탕으로 팀이 OpenSesame을 선택했고, 기존 보너스를 게임 참여 비용으로 연결했습니다. 프론트엔드 개발과 앱·백엔드 연동을 맡았습니다. 당시 DB에서 확인한 수치를 본인이 회고한 기준으로 주간 고유 이용자는 약 2,000~3,000명이었습니다.\n\n## 앱과 웹 사이에서 끊기지 않는 실행 흐름\n\nWebView에서 콘텐츠 진입·종료·보상 처리가 이어지도록 콜백 payload와 딥링크를 연결하고 진행 중 중복 실행, 콜백 대기와 타임아웃을 다뤘습니다. 앱·백엔드 담당자와 나눈 계약에 맞춰 프론트엔드의 실행 상태를 제어했으며 서버 보상 검증이나 부정 이용 방지는 별도 담당 영역입니다.\n\nSafari 계열 오디오 재생 제약과 앱이 백그라운드로 이동할 때의 재생 중단을 처리했습니다. 키보드가 입력란을 가리는 문제는 앱 수정 여력이 부족한 상황에서 하단 여백을 임시로 확보했습니다. 이 대응으로 모든 기기·앱 버전의 WebView 동작을 해결했다고 보지는 않습니다.\n\n## 기술\n\nNext.js, React, TypeScript, Phaser, Flutter InAppWebView, Tailwind CSS, Jotai, SWR, Branch.io, Airbridge\n',
  },
  {
    slug: 'translate',
    title: 'CodeCrayon - AI 활용과 콘텐츠 운영 도구',
    startDate: '2023.05',
    endDate: '2025.07',
    content:
      '\n## 기본 정보\n\n- 회사: 주식회사 코드크레용\n- 재직 기간: 2023.05 - 2025.07\n- 직무: 프론트엔드 개발\n\n운영자가 개발자 도움 없이 반복 작업을 처리할 수 있도록 자막 번역·검색 도구를 개발했습니다. 고객용 커머스, 판매자·운영자 화면과 WebView 제품을 함께 맡았습니다.\n\n## 개발자용 번역 도구를 운영자의 작업 화면으로 전환\n\n에피소드별 자막을 여러 언어로 번역해야 했지만 초기 CLI는 비개발자인 운영자가 직접 쓰기 어려웠습니다. 여러 파일을 올리고 결과를 확인할 수 있는 웹 도구로 바꾼 뒤 숏타임 백오피스에 편입했습니다. 기본 대상은 독일어·스페인어·태국어·인도네시아어·힌디어·포르투갈어·중국어 간체·번체의 8개 언어입니다.\n\nVTT·SRT 변환과 번역 구간 분할·병렬 처리, 실패 시 더 작은 단위의 재시도를 적용했습니다. 응답 형식을 고정하고 자막 개수, 누락·빈 항목, 시간 정보와 파일 형식을 검사해 운영자가 다시 확인할 지점을 드러냈습니다. 이 검사는 구조와 누락을 확인하는 것이며 모든 언어의 번역 품질을 자동으로 보증하지는 않습니다.\n\n본인 회고 기준 약 3개월 동안 운영자 3~4명이 사용했고, 1명이 에피소드 1편을 처리하는 데 약 3일 걸리던 작업을 하루 6~8편 처리하는 수준으로 바꿨습니다. 동일 조건의 실험 로그로 산출한 생산성 지표는 아닙니다. AI 번역 사용 고지 정책과 함께 운영했으며 고지 배지 UI는 동료가 담당했습니다.\n\n## 세 플랫폼의 검색 결과를 한 번에 확인\n\n운영팀이 같은 키워드로 여러 영상 플랫폼을 반복 검색하던 업무에 맞춰 Bilibili TV·Bilibili·Dailymotion의 후보 영상과 썸네일·링크를 한 화면에 모았습니다. 운영자 3명이 사용했고, 비슷한 키워드 수를 검색할 때 확인 시간이 약 50분에서 10분 이내가 됐다는 운영자 피드백을 받았습니다.\n\n도구의 범위는 확인 후보를 찾는 일입니다. 무단 도용 여부의 자동 판정이나 삭제 조치 성과를 측정한 것은 아닙니다. 검색 처리와 실행 환경의 선택은 별도 검색 도구 상세에 기록했습니다.\n\n## 상품 콘텐츠 초안 생성으로 가설 검토\n\n사용자가 다시 방문할 콘텐츠를 확보하고 백링크 기반 SEO 유입 전략을 검토하기 위해 셀렉터스 상품 블로그 초안을 AI로 생성하는 프로토타입을 제작했습니다. 초안 생성 가능성을 확인한 단계이며 자동 게시 운영이나 리텐션·검색 유입 증가를 성과로 주장하지 않습니다.\n\n## 기술\n\nNext.js, React, TypeScript, React Hook Form, Node.js, Express, AWS Bedrock, OpenAI API, Google Cloud Translation, Axios, Cheerio\n',
  },
  {
    slug: 'worxphere-recruitment-board',
    title: '개인 과제 - 웍스피어 채용 파이프라인 보드',
    startDate: '2026.08',
    endDate: '2026.08',
    content:
      '\n## 프로젝트 성격\n\n- 구분: 채용 프론트엔드 과제·개인 포트폴리오\n- 기간: 2026.08\n- 대상: 가상 지원자 1,000건의 채용 단계 관리\n\n웍스피어 재직 경력이 아닌 개인 과제입니다. Next.js 화면과 MSW API, 브라우저 localStorage로 조회·변경·실패·복구를 검증했습니다. 실제 채용 데이터나 운영 서버·DB를 사용한 서비스는 아닙니다.\n\n## 이동 편의보다 중요한 결정의 확인 과정\n\n지원자 단계 변경은 중요한 결정이고 알림 같은 후속 동작도 고려해야 하므로 DnD를 제외하고 명시적 행동과 확인 모달을 선택했습니다. 방향키는 카드 사이 포커스 이동만 담당하고 상태를 바꾸지 않게 했습니다. 실제 알림 발송이나 오조작 감소를 측정한 사례는 아닙니다.\n\n일반 단계 변경은 다음 단계 이동·탈락만 허용하고 최종 합격·탈락은 종료 상태로 다뤘습니다. UI와 MSW API가 공통 전이 규칙을 사용하며 당시 일반 전이 허용 6개·거부 19개와 역행 요청 400 응답을 확인했습니다.\n\n## 전체 검색의 책임을 데이터를 가진 API로 이동\n\n컬럼별 100건 페이지네이션을 적용한 뒤 이미 로드한 카드만 검색하면 나머지 지원자가 누락됐습니다. 선로딩 검색 인덱스를 거쳐 MSW API가 전체 데이터에서 먼저 필터하고 페이지를 나누도록 교정했습니다. 초기 화면은 컬럼 합계 380개 카드이며 끝까지 읽으면 1,000개가 누적됩니다.\n\n검색·직무 조건이 바뀌면 새 GET을 요청하고 이전 요청을 취소하며 no-store를 적용했습니다. 응답 순서에 따라 직무 순서가 흔들리지 않도록 표시 순서도 고정했습니다. 이 선택은 요청 수를 늘리며 다른 사용자의 변경을 실시간 동기화하는 구조는 아닙니다.\n\n## 변경 실패 뒤 위치·수량·상세를 함께 복구\n\n낙관적 단계 변경 실패 시 카드 위치와 상태, 양쪽 컬럼 수량과 상세 값을 함께 복구했습니다. 같은 UI에서 연속 확정하는 경우 동기 ref Set으로 요청 시작을 잠그고 finally에서 해제했습니다. 당시 700ms 지연과 500 응답 조건에서 두 번 확정해도 PATCH는 한 번 발생하고, 수량 319/121이 320/120으로 복구된 뒤 재시도와 새로고침 후 저장 유지까지 확인했습니다.\n\n상세는 별도 데이터 사본 대신 선택한 지원자 ID로 현재 보드에서 찾게 했습니다. 일부 조회 실패 시 알고 있는 카드를 유지하고 부분 오류·수동 재시도를 표시했습니다. 중복 잠금은 같은 UI 인스턴스에 한정되며 다른 탭·사용자의 동시성이나 모든 GET/PATCH 경쟁을 해결하지는 않습니다.\n\n## 페이지 경계와 Undo 회귀를 별도 규칙으로 처리\n\n단계 이동으로 원본 목록의 offset이 당겨질 때 다음 페이지가 누락되는 문제를 다뤘습니다. 저장 성공 후 원본의 기존 요청을 취소하고 1페이지를 다시 조회하며 대상 목록은 ID로 중복을 제거했습니다. 원본 1페이지 결과가 목록을 교체하므로 이전에 읽은 모든 페이지를 보존하는 방식은 아닙니다.\n\nAPI 전이 검증 강화로 Undo가 깨졌을 때 일반 역행 금지는 유지하고 undo-only 예외를 추가했습니다. UI는 현재 페이지에서 마지막으로 성공한 비종료 변경 한 건을 보관합니다. MSW는 인접한 비종료 역방향인지만 검사하므로 서버 이력·토큰·주체·버전에 기반한 되돌리기 보장은 아닙니다.\n\n## 측정한 범위에서 가상화 보류\n\n요청 대기와 마지막 응답 이후 화면 반영, 전체 완료와 Long Task를 나눠 측정하고 기존 페이지네이션을 유지했습니다. 당시 두 데스크톱 화면의 production 성공 표본에서 이름 필터 반영 43.8~51.0ms, 직무 필터 50.5~82.2ms와 Long Task 0을 확인해 가상화 추가를 보류했습니다. 생성 데이터와 제한 없는 CPU·네트워크 조건이며 화면 반영은 두 번째 animation frame 기준입니다.\n\n에이전트 없이 다시 확인할 수 있도록 성능 검증 명령과 보고서를 남겼습니다. 후속 기록은 두 화면·두 시나리오에 성공 표본 25개씩 총 100개, 마지막 응답 이후 최대 반영 38.0ms와 Long Task 0입니다. 의도된 500으로 제외·재시도한 표본 118개가 있었고 이전 기록과 환경·시나리오가 달라 성능 개선 전후 비교로 사용하지 않습니다.\n\n## 실패 기록도 검증 근거에 포함\n\n기능·테스트·문서·프롬프트를 연결하고 방향키 해석 오류, 포커스 실패와 Undo 회귀를 수정 기록에 남겼습니다. 상태 함수 실행·소스 패턴 검사·브라우저 상호작용·새로고침 후 저장 확인을 구분했습니다. 이 문서의 결과는 당시 실행 기록을 근거로 하며 이번 경력기술서 갱신에서 과제 자체의 테스트를 다시 실행한 결과는 아닙니다.\n\n## 기술\n\nNext.js, React, TypeScript, Tailwind CSS, shadcn/ui, MSW, localStorage, Playwright, Node.js\n',
  },
];
