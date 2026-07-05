# Operations Runbook

이 문서는 VSCoke monorepo 운영 중 배포 실패나 런타임 장애가 발생했을 때 확인할 순서를 정리한다.

## 운영 구조

```txt
GitHub repository
├─ apps/web -> Vercel
└─ apps/api -> GitHub Actions self-hosted runner on Ubuntu host -> PM2 -> Cloudflare Tunnel
```

웹과 API는 같은 저장소를 쓰지만 배포 주체가 다르다. 웹 장애는 Vercel을 먼저 보고, API 장애는 GitHub Actions, Ubuntu host runner, PM2, Cloudflare Tunnel을 순서대로 본다.

## 빠른 상태 확인

웹:

```txt
Vercel Project -> Deployments -> latest production or preview deployment
```

API 공개 health:

```bash
API_HEALTH_URL=https://api.icecoke.kr/health pnpm smoke:api:remote
```

API 로컬 health on Ubuntu host:

```bash
ssh icenux-external
cd /home/icenux/projects/vscoke-api
PORT="$(sed -n 's/^PORT=//p' .env | tail -1)"
PORT="${PORT:-3000}"
PORT="$PORT" node -e "fetch('http://127.0.0.1:' + process.env.PORT + '/health').then((res) => { console.log(res.status); if (!res.ok) process.exit(1); })"
```

## 웹 배포 실패

확인 순서:

1. Vercel Project의 Root Directory가 `apps/web`인지 확인한다.
2. Build Command가 `pnpm build`인지 확인한다.
3. Node.js Version이 `22.x`인지 확인한다.
4. Vercel 환경 변수에 `NEXT_PUBLIC_API_URL`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_SECRET`이 있는지 확인한다.
5. `NEXT_PUBLIC_API_URL`이 현재 API 공개 주소를 바라보는지 확인한다.

로컬에서 재현:

```bash
pnpm install
pnpm build:web
```

API 없이 웹 빌드만 확인:

```bash
NEXT_PUBLIC_API_URL=http://127.0.0.1:65535 pnpm build:web
```

환경 변수를 바꾼 뒤에는 Vercel에서 새 deployment를 생성해야 한다.

## API GitHub Actions 실패

API 배포 workflow:

```txt
.github/workflows/deploy-api.yml
```

트리거 조건:

```txt
main push with apps/api/**, root package files, or deploy-api workflow changes
workflow_dispatch
```

확인 순서:

1. GitHub Actions run 로그에서 실패 step을 확인한다.
2. self-hosted runner가 online인지 확인한다.
3. runner labels에 `self-hosted`, `vscoke-api`, `host`가 있는지 확인한다.
4. Ubuntu host runtime에 `node`, `corepack`, `pm2`가 있는지 확인한다.
5. `/home/icenux/projects/vscoke-api/.env`가 존재하는지 확인한다.
6. 실패가 build인지, staging install인지, PM2 restart인지, health check인지 분류한다.

수동 재실행은 GitHub Actions의 `workflow_dispatch`를 사용한다.

## Ubuntu host runner offline

현재 runner 운영 값:

| 항목            | 값                                                              |
| --------------- | --------------------------------------------------------------- |
| systemd service | `actions.runner.icecokel-VSCoke.icenux-vscoke-api-host.service` |
| Runner name     | `icenux-vscoke-api-host`                                        |
| Required label  | `vscoke-api`, `host`                                            |

Ubuntu host에서 확인:

```bash
ssh icenux-external
systemctl status actions.runner.icecokel-VSCoke.icenux-vscoke-api-host.service --no-pager
```

재시작:

```bash
sudo systemctl restart actions.runner.icecokel-VSCoke.icenux-vscoke-api-host.service
```

그래도 offline이면 GitHub repository settings의 self-hosted runner 상태와 Ubuntu host 네트워크 상태를 같이 확인한다.

## API PM2 장애

Ubuntu host에서 확인:

```bash
ssh icenux-external
pm2 list
pm2 logs vscoke-api --lines 100
```

환경 변수 변경 후 재시작:

```bash
cd /home/icenux/projects/vscoke-api
pm2 restart vscoke-api --update-env
pm2 save
```

프로세스가 없으면 마지막 배포 산출물이 있는지 확인한다.

```bash
cd /home/icenux/projects/vscoke-api
test -f apps/api/dist/src/main.js
pm2 start apps/api/dist/src/main.js --name vscoke-api --update-env
pm2 save
```

## Cloudflare Tunnel 장애

증상:

- Ubuntu host 내부 `http://127.0.0.1:$PORT/health`는 성공한다.
- 외부 `https://api.icecoke.kr/health`는 실패한다.

이 경우 API 프로세스보다 Cloudflare Tunnel, DNS, ingress 설정을 먼저 본다.

확인 순서:

1. Cloudflare Tunnel 프로세스가 실행 중인지 확인한다.
2. ingress가 Ubuntu host API port로 연결되어 있는지 확인한다.
3. `api.icecoke.kr` DNS가 현재 tunnel로 연결되어 있는지 확인한다.
4. API `.env`의 `PORT`와 tunnel target port가 같은지 확인한다.

## DB 접속 장애

API 운영 환경에서는 PostgreSQL이 Ubuntu host local 기준으로 연결된다.

```txt
apps/api on Ubuntu host -> DB_HOST=127.0.0.1 -> PostgreSQL
```

Mac 로컬에서는 Cloudflare Access TCP tunnel을 사용한다.

```bash
pnpm --filter @vscoke/api db:tunnel
```

확인 순서:

1. `apps/api/.env`의 `CLOUDFLARE_DB_HOST`가 있는지 확인한다.
2. `DB_PORT`가 실제 tunnel local port와 같은지 확인한다.
3. tunnel 터미널이 계속 실행 중인지 확인한다.
4. API 실행 터미널과 tunnel 실행 터미널을 분리한다.

## 환경 변수 변경

웹 환경 변수:

```txt
Vercel Project Settings -> Environment Variables
```

웹 환경 변수 변경 후에는 새 Vercel deployment가 필요하다.

API 운영 환경 변수:

```txt
/home/icenux/projects/vscoke-api/.env
```

API 환경 변수 변경 후에는 PM2 재시작이 필요하다.

```bash
cd /home/icenux/projects/vscoke-api
pm2 restart vscoke-api --update-env
pm2 save
```

비밀값은 GitHub issue, PR, commit, 문서에 원문으로 남기지 않는다.

## 배포 후 검증

API 배포 후:

```bash
pnpm smoke:api:remote
```

프론트 배포 후:

1. Vercel deployment 상태가 `Ready`인지 확인한다.
2. 주요 페이지가 로드되는지 확인한다.
3. 로그인, 게임 점수 제출, Wordle처럼 API를 호출하는 화면을 확인한다.
4. 브라우저 네트워크 탭에서 API URL이 `NEXT_PUBLIC_API_URL`과 일치하는지 확인한다.

## 관련 문서

- [Monorepo Concept](./vscoke-monorepo-concept.md)
- [Deployment and Environment Plan](./deployment-and-env.md)
- [Local Development](./local-development.md)
