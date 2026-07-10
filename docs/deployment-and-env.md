# Deployment and Environment Plan

VSCoke monorepo의 배포와 환경 변수 관리는 앱별로 분리한다.

```txt
apps/web -> Vercel
apps/api -> GitHub Actions self-hosted runner on Ubuntu host -> PM2 -> Cloudflare Tunnel
```

루트 GitHub 저장소는 하나만 유지하되, 웹과 API는 서로 다른 배포 주체를 가진다.

## 배포 기준

### Pull Request Check

PR은 배포 전에 `.github/workflows/pull-request-check.yml`로 검증한다. 이 workflow는 `main` 대상 pull request와 수동 실행(`workflow_dispatch`)에서 동작한다.

공통 기준:

- Node.js 20
- `pnpm@9.12.0`
- `pnpm install --frozen-lockfile`
- `NEXT_PUBLIC_API_URL=https://api.icecoke.kr`

검증 job:

| Job | 실행 내용                                                                                                                               |
| --- | --------------------------------------------------------------------------------------------------------------------------------------- |
| API | `pnpm --filter @vscoke/api lint`, `pnpm test:api`, `pnpm test:api:e2e`, `pnpm build:api`                                                |
| Web | Playwright Chromium 설치, `pnpm check:api-contract`, `pnpm type:check:web`, `pnpm lint:web`, `pnpm knip`, `pnpm build:web`, focused E2E |

현재 focused E2E는 `i18n-integrity.spec.ts`, `hobby-games.spec.ts`, `keyboard-only.spec.ts`를 Chromium에서 실행한다. 전체 E2E와 cross-browser 회귀는 실행 시간이 크므로 기본 PR workflow에는 넣지 않고 필요 시 로컬 또는 별도 workflow에서 실행한다.

### Web: Vercel

Vercel 프로젝트는 monorepo 루트가 아니라 웹 앱 디렉터리를 루트로 잡는다.

| 항목             | 값                                                    |
| ---------------- | ----------------------------------------------------- |
| Root Directory   | `apps/web`                                            |
| Framework Preset | `Next.js`                                             |
| Build Command    | `pnpm build`                                          |
| Install Command  | 기본값 유지, 필요 시 `pnpm install --frozen-lockfile` |
| Node.js Version  | `22.x`                                                |
| Production env   | Web 환경 변수 표 참고                                 |

- Vercel은 `apps/web/package.json`의 `build` 스크립트를 실행해야 한다.
- Install Command는 Vercel의 pnpm monorepo 감지를 우선 사용하고, 문제가 있을 때만 override한다.
- Vercel Root Directory가 저장소 루트(`/`)로 남아 있으면 루트 `pnpm build`가 실행되어 API 빌드까지 포함될 수 있다.
- 웹 배포용 GitHub Actions는 만들지 않는다. 웹은 Vercel Git integration이 담당한다.
- Preview 배포도 같은 Vercel 프로젝트에서 처리한다. Preview가 API를 호출해야 하면 `NEXT_PUBLIC_API_URL`을 preview 환경에도 설정한다.
- Vercel 환경 변수 변경은 기존 배포에 소급 적용되지 않는다. 값을 바꾼 뒤에는 새 deployment를 생성한다.
- 현재 Vercel Root Directory는 `apps/web`, Node.js Version은 `22.x` 기준으로 운영한다.

참고:

