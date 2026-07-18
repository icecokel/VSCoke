# VSCoke

> 개발자 이상민의 경험과 작업 방식을 담은 인터랙티브 포트폴리오

VSCoke는 개발자 이상민의 이력, 프로젝트, 글을 한곳에서 소개하는 포트폴리오 웹사이트입니다. 단순히 경력 목록을 보여 주는 데 그치지 않고, 어떤 문제를 다뤘고 어떤 방식으로 제품을 만들었는지 더 깊게 살펴볼 수 있도록 구성했습니다.

VS Code에서 영감을 받은 화면은 개발자라는 정체성을 드러내는 인터페이스이자, 여러 기록을 탐색하는 방법입니다. 방문자는 메뉴와 검색을 이용해 이력과 프로젝트, 블로그를 오가며 개발 경험을 읽을 수 있습니다.

## 운영 페이지

**[VSCoke 포트폴리오 바로가기](https://vscoke.vercel.app)**

## 포트폴리오에서 볼 수 있는 것

| 영역            | 소개                                                                               |
| --------------- | ---------------------------------------------------------------------------------- |
| 이력과 프로젝트 | 경력, 프로젝트별 역할, 문제 해결 경험, 사용 기술을 확인합니다.                     |
| 이력 질문       | 공개 이력의 근거를 바탕으로 경험과 역할에 관한 질문을 남길 수 있습니다.            |
| 블로그          | 개발 과정에서의 고민, 구현 방식, 배운 점을 기록합니다.                             |
| 취미 기록       | 레시피와 에스프레소 추출 로그를 통해 기록하고 개선하는 개인적인 방식을 공유합니다. |
| 브라우저 게임   | 짧게 즐길 수 있는 게임을 통해 인터랙션과 상태 관리에 대한 실험을 보여 줍니다.      |

이 프로젝트는 포트폴리오의 내용과 포트폴리오 자체의 구현을 함께 보여 줍니다. 이력과 프로젝트는 읽기 쉬운 정보 구조로 제공하고, 검색·다국어·인증·공유·API 연동 같은 실제 제품 기능은 코드와 화면에서 직접 확인할 수 있습니다.

## 직접 즐겨 보기

포트폴리오를 둘러보는 사이, 다음 경험도 이용할 수 있습니다.

- **Sky Drop**: 떨어지는 블록의 타이밍을 맞춰 점수를 쌓는 퍼즐 게임
- **Fish Drift**: 유영 방향을 바꾸며 장애물을 피하고 물고기 무리를 모으는 아케이드 게임
- **Wordle**: 여섯 번의 기회 안에 다섯 글자 영어 단어를 맞히는 단어 게임
- **기록 탐색**: 개발 글, 레시피, 에스프레소 추출 기록을 검색하고 살펴보는 개인 아카이브

게임은 포트폴리오의 중심이 아니라, 개발자가 만든 인터랙션을 가볍게 체험하는 공간입니다. 일부 게임은 점수 기록과 공유 기능을 제공하며, Poke Lounge는 웹과 서버가 함께 상태와 경쟁 규칙을 다루는 기술적 MVP로 포함되어 있습니다.

## 프로젝트 구성

```txt
vscoke/
├─ apps/
│  ├─ web/      # 포트폴리오 웹 애플리케이션
│  └─ api/      # 데이터, 인증, 게임, 이력 질문 API
├─ packages/
│  └─ poke-lounge-battle/ # 웹과 API가 공유하는 경쟁 전투 규칙
└─ docs/        # 개발·운영·정책 문서
```

웹은 Next.js로, API는 NestJS로 만들었습니다. 하나의 pnpm workspace에서 함께 관리하지만 각 앱은 독립된 책임과 배포 환경을 가집니다. 웹과 API 사이의 계약은 OpenAPI로 생성하고 검증합니다.

## 기술 스택

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS, next-intl
- **Backend**: NestJS 11, TypeORM, PostgreSQL, Swagger/OpenAPI
- **Interaction**: Auth.js, Phaser, Socket.IO
- **Quality**: Playwright E2E, ESLint, Prettier

## 확인과 문서

```bash
pnpm lint
pnpm type:check:web
pnpm test:api
pnpm e2e:smoke
pnpm check:api-contract
```

- [Monorepo Concept](docs/vscoke-monorepo-concept.md): 앱의 책임과 데이터 흐름
- [Local Development](docs/local-development.md): 로컬 실행과 환경 변수
- [Game Score Policy](docs/game-score-policy.md): 게임 결과와 랭킹 검증 기준
- [Poke Lounge Game Concept](docs/poke-lounge-game-concept.md): 게임 경험, 규칙과 멀티플레이 컨셉
- [Poke Lounge Release Gate](docs/poke-lounge-release-gate.md): Poke Lounge 공개 배포 조건
