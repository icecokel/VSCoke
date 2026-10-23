# Operations Runbook

이 문서는 VSCoke monorepo 운영 중 배포 실패나 런타임 장애가 발생했을 때 확인할 순서를 정리한다.

배포 구조, 환경 변수 위치와 정상 기대값은
[Deployment and Environment Plan](./deployment-and-env.md)을 기준으로 한다. 이 문서는 장애가
발생했을 때의 확인·복구 순서만 다룬다.

## 서버 접속

운영 API는 Mac mini의 Docker Compose에서 실행된다. Mac mini 터미널을 직접 쓰거나 Cloudflare Access SSH로
접속한다. 아래 명령은 모두 Mac mini에서 실행하며 배포 디렉터리는 `/Users/smlee/projects/vscoke-api`다.

```bash
cd /Users/smlee/projects/vscoke-api
```

## 빠른 상태 확인

웹:

```txt
Vercel Project -> Deployments -> latest production or preview deployment
```

API 공개 health:

```bash
API_HEALTH_URL=https://api.icecoke.kr/health pnpm smoke:api:remote
```

API 로컬 health on Mac mini:

```bash
cd /Users/smlee/projects/vscoke-api
PORT="$(sed -n 's/^PORT=//p' .env)"
PORT="${PORT:-3000}"
PORT="$PORT" node -e "fetch('http://127.0.0.1:' + process.env.PORT + '/health').then((res) => { console.log(res.status); if (!res.ok) process.exit(1); })"
```

운영 컨테이너와 호스트 서비스 기준:

```bash
cd /Users/smlee/projects/vscoke-api
docker compose ps
launchctl list | grep -E 'actions.runner.icecokel-VSCoke|codex'
brew services info cloudflared
```

기대값은 `vscoke-api-api-1`, `vscoke-api-postgres-1`이 `running (healthy)`, VSCoke runner와 Codex
app-server launchd 항목이 있고, cloudflared가 `started`다.

## 웹 배포 실패

확인 순서:

1. Vercel 설정을 [Web 배포 기준](./deployment-and-env.md#web-vercel)과 비교한다.
2. 실패한 deployment의 build log에서 최초 오류를 확인한다.
3. Production·Preview 환경 변수가 대상 환경에 등록됐는지 확인한다.
4. API 공개 health가 정상이면 웹 빌드를 로컬에서 재현한다.

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

API 배포의 trigger, runner와 release 단계는 `.github/workflows/deploy-api.yml`이 기준이다.

확인 순서:

1. GitHub Actions run 로그에서 실패 step을 확인한다.
2. self-hosted runner가 online이고 workflow 요구 label을 만족하는지 확인한다.
3. workflow의 사전 조건 검사 결과를 확인한다.
4. 실패가 이미지 build인지, import/index인지, 컨테이너 교체인지, health check인지 분류한다. 이미지 build 실패는 기존 컨테이너를 건드리지 않는다.

수동 재실행은 GitHub Actions의 `workflow_dispatch`를 사용한다.

## Mac mini runner offline

서비스 이름과 runner label은 [API 배포 기준](./deployment-and-env.md#api-mac-mini-docker)을 확인한다.
Mac mini에서 runner launchd 상태를 확인한다.

```bash
launchctl list | grep actions.runner.icecokel-VSCoke
cd ~/actions-runner-vscoke-api && ./svc.sh status
```

재시작:

```bash
cd ~/actions-runner-vscoke-api && ./svc.sh stop && ./svc.sh start
```

그래도 offline이면 GitHub repository settings의 self-hosted runner 상태와 Mac mini 네트워크·로그인 세션
상태를 같이 확인한다. runner는 사용자 launchd 에이전트이므로 해당 사용자가 로그인돼 있어야 한다.

## API 컨테이너 장애

Mac mini에서 확인:

```bash
cd /Users/smlee/projects/vscoke-api
docker compose ps
docker compose logs --tail 100 api
```

모든 HTTP 응답은 `X-Request-Id`를 포함한다. `docker compose logs api` 또는
`/Users/smlee/projects/vscoke-api/logs/combined-YYYY-MM-DD.log`에서 같은 ID를 찾아
요청의 method, route template, statusCode, durationMs를 확인한다. access log에는 query,
body, IP, 인증 정보, 이메일을 기록하지 않는다. 파일 로그는 일별·20MB 단위로 압축 회전하며
180일 동안 보관한다. 배포의 `rsync --delete`는 `logs`를 보존한다. 이는 파일 회전 정책이며
별도 백업·호스트 장애 복구를 보장하지 않는다. 이전 배포로 이미 유실된 로그는 이 설정으로
복원되지 않는다. `LOG_LEVEL` 미설정·빈값은 운영 info/개발 debug를 사용하고 잘못된 값은
시작을 실패시킨다. `pnpm test:tooling`에서 임시 릴리스로 보존 정책을 회귀 검증한다.

환경변수 변경은 Repository Secret `API_ENV_PRODUCTION`을 수정하고 API 배포 workflow를
수동 재실행한다. 서버 `.env`를 직접 편집하거나 재시작만으로 Secret 변경을 적용하지 않는다.

컨테이너가 반복 재시작하면 시작 로그의 첫 오류를 본다. `운영 환경변수가 필요합니다` 또는
`NODE_ENV=production, DB_SYNCHRONIZE=false가 필요합니다`는 mount된 `api.env`가 Secret 검증을 통과하지
못한 상태다. DB 연결 오류는 `postgres` 컨테이너의 health와 `api.env`의 `DB_HOST=postgres`를 확인한다.

컨테이너가 없으면 마지막 배포 이미지와 compose 파일로 다시 올린다.

```bash
cd /Users/smlee/projects/vscoke-api
docker image ls vscoke-api
docker compose up --detach --wait
docker compose ps
curl -fsS http://127.0.0.1:3000/health
```

OrbStack이 꺼져 있으면 `docker` 명령 자체가 실패한다. OrbStack 앱을 실행하면 `restart: unless-stopped`
컨테이너가 자동으로 복구된다. `orb config get app.start_at_login`이 `true`인지 확인한다.

## Codex app-server 장애

이력 질문·메인 채팅 답변이 timeout이나 공급자 오류로 실패하고 health는 정상이면 호스트 Codex app-server를
확인한다. API 컨테이너는 `ws://host.docker.internal:14561`로 접근한다.

```bash
launchctl list | grep codex
lsof -nP -iTCP:14561 -sTCP:LISTEN
```

listener가 없으면 launchd 항목을 다시 올린다. Codex 로그인 만료는 Mac mini에서 `codex login`으로 갱신한다.

## FE·BE 오류 추적

웹 오류 화면의 `오류 번호`는 `eventId`다. API 실패 응답의 `requestId`와
`X-Request-Id` 헤더는 API 요청 로그를 찾는 값이다. 브라우저·Next 서버 오류는
`POST /client-errors`를 통해 API의 일별 오류 로그에 `web.error`로 기록된다.
API 요청 종료는 `api.request`, API 예외는 `api.error`로 기록된다.
웹 API 클라이언트가 보낸 `X-Request-Id`는 세 이벤트의 `relatedRequestId`와
`requestId`를 연결한다.

```bash
cd /Users/smlee/projects/vscoke-api
TRACE_ID='사용자가 전달한 오류 번호 또는 API requestId'
grep -F "$TRACE_ID" logs/error-$(date +%F).log logs/combined-$(date +%F).log
```

오래된 압축 로그는 `zgrep -F 'ID' logs/error-*.gz logs/combined-*.gz`로 찾는다.
`web.error`의 `eventId`로 오류를 찾은 다음 `relatedRequestId`가 있으면 같은 ID의
`api.error`와 `api.request`를 확인한다. API 요청이 실패했는데 `api.error`가 없다면
네트워크·Cloudflare 응답일 수 있다. 이때 `web.error`의 상태 코드와 시각을
Cloudflare 및 Vercel 로그와 비교한다. Next 서버에서 API로 오류를 전달하지 못하면
Vercel Runtime Logs에 `Web error report could not reach the API`가 남는다.

브라우저 오류 보고는 허용 origin만 받고, endpoint 전체는 IP당 시간당 60건으로 제한한다. 본문에는
요청 body, query, 인증 토큰을 보내지 않는다. 운영 점검에서는 실제 사용자 오류 대신
고유한 테스트 `eventId`로 정상적인 보고를 한 건 전송하고 파일에 기록됐는지 확인한다.

## Cloudflare Tunnel 장애

증상:

- Mac mini 내부 `http://127.0.0.1:$PORT/health`는 성공한다.
- 외부 `https://api.icecoke.kr/health`는 실패한다.

이 경우 API 컨테이너보다 Cloudflare Tunnel, DNS, ingress 설정을 먼저 본다.

확인 순서:

1. `brew services info cloudflared`로 호스트 cloudflared가 실행 중인지 확인한다.
2. ingress가 `http://localhost:$PORT`로 연결되어 있는지 확인한다.
3. `api.icecoke.kr` DNS가 Mac mini tunnel로 연결되어 있는지 확인한다. 이전 Ubuntu tunnel route가 남아 있으면 제거한다.
4. Secret의 `PORT`와 tunnel target port가 같은지 확인한다. compose는 `.env`에 생성된 `PORT`를 `127.0.0.1`에 publish한다.

## DB 접속 장애

API 운영 환경에서는 PostgreSQL이 같은 compose 네트워크의 컨테이너다.

```txt
api container -> DB_HOST=postgres -> postgres container (pgvector/pgvector:pg16)
```

확인 순서:

1. `docker compose ps`에서 `vscoke-api-postgres-1`이 `healthy`인지 확인한다.
2. `api.env`의 `DB_HOST=postgres`, `DB_PORT=5432`인지 확인한다. 호스트 포트는 publish하지 않는다.
3. `postgres.env`가 `api.env`의 `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`와 같은지 확인한다. 둘 다 배포 workflow가 같은 Secret에서 생성한다.
4. DB 자격 증명을 바꾼 뒤에는 postgres 컨테이너 안에서 `ALTER ROLE`로 실제 비밀번호를 바꿔야 한다. `postgres.env`는 최초 초기화에만 적용된다.

운영 DB 확인:

```bash
cd /Users/smlee/projects/vscoke-api
docker compose exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c 'select count(*) from migrations'
```

## DB migration 실패

API 배포 workflow는 migration을 자동 실행하지 않는다. 운영 migration은 backup을 확인한 maintenance window에서만 수동 실행한다.

legacy core baseline이 `Legacy core schema is partial` 또는 `Legacy core schema mismatch`로 실패하면 migration이 기존 객체를 drop, alter, repair하지 않은 상태다. 다음 순서로 대응한다.

1. 재실행 전에 `public.user`, `public.game_history`, `public.game_history_gametype_enum` schema와 TypeORM `migrations` ledger를 덤프한다.
2. 세 객체의 존재 상태와 baseline/후속 migration 기록 상태를 함께 비교한다.
3. schema 차이를 확인하지 않은 채 ledger row를 수동 삽입하거나 객체를 수정하지 않는다.
4. 원인이 확인되기 전에는 API 재배포에 migration 자동 실행 단계를 추가하지 않는다.
5. 복구가 필요하면 사전 backup으로 되돌린 뒤 별도 검증 DB에서 같은 migration 순서를 재현한다.

baseline `down`은 destructive rollback 방지를 위해 의도적으로 실패한다. rollback이 필요하다는 이유로 운영의 `user`, `game_history`, enum을 삭제해서는 안 된다.

## 환경 변수 변경

정상 변경 절차는 [API 배포 가이드](../apps/api/DEPLOY.md#2-환경-변수-배포-github-secret)를 따른다.
장애 대응 중에도 비밀값을 GitHub issue, PR, commit, 문서와 로그에 원문으로 남기지 않는다.

## 배포 후 검증

API 배포 후:

```bash
pnpm smoke:api:remote
```

프론트 배포 후:

1. Vercel deployment 상태가 `Ready`인지 확인한다.
2. 주요 페이지가 로드되는지 확인한다.
3. 로그인, 게임 점수 제출, Wordle, 이력 질문처럼 API를 호출하는 화면을 확인한다.
4. 브라우저 네트워크 탭에서 API URL이 `NEXT_PUBLIC_API_URL`과 일치하는지 확인한다.

API 계약 변경을 포함한 배포라면 로컬 또는 PR 검증에서 `pnpm check:api-contract`가 통과했는지도 같이 확인한다.

## 관련 문서

- [Monorepo Concept](./vscoke-monorepo-concept.md)
- [Deployment and Environment Plan](./deployment-and-env.md)
- [Local Development](./local-development.md)