- [Vercel Monorepos](https://vercel.com/docs/monorepos)
- [Vercel Configuring a Build](https://vercel.com/docs/builds/configure-a-build)

### API: Ubuntu Host

API는 Ubuntu 호스트에 설치된 GitHub Actions self-hosted runner가 `.github/workflows/deploy-api.yml`을 실행해 배포한다.

필수 runner labels:

```txt
self-hosted
vscoke-api
host
```

현재 워크플로 기준:

1. `main` 브랜치에 `apps/api/**`, 루트 패키지/락파일, API 배포 워크플로 변경이 push된다.
2. Ubuntu 호스트의 self-hosted runner가 job을 실행한다. runner는 systemd 서비스로 관리한다.
3. workflow build runtime은 `actions/setup-node@v4`의 Node.js 24를 사용한다.
4. runner 작업 디렉터리에서 의존성을 설치한다.
5. `pnpm --filter @vscoke/api build`로 API를 빌드한다.
6. Ubuntu host의 `node`, `corepack`, `pm2`를 사용한다.
7. `/home/icenux/projects/vscoke-api/.env`가 있는지 확인한다.
8. `/home/icenux/projects/vscoke-api/.next-release`에 `apps/api/dist`, `apps/api/package.json`, 루트 `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`을 staging한다.
9. staging 경로에서 production 의존성을 설치한다.
10. staging이 성공하면 `/home/icenux/projects/vscoke-api`로 release 파일을 복사하고 PM2로 API를 재기동한다.
11. Ubuntu host 내부 `http://127.0.0.1:$PORT/health`와 공개 `API_HEALTH_URL`을 smoke test한다.

운영 프로세스 기준:

| 항목        | 값                                 |
| ----------- | ---------------------------------- |
| SSH 접속    | `ssh icenux-external`              |
| 서버 경로   | `/home/icenux/projects/vscoke-api` |
| PM2 앱 이름 | `vscoke-api`                       |
| 실행 파일   | `apps/api/dist/src/main.js`        |
| 기본 포트   | `3000` 또는 `.env`의 `PORT`        |
| 외부 노출   | Cloudflare Tunnel                  |

현재 systemd/프로세스 기준:

| 항목                             | 기대 상태           | 설명                                 |
| -------------------------------- | ------------------- | ------------------------------------ |
| `pm2-icenux.service`             | `enabled`, `active` | 재부팅 시 PM2 dump를 복구한다.       |
| `vscoke-api`                     | PM2 `online`        | 운영 API 프로세스                    |
| `cloudflared-icenux.service`     | `enabled`, `active` | `api.icecoke.kr` 터널                |
| `vscoke-api-native.service`      | `disabled/inactive` | 이전 `/opt/icenux/vscoke-api` 서비스 |
| `vscoke-api-local-proxy.service` | `disabled/inactive` | 이전 Docker API용 local proxy        |

PM2 운영 기준:

- GitHub Actions 배포는 `pm2 delete vscoke-api || true` 후 새 프로세스를 시작한다.
- GitHub Actions 배포는 재시작 후 `pm2 save`를 실행해 현재 프로세스 목록을 저장한다.
- 빌드와 staging 의존성 설치가 성공하기 전에는 기존 PM2 프로세스를 건드리지 않는다.
- PM2 dump에는 `vscoke-api`가 포함되어야 한다.
- 기기 재부팅 후 복구가 필요하면 systemd PM2 startup에서 `pm2 resurrect`가 실행되도록 구성한다.
- Cloudflare Tunnel 실행 방식도 재부팅 후 복구 대상에 포함한다. Tunnel이 별도 systemd 서비스로 관리되는지 운영 환경에서 확인한다.

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

API 운영 값은 Ubuntu host의 `/home/icenux/projects/vscoke-api/.env`에 둔다. 현재 PM2 실행은 이 경로에서 시작되므로 Nest `ConfigModule`이 이 위치의 `.env`를 읽는다.

| 이름                       | 필수      | 기본값                        | 설명                                                                      |
| -------------------------- | --------- | ----------------------------- | ------------------------------------------------------------------------- |
| `NODE_ENV`                 | 권장      | `development`                 | 운영에서는 `production`                                                   |
| `PORT`                     | 권장      | `3000`                        | API 리슨 포트                                                             |
| `CORS_ORIGINS`             | 권장      | 기본 허용 origin + 추가 없음  | 쉼표로 구분한 추가 허용 origin                                            |
| `GOOGLE_CLIENT_ID`         | 필수      | 없음                          | Google OAuth 토큰 검증                                                    |
| `DB_HOST`                  | 필수      | `localhost`                   | PostgreSQL host                                                           |
| `DB_PORT`                  | 필수      | `5432`                        | PostgreSQL port                                                           |
| `DB_USERNAME`              | 필수      | `postgres`                    | PostgreSQL user                                                           |
| `DB_PASSWORD`              | 필수      | `postgres`                    | PostgreSQL password                                                       |
| `DB_DATABASE`              | 필수      | `vscoke`                      | PostgreSQL database                                                       |
| `DB_SYNCHRONIZE`           | 운영 필수 | production에서는 `false` 취급 | TypeORM synchronize 제어                                                  |
| `NOTIFY_SERVICE_URL`       | 선택      | 없음                          | 운영 에러 알림 endpoint                                                   |
| `NOTIFY_SERVICE_USER`      | 선택      | 없음                          | 알림 endpoint basic auth user                                             |
| `NOTIFY_SERVICE_PASSWORD`  | 선택      | 없음                          | 알림 endpoint basic auth password                                         |
| `ENABLE_DEV_AUTH_BYPASS`   | 개발 전용 | `false` 취급                  | 개발 인증 우회                                                            |
| `DEV_AUTH_TOKEN`           | 개발 전용 | 없음                          | 개발 인증 우회 토큰                                                       |
| `CLOUDFLARE_DB_HOST`       | 개발 보조 | 없음                          | `db:tunnel` 스크립트용 DB hostname                                        |
| `RAG_CHAT_PROVIDER`        | 필수      | 없음                          | 이력 RAG 답변 생성 provider. 운영은 `codex-app-server`                    |
| `RAG_CODEX_APP_SERVER_URL` | 필수      | `ws://127.0.0.1:14561`        | Ubuntu host의 Codex app-server loopback endpoint                          |
| `RAG_CODEX_CWD`            | 필수      | 없음                          | Codex app-server 작업 디렉터리. 운영은 `/home/icenux/projects/vscoke-api` |
| `RAG_CODEX_TIMEOUT_MS`     | 권장      | `120000`                      | Codex app-server 응답 timeout                                             |
| `RAG_CHAT_MODEL`           | 선택      | 없음                          | 비워두면 Codex app-server 기본 모델 사용                                  |
| `RAG_CODEX_MODEL_PROVIDER` | 선택      | 없음                          | Codex app-server provider 힌트. 비워두면 app-server 기본값 사용           |
| `RAG_PUBLIC_CHAT_ORIGINS`  | 운영 권장 | `https://vscoke.vercel.app`   | 공개 이력 질문 API를 허용할 브라우저 origin 목록                          |
| `RAG_EMBEDDING_PROVIDER`   | 선택      | 없음                          | 선택적 벡터 인덱싱용 embedding provider                                   |
| `RAG_EMBEDDING_MODEL`      | 선택      | 없음                          | 선택적 벡터 인덱싱용 embedding model                                      |
| `RAG_EMBEDDING_DIMENSIONS` | 선택      | 없음                          | 선택적 벡터 인덱싱용 embedding dimension                                  |
| `RAG_AI_BASE_URL`          | 선택      | 없음                          | 선택적 openai-compatible 임베딩/벡터 인덱싱 endpoint                      |
| `RAG_AI_API_KEY`           | 선택      | 없음                          | 선택적 openai-compatible 임베딩/벡터 인덱싱 키                            |
| `RAG_TOP_K`                | 권장      | `5`                           | 텍스트 검색 후보 수                                                       |
| `RAG_MIN_SIMILARITY`       | 권장      | `0.1`                         | 텍스트 검색 최소 점수                                                     |
| `RAG_CHUNK_SIZE`           | 선택      | `1200`                        | 선택적 source item chunking 크기                                          |
| `RAG_CHUNK_OVERLAP`        | 선택      | `120`                         | 선택적 source item chunking overlap                                       |
| `RAG_ALLOWED_VISIBILITIES` | 권장      | `public`                      | RAG 검색 허용 visibility 목록                                             |

Resume RAG 운영 chat은 `resume_source_items`의 기존 DB 텍스트를 keyword/text search로 검색하고, 검색된 근거를 Codex app-server에 전달해 답변만 생성한다. 따라서 운영 chat runtime에는 OpenAI/API 임베딩 키가 필요하지 않다.

벡터 인덱싱과 임베딩 설정(`RAG_EMBEDDING_PROVIDER`, `RAG_EMBEDDING_MODEL`, `RAG_EMBEDDING_DIMENSIONS`, `RAG_AI_API_KEY`)은 현재 운영 배포의 필수 경로가 아니라 legacy/future 선택 경로다. 별도 벡터 인덱싱을 다시 사용할 때만 설정한다.

운영 주의:

- `ENABLE_DEV_AUTH_BYPASS`와 `DEV_AUTH_TOKEN`은 운영 `.env`에 넣지 않는다.
- `DB_SYNCHRONIZE=false`를 명시한다. 코드 기본값도 `false`이며, 운영에서 `DB_SYNCHRONIZE=true`면 API가 fail-fast 한다.
- `RAG_CHAT_PROVIDER=codex-app-server`를 명시한다.
- Ubuntu host에서는 `RAG_CODEX_APP_SERVER_URL=ws://127.0.0.1:14561`, `RAG_CODEX_CWD=/home/icenux/projects/vscoke-api`를 기준값으로 둔다.
- 공개 이력 질문은 사용자 로그인 없이 동작하되, `RAG_PUBLIC_CHAT_ORIGINS=https://vscoke.vercel.app` 기준으로 공식 운영 웹 origin에서 온 브라우저 요청만 허용한다.
- 운영 chat만 사용할 때는 `RAG_AI_API_KEY`를 요구하지 않는다.
- 기본 CORS 허용 origin은 production 웹 도메인과 로컬 개발 웹 도메인뿐이다.
- Vercel preview에서 production API 직접 호출이 필요하면 preview origin을 `CORS_ORIGINS`에 명시한다. wildcard, path 포함 URL, http/https가 아닌 값은 허용 목록에서 제외된다.
- 운영 에러 알림은 `NOTIFY_SERVICE_URL`, `NOTIFY_SERVICE_USER`, `NOTIFY_SERVICE_PASSWORD`가 모두 설정된 경우에만 전역 예외 필터가 전송한다. 기본 endpoint나 기본 계정 fallback은 없다.
- `.env`만 변경한 경우 코드 배포 없이 PM2 재시작이 필요하다.

```bash
scp .env icenux-external:/home/icenux/projects/vscoke-api/.env
ssh icenux-external "chmod 600 /home/icenux/projects/vscoke-api/.env"
ssh icenux-external "cd /home/icenux/projects/vscoke-api && pm2 restart vscoke-api --update-env && pm2 save"
```

### GitHub Actions Runner and Variables

API 배포는 Ubuntu host self-hosted runner에서 직접 실행하므로 SSH 접속용 GitHub Actions secrets를 사용하지 않는다. 애플리케이션 런타임 비밀값은 Ubuntu host `/home/icenux/projects/vscoke-api/.env`에서 관리한다.

필수 runner 조건:

| 항목        | 값                                         |
| ----------- | ------------------------------------------ |
| runner type | repository self-hosted runner              |
| labels      | `self-hosted`, `vscoke-api`, `host`        |
| runtime     | Ubuntu host Node.js 20 이상, Corepack, PM2 |

선택 값:

| 이름             | 설명                                                                                                           |
| ---------------- | -------------------------------------------------------------------------------------------------------------- |
| `API_HEALTH_URL` | 공개 API smoke test URL. GitHub Actions repository variable이다. 기본값은 `https://api.icecoke.kr/health`      |
| `API_DEPLOY_DIR` | Ubuntu host 배포 디렉터리. GitHub Actions repository variable이다. 기본값은 `/home/icenux/projects/vscoke-api` |

## 앞으로 해야 할 일

- [x] Vercel web 프로젝트의 Root Directory를 `apps/web`으로 변경한다.
- [x] Vercel Production/Preview 환경에 web 환경 변수 표의 필수 값을 설정한다.
- [x] Ubuntu host의 `/home/icenux/projects/vscoke-api/.env`를 현재 API 환경 변수 목록 기준으로 정리한다.
- [x] Ubuntu host에 self-hosted runner를 설치하고 `vscoke-api`, `host` label을 부여한다.
- [x] Cloudflare Tunnel이 API 도메인을 Ubuntu host API 포트로 라우팅하는지 확인한다.
- [x] API 배포 후 `https://api.icecoke.kr/health`를 smoke test한다.
- [ ] 웹의 API 호출 경로와 CORS를 production UI에서 smoke test한다.
- [ ] standalone `vscoke-api` 저장소는 monorepo 배포가 1회 이상 성공한 뒤 archive한다.
- [x] secret 없는 `apps/api/.env.example`과 `apps/web/.env.example`을 추가해 신규 환경 구성을 표준화한다.
- [x] API lint debt를 정리한 뒤 루트 `pnpm lint`에 API lint를 포함한다.
- [x] PM2 재부팅 복구 기준을 문서화한다.
- [x] PM2 실행 명령을 `ecosystem.config.cjs`로 옮길지 검토한다. 현재는 서버 `.env` 위치를 `~/projects/vscoke-api/.env`로 유지하기 위해 workflow 명령 기반 실행을 유지한다.
