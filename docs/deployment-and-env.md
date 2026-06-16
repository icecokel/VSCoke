# Deployment and Environment Plan

VSCoke monorepo의 배포와 환경 변수 관리는 앱별로 분리한다.

```txt
apps/web -> Vercel
apps/api -> GitHub Actions self-hosted runner on Termux -> PM2 -> Cloudflare Tunnel
```

루트 GitHub 저장소는 하나만 유지하되, 웹과 API는 서로 다른 배포 주체를 가진다.

## 배포 기준

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
- 2026-06-16 기준 Vercel Root Directory는 `apps/web`, Node.js Version은 `22.x`로 전환했고 production 배포가 `Ready` 상태임을 확인했다.

참고:

- [Vercel Monorepos](https://vercel.com/docs/monorepos)
- [Vercel Configuring a Build](https://vercel.com/docs/builds/configure-a-build)

### API: Termux Server

API는 Termux 서버에 설치된 GitHub Actions self-hosted runner가 `.github/workflows/deploy-api.yml`을 실행해 배포한다.

필수 runner labels:

```txt
self-hosted
termux
vscoke-api
```

현재 워크플로 기준:

1. `main` 브랜치에 `apps/api/**`, 루트 패키지/락파일, API 배포 워크플로 변경이 push된다.
2. Termux 서버의 self-hosted runner가 job을 실행한다. 현재 runner 프로세스는 Termux PM2가 관리하고, runner 본체는 Ubuntu/proot 안에서 실행한다.
3. runner 작업 디렉터리에서 의존성을 설치한다.
4. `pnpm --filter @vscoke/api build`로 API를 빌드한다.
5. Termux native runtime 경로(`/data/data/com.termux/files/usr/bin`)의 `node`, `corepack`, `pm2`를 사용한다.
6. `/data/data/com.termux/files/home/projects/vscoke-api/.env`가 있는지 확인한다.
7. `/data/data/com.termux/files/home/projects/vscoke-api/.next-release`에 `apps/api/dist`, `apps/api/package.json`, 루트 `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`을 staging한다.
8. staging 경로에서 production 의존성을 설치한다.
9. staging이 성공하면 `/data/data/com.termux/files/home/projects/vscoke-api`로 release 파일을 복사하고 PM2로 API를 재기동한다.
10. Termux 내부 `http://127.0.0.1:$PORT/api-json`와 공개 `API_HEALTH_URL`을 smoke test한다.

운영 프로세스 기준:

| 항목        | 값                                                     |
| ----------- | ------------------------------------------------------ |
| 서버 경로   | `/data/data/com.termux/files/home/projects/vscoke-api` |
| PM2 앱 이름 | `vscoke-api`                                           |
| 실행 파일   | `apps/api/dist/src/main.js`                            |
| 기본 포트   | `3000` 또는 `.env`의 `PORT`                            |
| 외부 노출   | Cloudflare Tunnel                                      |

PM2 운영 기준:

- GitHub Actions 배포는 `pm2 delete vscoke-api || true` 후 새 프로세스를 시작한다.
- GitHub Actions 배포는 재시작 후 `pm2 save`를 실행해 현재 프로세스 목록을 저장한다.
- 빌드와 staging 의존성 설치가 성공하기 전에는 기존 PM2 프로세스를 건드리지 않는다.
- 기기 재부팅 후 복구가 필요하면 Termux:Boot 또는 서버의 기존 부팅 자동화에서 `pm2 resurrect`를 실행하도록 구성한다.
- Cloudflare Tunnel 실행 방식도 재부팅 후 복구 대상에 포함한다. Tunnel이 별도 서비스로 관리되는지, Termux boot script로 관리되는지 운영 환경에서 확인한다.

## 환경 변수 관리 기준

환경 변수는 저장소에 커밋하지 않는다. 값이 필요한 위치와 책임자를 앱별로 분리한다.

### Web 환경 변수

웹 환경 변수는 Vercel Project Settings에서 관리한다. 로컬 개발 기본값은 `apps/web/.env.example`을 복사해 구성한다.

| 이름                  | 필수 | 위치               | 설명                             |
| --------------------- | ---- | ------------------ | -------------------------------- |
| `NEXT_PUBLIC_API_URL` | 필수 | Vercel web project | 브라우저에서 호출할 API 공개 URL |
| `AUTH_GOOGLE_ID`      | 필수 | Vercel web project | Google OAuth client id           |
| `AUTH_GOOGLE_SECRET`  | 필수 | Vercel web project | Google OAuth client secret       |
| `AUTH_SECRET`         | 필수 | Vercel web project | Auth.js session/signing secret   |
| `AUTH_URL`            | 선택 | Vercel web project | 플랫폼이 URL을 추론하지 못할 때  |

주의:

- `NEXT_PUBLIC_` 값은 클라이언트 번들에 포함된다. 비밀값을 넣지 않는다.
- `AUTH_GOOGLE_SECRET`, `AUTH_SECRET` 같은 비밀값에는 `NEXT_PUBLIC_` prefix를 붙이지 않는다.
- API 도메인이나 Auth 값을 바꾸면 Vercel Production, Preview 환경 값을 모두 확인하고 재배포한다.
- 로컬에서 웹만 빌드 확인할 때는 임시 값으로 실행할 수 있다.

```bash
NEXT_PUBLIC_API_URL=http://127.0.0.1:65535 pnpm build:web
```

### API 환경 변수

API 로컬 개발 값은 `apps/api/.env`에 둔다. 시작점은 `apps/api/.env.example`을 복사해 사용한다.

API 운영 값은 Termux 서버의 `~/projects/vscoke-api/.env`에 둔다. 현재 PM2 실행은 `~/projects/vscoke-api`에서 시작되므로 Nest `ConfigModule`이 이 위치의 `.env`를 읽는다.

| 이름                      | 필수      | 기본값                        | 설명                               |
| ------------------------- | --------- | ----------------------------- | ---------------------------------- |
| `NODE_ENV`                | 권장      | `development`                 | 운영에서는 `production`            |
| `PORT`                    | 권장      | `3000`                        | API 리슨 포트                      |
| `CORS_ORIGINS`            | 권장      | 기본 허용 origin + 추가 없음  | 쉼표로 구분한 추가 허용 origin     |
| `GOOGLE_CLIENT_ID`        | 필수      | 없음                          | Google OAuth 토큰 검증             |
| `DB_HOST`                 | 필수      | `localhost`                   | PostgreSQL host                    |
| `DB_PORT`                 | 필수      | `5432`                        | PostgreSQL port                    |
| `DB_USERNAME`             | 필수      | `postgres`                    | PostgreSQL user                    |
| `DB_PASSWORD`             | 필수      | `postgres`                    | PostgreSQL password                |
| `DB_DATABASE`             | 필수      | `vscoke`                      | PostgreSQL database                |
| `DB_SYNCHRONIZE`          | 운영 필수 | production에서는 `false` 취급 | TypeORM synchronize 제어           |
| `NOTIFY_SERVICE_URL`      | 선택      | localhost fallback            | 운영 에러 알림 endpoint            |
| `NOTIFY_SERVICE_USER`     | 선택      | `admin`                       | 알림 endpoint basic auth user      |
| `NOTIFY_SERVICE_PASSWORD` | 선택      | `admin`                       | 알림 endpoint basic auth password  |
| `ENABLE_DEV_AUTH_BYPASS`  | 개발 전용 | `false` 취급                  | 개발 인증 우회                     |
| `DEV_AUTH_TOKEN`          | 개발 전용 | 없음                          | 개발 인증 우회 토큰                |
| `CLOUDFLARE_DB_HOST`      | 개발 보조 | 없음                          | `db:tunnel` 스크립트용 DB hostname |

운영 주의:

- `ENABLE_DEV_AUTH_BYPASS`와 `DEV_AUTH_TOKEN`은 운영 `.env`에 넣지 않는다.
- `DB_SYNCHRONIZE=false`를 명시한다.
- Vercel production 도메인과 preview 도메인을 허용해야 하면 `CORS_ORIGINS`에 추가한다.
- `NODE_ENV=production`이면 `NotifyTransport`가 활성화된다. `NOTIFY_SERVICE_URL`을 비워두면 `http://localhost:7232/api/notify/send`로 fallback 하므로, 운영에서 알림 서비스를 쓰지 않을 계획이면 코드 또는 설정으로 비활성화 방식을 별도 결정한다.
- `.env`만 변경한 경우 코드 배포 없이 PM2 재시작이 필요하다.

```bash
tmx cp .env
tmx run "pm2 restart vscoke-api --update-env"
```

### GitHub Actions Runner and Variables

API 배포는 Termux self-hosted runner에서 직접 실행하므로 SSH 접속용 GitHub Actions secrets를 사용하지 않는다. 애플리케이션 런타임 비밀값은 Termux `~/projects/vscoke-api/.env`에서 관리한다.

필수 runner 조건:

| 항목        | 값                                           |
| ----------- | -------------------------------------------- |
| runner type | repository self-hosted runner                |
| labels      | `self-hosted`, `termux`, `vscoke-api`        |
| runtime     | Termux native Node.js 20 이상, Corepack, PM2 |

선택 값:

| 이름             | 설명                                                                                                                          |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `API_HEALTH_URL` | 공개 API smoke test URL. GitHub Actions repository variable이다. 기본값은 `https://api.icecoke.kr/api-json`                   |
| `API_DEPLOY_DIR` | Termux 배포 디렉터리. GitHub Actions repository variable이다. 기본값은 `/data/data/com.termux/files/home/projects/vscoke-api` |

## 앞으로 해야 할 일

- [x] Vercel web 프로젝트의 Root Directory를 `apps/web`으로 변경한다.
- [x] Vercel Production/Preview 환경에 web 환경 변수 표의 필수 값을 설정한다.
- [ ] Termux 서버의 `~/projects/vscoke-api/.env`를 현재 API 환경 변수 목록 기준으로 정리한다.
- [x] Termux 서버에 self-hosted runner를 설치하고 `termux`, `vscoke-api` label을 부여한다.
- [ ] Cloudflare Tunnel이 API 도메인을 Termux API 포트로 라우팅하는지 확인한다.
- [ ] API 배포 후 `https://api.icecoke.kr/api-json`과 웹의 API 호출 경로를 smoke test한다.
- [ ] standalone `vscoke-api` 저장소는 monorepo 배포가 1회 이상 성공한 뒤 archive한다.
- [x] secret 없는 `apps/api/.env.example`과 `apps/web/.env.example`을 추가해 신규 환경 구성을 표준화한다.
- [x] API lint debt를 정리한 뒤 루트 `pnpm lint`에 API lint를 포함한다.
- [x] PM2 재부팅 복구 기준을 문서화한다.
- [x] PM2 실행 명령을 `ecosystem.config.cjs`로 옮길지 검토한다. 현재는 서버 `.env` 위치를 `~/projects/vscoke-api/.env`로 유지하기 위해 workflow 명령 기반 실행을 유지한다.
