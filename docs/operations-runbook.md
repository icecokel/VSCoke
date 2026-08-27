# Operations Runbook

이 문서는 VSCoke monorepo 운영 중 배포 실패나 런타임 장애가 발생했을 때 확인할 순서를 정리한다.

배포 구조, 환경 변수 위치와 정상 기대값은
[Deployment and Environment Plan](./deployment-and-env.md)을 기준으로 한다. 이 문서는 장애가
발생했을 때의 확인·복구 순서만 다룬다.

## 서버 접속

운영 Ubuntu host 접속은 SSH alias만 사용한다.

```bash
ssh icenux-external
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

API 로컬 health on Ubuntu host:

```bash
ssh icenux-external
cd /home/icenux/projects/vscoke-api
PORT="$(sed -n 's/^PORT=//p' .env | tail -1)"
PORT="${PORT:-3000}"
PORT="$PORT" node -e "fetch('http://127.0.0.1:' + process.env.PORT + '/health').then((res) => { console.log(res.status); if (!res.ok) process.exit(1); })"
```

운영 API 프로세스 기준:

```bash
ssh icenux-external
pm2 list
systemctl is-active actions.runner.icecokel-VSCoke.icenux-vscoke-api-host.service
systemctl is-active cloudflared-icenux.service
systemctl is-active vscoke-api-native.service || true
```

기대값은 `vscoke-api`와 `vscoke-poke-lounge-turn-worker`가 PM2 `online`, API runner와 `cloudflared-icenux.service`가 `active`, `vscoke-api-native.service`가 `inactive`이다.

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
4. 실패가 build인지, staging install인지, PM2 restart인지, health check인지 분류한다.

수동 재실행은 GitHub Actions의 `workflow_dispatch`를 사용한다.

## Ubuntu host runner offline

서비스 이름과 runner label은 [API 배포 기준](./deployment-and-env.md#api-ubuntu-host)을 확인한다.
Ubuntu host에서 현재 서비스 상태를 확인한다.

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
pm2 logs vscoke-poke-lounge-turn-worker --lines 100
```

모든 HTTP 응답은 `X-Request-Id`를 포함한다. `pm2 logs` 또는
`/home/icenux/projects/vscoke-api/logs/combined-YYYY-MM-DD.log`에서 같은 ID를 찾아
요청의 method, route template, statusCode, durationMs를 확인한다. access log에는 query,
body, IP, 인증 정보, 이메일을 기록하지 않는다. 파일 로그는 일별·20MB 단위로 압축 회전하며
180일 동안 보관한다.

환경 변수 변경 후 재시작:

```bash
cd /home/icenux/projects/vscoke-api
pm2 restart vscoke-api --update-env
pm2 restart vscoke-poke-lounge-turn-worker --update-env
pm2 save
```

프로세스가 없으면 마지막 배포 산출물이 있는지 확인한다.

```bash
cd /home/icenux/projects/vscoke-api
test -f apps/api/dist/src/main.js
test -f apps/api/dist/src/poke-lounge-turn-worker.js
sudo systemctl disable --now vscoke-api-native.service || true
pm2 start apps/api/dist/src/main.js --name vscoke-api --update-env
pm2 start apps/api/dist/src/poke-lounge-turn-worker.js --name vscoke-poke-lounge-turn-worker --update-env
pm2 save
```

`/health`가 404이고 `/`만 `Hello World!`로 응답하면 이전 `/opt/icenux/vscoke-api` 기반 `vscoke-api-native.service`가 3000 포트를 점유했을 가능성이 높다. 이 경우 아래처럼 이전 서비스를 끄고 현재 PM2 API를 다시 올린다.

```bash
sudo systemctl disable --now vscoke-api-native.service
cd /home/icenux/projects/vscoke-api
set -a
. ./.env
set +a
pm2 delete vscoke-api || true
pm2 start apps/api/dist/src/main.js --name vscoke-api --update-env
pm2 save
curl -fsS http://127.0.0.1:3000/health
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

## DB migration 실패

API 배포 workflow는 migration을 자동 실행하지 않는다. 운영 migration은 backup을 확인한 maintenance window에서만 수동 실행한다.

legacy core baseline이 `Legacy core schema is partial` 또는 `Legacy core schema mismatch`로 실패하면 migration이 기존 객체를 drop, alter, repair하지 않은 상태다. 다음 순서로 대응한다.

1. 재실행 전에 `public.user`, `public.game_history`, `public.game_history_gametype_enum` schema와 TypeORM `migrations` ledger를 덤프한다.
2. 세 객체의 존재 상태와 baseline/후속 migration 기록 상태를 함께 비교한다.
3. schema 차이를 확인하지 않은 채 ledger row를 수동 삽입하거나 객체를 수정하지 않는다.
4. 원인이 확인되기 전에는 API 재배포에 migration 자동 실행 단계를 추가하지 않는다.
5. 복구가 필요하면 사전 backup으로 되돌린 뒤 별도 검증 DB에서 같은 migration 순서를 재현한다.

baseline `down`은 destructive rollback 방지를 위해 의도적으로 실패한다. rollback이 필요하다는 이유로 운영의 `user`, `game_history`, enum을 삭제해서는 안 된다.

### 게임 결과 신뢰도 migration rollback

`AddGameResultTrust1794355200000`은 `game_history`에 `resultTrust` 또는 `sourceKey`가 하나라도 남아 있으면 `down`을 의도적으로 실패시킨다. 기존 Poke Lounge 행은 `up`에서 `client-asserted`로 backfill되므로, 데이터가 있는 운영 DB에서 일반적인 migration revert는 허용되지 않는다. 이 동작은 신뢰도와 서버 결과의 멱등성 키를 조용히 삭제하는 rollback을 막는다.

상태 확인:

```sql
SELECT "gameType", "resultTrust", count(*)
FROM game_history
GROUP BY "gameType", "resultTrust"
ORDER BY "gameType", "resultTrust";

