# Deployment and Environment Plan

VSCoke monorepo의 배포와 환경 변수 관리는 앱별로 분리한다.

```txt
apps/web -> Vercel
apps/api -> OCI Linux ARM64 runner -> native release -> systemd -> Cloudflare Tunnel
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

### API: OCI 네이티브 systemd

2026-11-14 기준 코드의 배포 대상은 춘천 OCI 1호기다. **공개 운영 트래픽·원본 DB는 아직 Mac mini에
있고 OCI DB는 리허설 사본**이다. 코드 변경이 데이터·DNS 전환을 수행하지 않는다.

| 항목          | 기준                                                               |
| ------------- | ------------------------------------------------------------------ |
| 호스트        | `oci-01` (`ubuntu@140.245.73.237`), Ubuntu 24.04 ARM64             |
| runner labels | `self-hosted`, `Linux`, `ARM64`, `vscoke-api`, `oci-01`            |
| 앱 루트       | `/home/ubuntu/vscoke-api`                                          |
| 실행 경로     | `current` -> `releases/<sha>-<run-id>-<attempt>`                   |
| 서비스        | `vscoke-api.service`, 사용자 `ubuntu`                              |
| Node          | `.nvmrc` 버전, 각 릴리스의 `bin/node`                              |
| PostgreSQL    | `postgresql@16-main.service`, 16.15 + pgvector 0.8.7               |
| 바인딩        | API `127.0.0.1:3000`, DB `127.0.0.1:5432`                          |
| 영속 경로     | `api.env`, `.local/db.env`, `.cache/embeddings`, `logs`, `backups` |

워크플로는 전용 OCI 러너에서 API lint·단위 테스트, 배포 계약 테스트, 빌드, 독립 의존성
패키징과 배포를 수행한다. Mac·Docker·SSH 빌드에 의존하지 않는다. UI 메시지 변경의 배포 생략과
성공 커밋 기준 누적 변경 검사는 기존대로 유지한다.

배포는 write-native → 미적용 migration 차단 → 공개 이력 import → 필요한 vector index →
current 원자 교체 → systemd 재시작 → 로컬 health/이력/취미 endpoint 순서다. 운영 migration은
자동 실행하지 않는다. 실패 시 이전 코드·env를 복구하며 공유 경로·이전 릴리스는 삭제하지 않는다.
import/index의 DB 쓰기는 코드 복구로 되돌리지 않는다. breaking 변경은 expand/contract로 나눈다.
SIGKILL·호스트 장애는 trap으로 복구할 수 없으므로 수동 복구 기록을 사용한다.

터널 전환 전에는 수동 `verify_public=false`, repository variable `API_VERIFY_PUBLIC=false` 또는
미설정으로 둔다. 공개 도메인의 성공 응답은 Mac일 수 있어 OCI 배포 증거가 아니다. 전환 후
`API_VERIFY_PUBLIC=true`를 설정하고 수동 실행도 `verify_public=true`로 검증한다.

정확한 러너·권한 설치, 배포·복구·최종 전환 절차는 [API 배포 가이드](../apps/api/DEPLOY.md)를 따른다.

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

로컬은 `apps/api/.env.example`을 복사한다. 앱 비밀값의 운영 원본은 Repository Secret
`API_ENV_PRODUCTION`이다. write-native가 OCI `.local/db.env`의 DB 자격 증명, loopback 바인딩,
포트 3000, `TRUST_PROXY=loopback`, 호스트 임베딩 캐시와 offline 모드만 덮어쓴다. 인증·Claude·CORS
등은 보존한다. 결과 `api.env`는 600 권한으로 원자 교체하고 릴리스 `.env`가 이를 가리킨다.
OCI DB 비밀번호를 GitHub Secret에 복제하지 않는다. dotenv를 shell로 source하지 않는다.

| 이름                      | 필수                  | 기본값                                 | 설명                                                                                       |
| ------------------------- | --------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------ |
| `NODE_ENV`                | 권장                  | `development`                          | 운영에서는 `production`                                                                    |
| `PORT`                    | 권장                  | `3000`                                 | API 리슨 포트. OCI 운영에서는 3000                                                         |
| `TRUST_PROXY`             | 운영 native 주입      | `loopback`                             | Express trust proxy. OCI에서는 `loopback`                                                  |
| `LOG_LEVEL`               | 선택                  | `development=debug`, `production=info` | Winston 콘솔·일별 파일 로그 최소 레벨 (`error`, `warn`, `info`, `debug` 등)                |
| `CORS_ORIGINS`            | 권장                  | 기본 허용 origin + 추가 없음           | 쉼표로 구분한 추가 허용 origin                                                             |
| `GOOGLE_CLIENT_ID`        | 필수                  | 없음                                   | Google OAuth 토큰 검증                                                                     |
| `DB_HOST`                 | 필수                  | `localhost`                            | PostgreSQL host. OCI 운영은 `127.0.0.1`                                                    |
| `DB_PORT`                 | 필수                  | `5432`                                 | PostgreSQL port. OCI 운영은 `5432`                                                         |
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
[API 배포 가이드](../apps/api/DEPLOY.md#4-db-schema-변경)를 따른다.

Secret 수정과 재배포 절차는 [API 배포 가이드](../apps/api/DEPLOY.md#2-환경-변수-배포-github-secret)를
따른다.

### GitHub Actions Runner and Variables

runner 이름은 `vscoke-api-oci-01`, 설치 경로는 `/home/ubuntu/actions-runner-vscoke-api`다.
Discord의 `discord-bot-oci`와 설치·work 디렉터리·서비스를 분리한다. 관리자 권한은
`/usr/bin/systemctl restart vscoke-api.service` 한 명령만 비대화식으로 허용한다.

| 변수                   | 기준                                                                      |
| ---------------------- | ------------------------------------------------------------------------- |
| `API_DEPLOY_DIR`       | `/home/ubuntu/vscoke-api` 또는 미설정. 기존 Mac 경로 override를 제거한다. |
| `API_LOCAL_HEALTH_URL` | `http://127.0.0.1:3000/health`                                            |
| `API_HEALTH_URL`       | `https://api.icecoke.kr/health`                                           |
| `API_VERIFY_PUBLIC`    | 전환 전 `false`, 최종 데이터·터널 전환 후 `true`                          |

Repository Secret은 기존 `API_ENV_PRODUCTION`을 사용한다. 외부 PR 코드는 운영 러너에서 실행하지 않는다.
