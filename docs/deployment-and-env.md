# Deployment and Environment Plan

VSCoke monorepo의 배포와 환경 변수 관리는 앱별로 분리한다.

```txt
apps/web -> Vercel
apps/api -> GitHub Actions self-hosted runner on Mac mini -> Docker Compose -> Cloudflare Tunnel
```

루트 GitHub 저장소는 하나만 유지하되, 웹과 API는 서로 다른 배포 주체를 가진다.

## 배포 기준

### Pull Request Check

PR은 배포 전에 `.github/workflows/pull-request-check.yml`로 검증한다. 이 workflow는 `main` 대상 pull request와 수동 실행(`workflow_dispatch`)에서 동작한다.

실제 runtime, service, 명령과 focused E2E 목록은 workflow 파일이 기준이다. Web E2E 선택 정책은
[Playwright CLI 테스트 흐름 스펙](./playwright-cli-test-spec.md)을 따른다.

### Web: Vercel

Vercel 프로젝트는 monorepo 루트가 아니라 웹 앱 디렉터리를 루트로 잡는다.

| 항목             | 값                                                    |
| ---------------- | ----------------------------------------------------- |
| Root Directory   | `apps/web`                                            |
| Framework Preset | `Next.js`                                             |
| Build Command    | `pnpm build`                                          |
| Install Command  | 기본값 유지, 필요 시 `pnpm install --frozen-lockfile` |
| Node.js Version  | `24.x`                                                |
| Primary Domain   | `vscoke.icecoke.kr`                                   |
| Production env   | Web 환경 변수 표 참고                                 |

- Vercel은 `apps/web/package.json`의 `build` 스크립트를 실행해야 한다.
- Install Command는 Vercel의 pnpm monorepo 감지를 우선 사용하고, 문제가 있을 때만 override한다.
- Vercel Root Directory가 저장소 루트(`/`)로 남아 있으면 루트 `pnpm build`가 실행되어 API 빌드까지 포함될 수 있다.
- 웹 배포용 GitHub Actions는 만들지 않는다. 웹은 Vercel Git integration이 담당한다.
- Preview 배포도 같은 Vercel 프로젝트에서 처리한다. Preview가 API를 호출해야 하면 `NEXT_PUBLIC_API_URL`을 preview 환경에도 설정한다.
- Vercel 환경 변수 변경은 기존 배포에 소급 적용되지 않는다. 값을 바꾼 뒤에는 새 deployment를 생성한다.
- 웹 `package.json`의 `engines.node`로 Node.js `24.x`를 선택한다. 기존 배포는 재배포 전까지 바뀌지 않으며, 관리형 런타임의 실제 보안 패치 버전은 배포 후 확인한다.
- apex 도메인 연결을 설명한 구형 로컬 가이드를 현재 VSCoke의 Primary 설정으로 사용하지 않는다.
- canonical URL은 `apps/web/src/lib/site-url.ts`의 `https://vscoke.icecoke.kr`를 기준으로 생성한다.
- 이전 `vscoke.vercel.app` 요청은 같은 경로를 유지해 production 도메인으로 영구 리디렉션한다.
- Google OAuth 승인 리디렉션 URI에는 `https://vscoke.icecoke.kr/api/auth/callback/google`을 등록한다.
- GA4 웹 데이터 스트림의 기본 URL과 Search Console sitemap도 production 도메인을 기준으로 관리한다.

참고:

- [Vercel Monorepos](https://vercel.com/docs/monorepos)
- [Vercel Configuring a Build](https://vercel.com/docs/builds/configure-a-build)

### API: Mac mini Docker

API는 Mac mini(Apple Silicon)에 설치된 GitHub Actions self-hosted runner가
`.github/workflows/deploy-api.yml`을 실행해 Docker 이미지로 빌드하고 Docker Compose로 운영한다.
Docker 런타임은 OrbStack이며 `docker`, `docker compose` 명령은 OrbStack context를 사용한다.

필수 runner labels:

```txt
self-hosted
vscoke-api
mac-mini
```

이전 Ubuntu host runner의 label은 `host`였으므로 새 workflow는 Ubuntu host에서 실행되지 않는다.

현재 워크플로 기준:

1. `main`에 API, 루트 패키지/락파일, API 배포 workflow 또는 공개 웹 이력 자료 변경이 push된다. 실제 경로 필터는 workflow를 따른다.
2. Mac mini의 self-hosted runner가 job을 실행한다. runner는 launchd 서비스로 관리한다.
3. Repository Secret `API_ENV_PRODUCTION`과 운영 필수값을 검증한다. Secret이 없으면 기존 서버 `.env`로 대체하지 않고 실패한다.
4. `apps/api/Dockerfile`로 저장소 루트를 컨텍스트 삼아 이미지를 빌드한다. 이미지에는 API dist, production 의존성, `scripts/api-deploy-env.mjs`와 health 도구, 공개 웹 이력 JSON/메시지/MDX/공개 문서만 포함된다. 포함 목록은 `apps/api/Dockerfile.dockerignore` 허용 목록이 기준이며 개인 이력 작업공간은 포함하지 않는다.
5. 이미지는 `vscoke-api:<commit sha>`와 `vscoke-api:latest`로 태그한다. compose는 `latest`를 사용한다.
6. `$API_DEPLOY_DIR/.next-release`에 `docker-compose.yml`과 health 도구만 staging한 뒤 `.env`, `api.env`, `postgres.env`, `.next-release`, `backups`, `logs`를 보존하며 release를 복사한다.
7. Secret으로 `api.env`를 권한 `600`으로 원자적으로 교체하고, 같은 Secret에서 postgres 초기화용 `postgres.env`(`DB_*` 값)와 compose 보간용 `.env`(`PORT`만)를 생성한다.
8. `docker compose up --wait postgres`로 DB를 올린 뒤 API 이미지로 공개 앱 이력을 import한다. 임베딩이 설정된 hybrid/vector 모드에서는 index도 갱신한다.
9. `docker compose up --wait api`로 API 컨테이너를 새 이미지로 교체한다.
10. Mac mini 내부 `http://127.0.0.1:$PORT/health`와 공개 `API_HEALTH_URL`을 smoke test한 뒤 현재 sha와 `latest` 외의 이전 이미지를 제거한다.

컨테이너 안에서는 `scripts/api-deploy-env.mjs run`이 `api.env`를 읽기 전용으로 mount한 `/app/.env`를
파싱해 API 프로세스에 주입한다. compose가 자동 로드하는 `.env`에는 `PORT`만 있으므로 비밀값은 compose
보간을 거치지 않는다.

운영 프로세스 기준:

| 항목             | 값                                                       |
| ---------------- | -------------------------------------------------------- |
| 서버             | Mac mini (Apple Silicon), OrbStack Docker                |
| 서버 경로        | `/Users/smlee/projects/vscoke-api`                       |
| compose 프로젝트 | `vscoke-api` (`$API_DEPLOY_DIR/docker-compose.yml`)      |
| API 컨테이너     | `vscoke-api-api-1`, 이미지 `vscoke-api:latest`           |
| DB 컨테이너      | `vscoke-api-postgres-1`, 이미지 `pgvector/pgvector:pg16` |
| 기본 포트        | 호스트 `127.0.0.1:3000` 또는 Secret의 `PORT`             |
| 외부 노출        | 호스트 cloudflared -> `http://127.0.0.1:$PORT`           |

호스트 서비스 기준:

| 항목                                        | 기대 상태           | 설명                                                    |
| ------------------------------------------- | ------------------- | ------------------------------------------------------- |
| OrbStack                                    | 로그인 시 자동 시작 | `orb config set app.start_at_login true`                |
| `vscoke-api-api-1`, `vscoke-api-postgres-1` | `running (healthy)` | `restart: unless-stopped`로 OrbStack 시작 시 복구된다   |
| `actions.runner.icecokel-VSCoke.*` launchd  | 실행 중             | 다른 저장소 runner와 같은 `svc.sh` 설치 방식            |
| `cloudflared` (`brew services`)             | `started`           | `api.icecoke.kr` 터널, ingress `http://localhost:$PORT` |
| Codex app-server launchd                    | 실행 중             | `codex app-server --listen ws://127.0.0.1:14561`        |

Docker 운영 기준:

- 이미지 빌드와 import가 성공하기 전에는 기존 API 컨테이너를 건드리지 않는다. 빌드 실패 시 기존 컨테이너가 계속 응답한다.
- PostgreSQL 데이터는 named volume `vscoke-api_postgres-data`에 있다. 컨테이너를 지워도 volume을 지우지 않는 한 데이터는 남는다. `docker compose down --volumes`는 운영에서 사용하지 않는다.
- 로그는 호스트 `$API_DEPLOY_DIR/logs`에 bind mount되며 `rsync --delete`가 보존한다.
- 로컬 E5 임베딩 캐시는 named volume `vscoke-api_embedding-cache`를 `/app/.cache/embeddings`에 mount한다.
- Codex app-server는 컨테이너가 아니라 호스트 loopback에서 실행하고, 컨테이너는 `host.docker.internal`로 접근한다.
- 컨테이너는 Docker 게이트웨이를 거쳐 요청을 받으므로 compose가 `TRUST_PROXY=loopback, uniquelocal`을 주입한다. 이 값이 없으면 모든 요청이 게이트웨이 IP로 보여 rate limit이 한 사용자로 묶인다.

#### Mac mini 초기 준비

한 번만 수행한다. 비밀값은 셸 히스토리나 문서에 남기지 않는다.

1. OrbStack 설치 후 `orb config set app.start_at_login true`로 재부팅 복구를 켠다.
2. `mkdir -p /Users/smlee/projects/vscoke-api`를 만든다. 다른 경로를 쓰면 repository variable `API_DEPLOY_DIR`를 같은 값으로 설정한다.
3. GitHub **Settings → Actions → Runners → New self-hosted runner**에서 macOS arm64 runner를 받아 설치한다. 이름은 `vscoke-api-mac-mini`, label은 `vscoke-api`, `mac-mini`를 추가한다. `./svc.sh install && ./svc.sh start`로 launchd 서비스로 등록한다.
4. Codex CLI에 로그인한 뒤 `codex app-server --listen ws://127.0.0.1:14561`을 launchd로 상시 실행한다. `RAG_CODEX_CWD`에 지정한 작업 경로를 미리 만든다.
5. Cloudflare Zero Trust에서 Mac mini용 tunnel을 만들고 `api.icecoke.kr` public hostname을 `http://localhost:3000`으로 연결한다. cloudflared를 `brew services start cloudflared`로 실행한다. 기존 Ubuntu tunnel의 `api.icecoke.kr` route는 전환 시점에 제거한다.
6. Repository Secret `API_ENV_PRODUCTION`을 Docker 기준으로 갱신한다. 아래 표의 값이 다르면 배포가 실패하거나 AI 답변이 동작하지 않는다.

| 변수                            | Docker 운영 값                       | 이유                                                                                                                                      |
| ------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `DB_HOST`                       | `postgres`                           | compose 네트워크의 서비스 이름                                                                                                            |
| `DB_PORT`                       | `5432`                               | 컨테이너 내부 포트. 호스트에 publish하지 않는다                                                                                           |
| `PORT`                          | `3000` 또는 cloudflared ingress 포트 | compose가 같은 값으로 호스트 loopback에 publish한다                                                                                       |
| `RAG_CODEX_APP_SERVER_URL`      | `ws://host.docker.internal:14561`    | Codex app-server는 호스트에서 실행된다                                                                                                    |
| `RAG_CODEX_CWD`                 | 호스트의 sandbox 경로                | Codex 프로세스가 호스트에서 읽는다                                                                                                        |
| `RAG_LOCAL_EMBEDDING_CACHE_DIR` | `/app/.cache/embeddings`             | named volume mount 경로. 최초 배포는 volume이 비어 있으므로 `RAG_LOCAL_EMBEDDING_LOCAL_FILES_ONLY=false`로 모델을 받은 뒤 `true`로 바꾼다 |

전환 절차(DB 이관 포함)는 [API 배포 가이드](../apps/api/DEPLOY.md#4-ubuntu-host에서-mac-mini-docker로-전환)를 따른다.

## 환경 변수 관리 기준

환경 변수는 저장소에 커밋하지 않는다. 값이 필요한 위치와 책임자를 앱별로 분리한다.

### Web 환경 변수

웹 환경 변수는 Vercel Project Settings에서 관리한다. 로컬 개발 기본값은 `apps/web/.env.example`을 복사해 구성한다.

| 이름                            | 필수 | 위치               | 설명                                                      |
| ------------------------------- | ---- | ------------------ | --------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL`           | 필수 | Vercel web project | 브라우저에서 호출할 API 공개 URL                          |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | 선택 | Vercel web project | GA4 직접 연결용 측정 ID. 없으면 gtag.js를 렌더링하지 않음 |
| `NEXT_PUBLIC_GTM_ID`            | 선택 | Vercel web project | GA4/GTM 웹 컨테이너 ID. 없으면 태그를 렌더링하지 않음     |
| `AUTH_GOOGLE_ID`                | 필수 | Vercel web project | Google OAuth client id                                    |
| `AUTH_GOOGLE_SECRET`            | 필수 | Vercel web project | Google OAuth client secret                                |
| `AUTH_SECRET`                   | 필수 | Vercel web project | Auth.js session/signing secret                            |
| `AUTH_URL`                      | 선택 | Vercel web project | 플랫폼이 URL을 추론하지 못할 때                           |

주의:

- `NEXT_PUBLIC_` 값은 클라이언트 번들에 포함된다. 비밀값을 넣지 않는다.
- 웹 오류 수집은 `NEXT_PUBLIC_API_URL`의 `/client-errors`를 사용한다. Production·Preview
  origin은 API의 `CORS_ORIGINS`에 정확히 등록해야 한다. Next 서버 오류도 같은 API로 전달하며,
  전달 실패는 Vercel Runtime Logs에 기록된다.
- `AUTH_GOOGLE_SECRET`, `AUTH_SECRET` 같은 비밀값에는 `NEXT_PUBLIC_` prefix를 붙이지 않는다.
- `NEXT_PUBLIC_GA_MEASUREMENT_ID`에는 `G-`로 시작하는 GA4 측정 ID만 넣는다.
- `NEXT_PUBLIC_GTM_ID`에는 `GTM-`로 시작하는 웹 컨테이너 ID만 넣는다.
- GA4를 코드에서 직접 연결한 상태에서 GTM에도 같은 GA4 태그를 게시하면 page_view가 중복 집계될 수 있으므로 운영에서는 한 경로만 활성화한다.
- 일반 GA4와 웹 GTM 연결은 무료 사용 범위다. Analytics 360, Tag Manager 360, BigQuery export, server-side GTM은 별도 비용이나 Google Cloud 과금이 생길 수 있다.
- API 도메인이나 Auth 값을 바꾸면 Vercel Production, Preview 환경 값을 모두 확인하고 재배포한다.
- 로컬에서 웹만 빌드 확인할 때는 임시 값으로 실행할 수 있다.

```bash
NEXT_PUBLIC_API_URL=http://127.0.0.1:65535 pnpm build:web
```

### API 환경 변수

API 로컬 개발 값은 `apps/api/.env`에 둔다. 시작점은 `apps/api/.env.example`을 복사해 사용한다.

API 운영값의 원본은 GitHub Repository Secret `API_ENV_PRODUCTION`이다. dotenv 전체 내용을
한 Secret으로 관리하며, 배포마다 Mac mini의 `$API_DEPLOY_DIR/api.env`, postgres 초기화용
`postgres.env`, compose 보간용 `.env`를 생성한다. 서버 파일은 실행용 결과물이며 직접 편집하지
않는다. API 컨테이너와 공개 원본 import/index는 컨테이너 안의 `api-deploy-env.mjs run`이 mount된
`/app/.env`를 파싱해 주입한 환경을 사용한다. compose `environment`보다 파일값이 우선하며 dotenv
내용은 셸 명령으로 실행하지 않는다.

| 이름                      | 필수                  | 기본값                                 | 설명                                                                                       |
| ------------------------- | --------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------ |
| `NODE_ENV`                | 권장                  | `development`                          | 운영에서는 `production`                                                                    |
| `PORT`                    | 권장                  | `3000`                                 | API 리슨 포트. compose가 같은 값을 호스트 loopback에 publish한다                           |
| `TRUST_PROXY`             | 운영 compose 주입     | `loopback`                             | Express trust proxy. Docker에서는 `loopback, uniquelocal`                                  |
| `LOG_LEVEL`               | 선택                  | `development=debug`, `production=info` | Winston 콘솔·일별 파일 로그 최소 레벨 (`error`, `warn`, `info`, `debug` 등)                |
| `CORS_ORIGINS`            | 권장                  | 기본 허용 origin + 추가 없음           | 쉼표로 구분한 추가 허용 origin                                                             |
| `GOOGLE_CLIENT_ID`        | 필수                  | 없음                                   | Google OAuth 토큰 검증                                                                     |
| `DB_HOST`                 | 필수                  | `localhost`                            | PostgreSQL host. Docker 운영은 `postgres`                                                  |
| `DB_PORT`                 | 필수                  | `5432`                                 | PostgreSQL port. Docker 운영은 `5432`                                                      |
| `DB_USERNAME`             | 필수                  | `postgres`                             | PostgreSQL user                                                                            |
| `DB_PASSWORD`             | 필수                  | `postgres`                             | PostgreSQL password                                                                        |
| `DB_DATABASE`             | 필수                  | `vscoke`                               | PostgreSQL database                                                                        |
| `DB_SYNCHRONIZE`          | 운영 필수             | production에서는 `false` 취급          | TypeORM synchronize 제어                                                                   |
| `JEV_API_KEY`             | JEV 게임 사용 시 필수 | 없음                                   | JEV 상대 행동 선택용 서버 API 키                                                           |
| `NOTIFY_SERVICE_URL`      | 선택                  | 없음                                   | 운영 에러 알림 endpoint                                                                    |
| `NOTIFY_SERVICE_USER`     | 선택                  | 없음                                   | 알림 endpoint basic auth user                                                              |
| `NOTIFY_SERVICE_PASSWORD` | 선택                  | 없음                                   | 알림 endpoint basic auth password                                                          |
| `ENABLE_DEV_AUTH_BYPASS`  | 개발 전용             | `false` 취급                           | 개발 인증 우회                                                                             |
| `DEV_AUTH_TOKEN`          | 개발 전용             | 없음                                   | 개발 인증 우회 토큰                                                                        |
| `CLOUDFLARE_DB_HOST`      | 개발 보조             | 없음                                   | `db:tunnel` 스크립트용 hostname. 이전 Ubuntu host DB 비교 용도이며 운영 DB에는 쓰지 않는다 |

`JEV_API_KEY`는 API 서버에 설정한다. `GET /beat-jev/status`는 키 값 없이 설정 여부만 반환한다.
키가 비어 있거나 상태 조회에 실패하면 웹의 게임 카드와 검색에서 JEV 게임을 숨기고, 직접 URL
접근은 게임 센터로 돌려보낸다. 키가 없으면 새 매치 생성도 차단한다. Vercel에만 키를 등록해도
API 서버의 JEV 게임은 활성화되지 않는다.

사용 집계를 조회하려면 API 서버에 32자 이상의 `USAGE_ANALYTICS_READ_KEY`를 설정한다.
브라우저에는 노출하지 않는다. 신규 `usage_events` migration을 적용해야 이벤트 수집이 가능하다.
집계 기준과 호출 예시는 [운영 로그와 사용 집계](./observability-and-usage.md)를 따른다.

Resume RAG와 메인 채팅 변수, 기본값과 데이터 정책은
[메인 채팅·이력 질문 AI 사용 지침](./main-chat-ai-usage-guide.md)을 따른다. 실제 변수 목록은
`apps/api/.env.example`이 기준이다.

운영 주의:

- `LOG_LEVEL`은 미설정·빈값·공백이면 기본 레벨을 사용한다. 유효한 값은 공백을 제거하고 소문자로 정규화하며 잘못된 레벨은 시작 시 실패한다.

- `ENABLE_DEV_AUTH_BYPASS`와 `DEV_AUTH_TOKEN`은 운영 `.env`에 넣지 않는다.
- `DB_SYNCHRONIZE=false`를 명시한다. 코드 기본값도 `false`이며, 운영에서 `DB_SYNCHRONIZE=true`면 API가 fail-fast 한다.
- API 배포 workflow는 migration을 자동 실행하지 않는다. 운영 DB migration은 백업과 ledger 확인 후 별도 maintenance 작업으로 실행한다.
- 기본 CORS 허용 origin은 production 웹 도메인과 로컬 개발 웹 도메인뿐이다.
- Vercel preview에서 production API 직접 호출이 필요하면 preview origin을 `CORS_ORIGINS`에 명시한다. wildcard, path 포함 URL, http/https가 아닌 값은 허용 목록에서 제외된다.
- 운영 에러 알림은 `NOTIFY_SERVICE_URL`, `NOTIFY_SERVICE_USER`, `NOTIFY_SERVICE_PASSWORD`가 모두 설정된 경우에만 전역 예외 필터가 전송한다. 기본 endpoint나 기본 계정 fallback은 없다.
- 웹의 브라우저·Next 서버 오류는 API `logs/error-*.log`에 `web.error`로 기록한다. API 요청과
  예외는 `requestId`로 연결한다. 로그 조회 절차는 [Operations Runbook](./operations-runbook.md#febe-오류-추적)을 따른다.
- 환경변수 변경은 `API_ENV_PRODUCTION` Secret을 수정하고 API 배포 workflow를 수동 재실행한다.
  Secret 수정 자체는 배포를 시작하지 않는다. 서버 `.env`를 직접 수정하면 다음 배포에서 덮어쓴다.

### 운영 DB migration

backup, legacy baseline, 실행과 rollback 절차는
[API 배포 가이드](../apps/api/DEPLOY.md#3-db-schema-변경)를 따른다.

Secret 수정과 재배포 절차는 [API 배포 가이드](../apps/api/DEPLOY.md#2-환경-변수-배포-github-secret)를
따른다.

### GitHub Actions Runner and Variables

API 배포는 Mac mini self-hosted runner에서 직접 실행하므로 SSH 접속용 GitHub Actions secrets를 사용하지 않는다. 애플리케이션 런타임 환경변수는 Repository Secret `API_ENV_PRODUCTION`에서만 관리하며, workflow가 서버 `.env`로 전달한다.

필수 runner 조건:

| 항목        | 값                                                                     |
| ----------- | ---------------------------------------------------------------------- |
| runner type | repository self-hosted runner                                          |
| labels      | `self-hosted`, `vscoke-api`, `mac-mini`                                |
| runtime     | macOS arm64, OrbStack Docker 29 이상, Docker Compose v2.30 이상, rsync |

`actions/setup-node@v4`가 `.nvmrc`의 Node.js를 받아 Secret 검증과 health 검사에 사용한다. 애플리케이션 Node.js는 이미지 안의 `node:24.22.1-bookworm-slim`이다.

선택 값:

| 이름             | 설명                                                                                                                                            |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `API_HEALTH_URL` | 공개 API smoke test URL. GitHub Actions repository variable이다. 기본값은 `https://api.icecoke.kr/health`                                       |
| `API_DEPLOY_DIR` | Mac mini 배포 디렉터리. GitHub Actions repository variable이다. 기본값은 `/Users/smlee/projects/vscoke-api`. Ubuntu 경로가 남아 있으면 제거한다 |