SELECT count(*) AS server_verified_rows
FROM game_history
WHERE "sourceKey" IS NOT NULL;
```

rollback이 필요하면 먼저 전체 DB backup을 만들고, `resultTrust`와 `sourceKey`를 보존할 별도 migration을 설계한다. 운영 데이터에서 두 열을 `NULL`로 일괄 변경하거나 writer가 만든 행을 삭제해서 기존 `down`을 통과시키면 안 된다. 빈 신규 환경에서 두 열 모두 데이터가 없을 때만 `down`이 index, constraint, column 순서로 제거를 진행한다.

## Poke Lounge room/경쟁 장애

room, 경쟁전, mutation/action receipt와 로그인 진행 상태는 Redis TTL 데이터다. 경쟁 턴의 30초 제한은 같은 Redis의 BullMQ 지연 작업을 `vscoke-poke-lounge-turn-worker`가 처리한다. API 재시작 후 room이
사라지거나 같은 idempotency key가 새 command처럼 처리되면 메모리나 PostgreSQL에서 복구하지
말고 `REDIS_URL`, Redis 재시작·eviction·TTL과 `poke-lounge:rooms` index를 먼저 확인한다.

Web은 REST GET으로 room을 초기화하고 Socket.IO `/poke-lounge`의 committed `room.snapshot`을 적용한다. Socket 연결이 끊기거나 `room.revision-conflict`가 오면 `GET /poke-lounge/rooms/:roomCode?afterRevision=<lastRevision>`으로 복구한다. 지속적인 750 ms polling을 정상 상태로 되살리지 않는다. mutation 재시도는 동일 payload, 동일 `X-Idempotency-Key`, 마지막 committed `If-Match-Revision` 조합만 사용한다.

실시간 위치와 Socket.IO 인스턴스 간 fan-out도 같은 Redis를 사용한다. 위치가 일부 브라우저에서만
멈추거나 API가 시작되지 않으면 먼저 Redis 연결을 확인한다.

```bash
ssh icenux-external
cd /home/icenux/projects/vscoke-api
set -a
. ./.env
set +a
pnpm --filter @vscoke/api exec node -e "const {createClient}=require('redis');(async()=>{const client=createClient({url:process.env.REDIS_URL});try{await client.connect();console.log(await client.ping())}finally{if(client.isOpen)await client.close()}})().catch(error=>{console.error(error.message);process.exit(1)})"
```

기대값은 `PONG`이다. Redis 장애 중에는 인스턴스별 메모리 fallback을 켜지 않는다. Redis를
복구한 뒤 API와 턴 워커를 재시작하면 Web이 재구독하면서
`room.world-snapshot`과 REST room snapshot을 다시 받는다. Redis key를 수동으로 점수나 우승 상태로
보정하지 않는다. TTL 만료나 eviction으로 room document가 사라졌다면 해당 게임은 종료하고 새
방에서 시작한다. Poke Lounge 결과를 `POST /game/result` 또는 PostgreSQL 직접 삽입으로 보정하지
않는다.

## 환경 변수 변경

정상 변경 절차는 [API 배포 가이드](../apps/api/DEPLOY.md#2-환경-변수-배포-수동)를 따른다.
장애 대응 중에도 비밀값을 GitHub issue, PR, commit, 문서와 로그에 원문으로 남기지 않는다.

## 배포 후 검증

API 배포 후:

```bash
pnpm smoke:api:remote
```

프론트 배포 후:

1. Vercel deployment 상태가 `Ready`인지 확인한다.
2. 주요 페이지가 로드되는지 확인한다.
3. 로그인, 게임 점수 제출, Wordle, Poke Lounge GET hydration/Redis 자동 저장/room 복구, 이력 질문처럼 API를 호출하는 화면을 확인한다.
4. 브라우저 네트워크 탭에서 API URL이 `NEXT_PUBLIC_API_URL`과 일치하는지 확인한다.

API 계약 변경을 포함한 배포라면 로컬 또는 PR 검증에서 `pnpm check:api-contract`가 통과했는지도 같이 확인한다.

Poke Lounge 기술 검증이나 배포가 통과해도 공개 route/asset의 권리가 승인된 것은 아니다. [Poke Lounge Release Gate](./poke-lounge-release-gate.md)는 owner/legal review와 provenance 승인 전까지 `UNRESOLVED`다. 기본 배포는 경고 상태로 진행하며, 엄격한 환경은 `POKE_LOUNGE_PROVENANCE_STRICT=1`로 차단한다.

## 관련 문서

- [Monorepo Concept](./vscoke-monorepo-concept.md)
- [Deployment and Environment Plan](./deployment-and-env.md)
- [Local Development](./local-development.md)
- [Poke Lounge Release Gate](./poke-lounge-release-gate.md)
