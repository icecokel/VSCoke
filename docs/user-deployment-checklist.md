# User Deployment Checklist

이 문서는 monorepo 전환 후 사용자가 직접 처리해야 하는 작업만 정리한다. 로컬 코드 수정, 문서화, 테스트, PR 업데이트는 Codex가 처리한다.

## 1. Vercel Web Project

Vercel에서 `VSCoke` 웹 프로젝트 설정을 변경한다.

- [x] Root Directory를 `apps/web`으로 설정한다.
- [x] Framework Preset이 `Next.js`인지 확인한다.
- [x] Build Command가 `pnpm build`인지 확인한다.
- [x] Node.js Version을 `22.x`로 설정한다.
- [ ] Install Command는 기본값을 우선 사용한다. 실패할 때만 `pnpm install --frozen-lockfile`로 override한다.
- [x] 환경 변수를 Production에 등록한다.
  - [x] `NEXT_PUBLIC_API_URL=https://api.icecoke.kr`
  - [x] `AUTH_GOOGLE_ID`
  - [x] `AUTH_GOOGLE_SECRET`
  - [x] `AUTH_SECRET`
- [x] Preview 환경에서도 API 호출이나 Google Auth가 필요하면 같은 env를 등록한다.
- [x] env 변경 후 새 Vercel deployment를 생성한다. 기존 deployment에는 env 변경이 소급되지 않는다.

검증:

- [x] PR #16의 Vercel check가 성공으로 바뀌는지 확인한다.
- [x] Vercel 빌드 로그에서 repo root가 아니라 `apps/web` 기준으로 빌드되는지 확인한다.
- [x] Vercel 빌드 로그에서 API 빌드가 실행되지 않는지 확인한다.
- [x] production URL 접속을 확인한다.
- [ ] Google 로그인 진입이 깨지지 않는지 확인한다.
- [ ] 웹에서 API 호출이 `https://api.icecoke.kr`로 나가는지 확인한다.

## 2. GitHub Actions Self-hosted Runner

Ubuntu host에 monorepo 저장소 `icecokel/VSCoke`용 GitHub Actions self-hosted runner를 설치한다.

- [x] GitHub runner 등록 토큰을 발급한다.
- [x] Ubuntu host에 runner를 설치한다.
- [x] runner label에 `vscoke-api`, `host`를 추가한다.
- [x] runner를 systemd로 상시 실행되게 구성한다.
- [x] runner job에서 Ubuntu host `node`, `corepack`, `pm2` 명령을 사용하도록 workflow를 구성한다.
- [x] repository variable `API_HEALTH_URL`은 기본값 `https://api.icecoke.kr/health`를 사용한다.
- [x] repository variable `API_DEPLOY_DIR`은 기본값 `/home/icenux/projects/vscoke-api`를 사용한다.

검증:

- [x] `Deploy API to Ubuntu Host (Self-hosted Runner)` workflow가 runner를 인식하는지 확인한다.
- [x] workflow의 `Verify self-hosted runner prerequisites` 단계가 통과하는지 확인한다.
- [x] workflow의 host PM2 배포 단계가 통과하는지 확인한다.

## 3. Ubuntu API Server

Ubuntu host의 운영 디렉터리를 확인한다.

- [x] `/home/icenux/projects/vscoke-api` 디렉터리가 존재하는지 확인한다.
- [x] `/home/icenux/projects/vscoke-api/.env`를 생성하거나 갱신한다.
- [x] 운영 `.env`에 최소 필수 값을 넣는다.
  - [x] `NODE_ENV=production`
  - [x] `PORT`
  - [x] `GOOGLE_CLIENT_ID`
  - [x] `DB_HOST`
  - [x] `DB_PORT`
  - [x] `DB_USERNAME`
  - [x] `DB_PASSWORD`
  - [x] `DB_DATABASE`
  - [x] `DB_SYNCHRONIZE=false`
  - [x] `CORS_ORIGINS`
- [x] 운영 `.env`에 개발 인증 우회 값을 넣지 않는다.
  - [x] `ENABLE_DEV_AUTH_BYPASS`
  - [x] `DEV_AUTH_TOKEN`
- [ ] 운영 에러 알림을 사용할지 결정한다.
  - [ ] 사용할 경우 `NOTIFY_SERVICE_URL`, `NOTIFY_SERVICE_USER`, `NOTIFY_SERVICE_PASSWORD`를 설정한다.
  - [ ] 사용하지 않을 경우 현재 localhost fallback 동작을 허용할지 별도 이슈에서 결정한다.

검증:

- [x] `pm2 status`에서 `vscoke-api` 상태를 확인한다.
- [x] workflow 배포 성공 후 `pm2 status`에서 `vscoke-api` 상태를 확인한다.
- [x] 재부팅 복구가 필요하면 PM2 systemd startup에서 `pm2 resurrect`가 실행되도록 설정한다.
- [x] 이전 `vscoke-api-native.service`가 `disabled/inactive`인지 확인한다.
- [x] `https://api.icecoke.kr/health` 응답을 확인한다.
- [x] 로컬에서 공개 API smoke test를 실행한다.
  ```bash
  pnpm smoke:api:remote
  ```

## 4. Cloudflare Tunnel

API 도메인과 Ubuntu host API 포트 연결을 확인한다.

- [x] `api.icecoke.kr`가 Ubuntu host의 API 포트로 라우팅되는지 확인한다.
- [x] Tunnel이 기기 재부팅 후에도 복구되는지 확인한다.
- [x] GitHub Actions 배포가 SSH/Cloudflare Access SSH 정책에 의존하지 않는지 확인한다.

검증:

- [x] 외부 네트워크에서 `https://api.icecoke.kr/health`에 접근한다.
- [ ] Vercel web production에서 API 호출이 CORS 오류 없이 성공하는지 확인한다.

## 5. Existing API Repository

monorepo API 배포가 한 번 이상 성공한 뒤 기존 `vscoke-api` 저장소를 archive한다.

- [x] monorepo의 `apps/api`가 production 배포에 성공했는지 확인한다.
- [ ] 기존 `vscoke-api` 저장소 README 또는 description에 새 위치를 안내한다.
- [ ] 기존 `vscoke-api` 저장소를 archive한다.

검증:

- [ ] 기존 저장소가 read-only 상태로 남아 과거 파일 history 조회가 가능한지 확인한다.
- [ ] 앞으로 API 변경은 `icecokel/VSCoke`의 `apps/api`에서만 진행한다.

## 6. Merge Decision

PR #16은 Vercel Root Directory가 아직 repo root로 잡혀 있으면 Vercel check가 실패할 수 있다.

- [x] Vercel check가 성공하면 PR #16을 merge한다.
- [x] Vercel 설정을 먼저 바꾸기 어렵다면, 실패 원인이 Root Directory 설정임을 확인한 뒤 의도적으로 merge할지 결정한다.
- [x] merge 후 `main`에서 web/API 배포가 각각 기대한 경로로 실행되는지 확인한다.
