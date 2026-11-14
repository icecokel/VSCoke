# Operations Runbook

이 문서는 VSCoke monorepo 운영 중 배포 실패나 런타임 장애가 발생했을 때 확인할 순서를 정리한다.

배포 구조, 환경 변수 위치와 정상 기대값은
[Deployment and Environment Plan](./deployment-and-env.md)을 기준으로 한다. 이 문서는 장애가
발생했을 때의 확인·복구 순서만 다룬다.

## 서버 접속과 빠른 상태 확인

공개 운영 API·DB·터널은 OCI 1호기에서 실행한다. Mac API는 중지 상태이며 보존한 DB를
최신 운영 DB로 간주하지 않는다. 인프라·권한 기준은 [API 배포 가이드](../apps/api/DEPLOY.md)를 따른다.

```bash
ssh -F /Users/smlee/icecoke-ops/config/ssh-config oci-01
cd /home/ubuntu/vscoke-api
systemctl is-active vscoke-api.service postgresql@16-main.service
systemctl is-active cloudflared-vscoke-api.service
systemctl is-enabled vscoke-api.service
readlink -f current
curl -fsS http://127.0.0.1:3000/health
```

웹은 Vercel Deployments의 Ready 상태를 확인한다. 공개 API 검사는 checkout에서
`pnpm smoke:api:remote`로 실행한다. 내부·공개 health의 timestamp/uptime으로 같은 OCI 프로세스인지
대조한다. Mac으로 되돌리려면 OCI의 새 쓰기를 중단하고 최신 데이터를 먼저 역동기화한다.

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
4. 실패가 lint/test/build인지, migration 누락인지, import/index인지, systemd 교체/health인지 확인한다. build 실패는 기존 서비스를 건드리지 않는다.

수동 재실행은 GitHub Actions의 `workflow_dispatch`를 사용한다.

### 메시지 변경의 API 배포 범위

push 배포는 `scripts/api-deploy-scope.mjs`가 `github.event.before`와 현재 커밋의 차이를 확인하고,
배포 디렉터리의 `.last-successful-deploy`에 기록된 마지막 성공 배포 커밋과 현재 커밋의 누적
차이도 확인한다. 어느 비교에서든 API 배포 대상 변경이 있으면 배포한다. push 이전 커밋이
없거나 0인 SHA이거나 조회할 수 없으면 성공 배포 기록과 무관하게 안전하게 배포한다.
대기 중 API 배포가 후속 UI push로 대체되어도 아직 배포하지 않은 API 변경은 다음 실행에 포함된다.
`apps/web/messages/*.json`만 배포 경로 필터에 해당하면 RAG loader가 읽는
최상위 `profile`, `resume` 값이 바뀔 때만 API를 배포한다. 나머지 UI 문구 변경은 API 빌드와
재시작을 생략하고 Actions 요약에 이유를 남긴다. 웹 검증·배포는 기존대로 수행한다.

API 코드·계약·배포 설정과 이력 원본 등 기존 배포 대상이 함께 바뀌면 API를 배포한다.
배포 시작 시 성공 기록을 무효화하고 로컬 health와 선택한 공개 검사가 통과한 뒤 현재 커밋을
기록한다. 생략한 실행은 기록을 갱신하지 않으며, release 동기화는 기록 파일을 보존한다.
실패·실행 중 취소 뒤에는 성공 기록이 없으므로 다음 실행에서 안전하게 배포한다. UI 변경이나
원복만 이어져도 동일하다. 최초 적용·배포 디렉터리 교체로 기록이 없어도 한 번 배포한다.

현재 릴리스의 `current/revision`과 성공 기록이 다르거나 릴리스를 조회하지 못해도 재배포한다.
수동 복구 뒤 성공 기록만 남아 있다는 이유로 UI 변경 배포를 생략하지 않는다.

기록·커밋 조회 또는 JSON·git 비교에 실패하면 안전하게 배포하며, `workflow_dispatch`는 항상
배포한다. 판정 키 범위와 loader manifest, workflow 경로 필터는 `pnpm test:tooling`의 계약
테스트로 일치 여부를 확인한다.

### Beat Jev 대전의 재시작 정책

진행 중 Beat Jev 대전은 API 프로세스의 메모리 `Map`에만 보관한다. API 배포·서비스 재시작·
호스트 재부팅으로 진행 상태가 사라지며 복구하지 않는다. 사용자는 새 대전을 시작해야 한다.
UI 전용 변경은 불필요한 재시작을 피하지만, 필요한 API 배포에서는 이 유실 정책이 적용된다.
대전 상태의 DB 저장이나 migration은 현재 배포 정책의 범위에 포함하지 않는다.

## OCI runner offline

GitHub runner 이름은 `vscoke-api-oci-01`, labels는 `self-hosted,Linux,ARM64,vscoke-api,oci-01`이다.
OCI에서 전용 설치 경로의 서비스만 확인한다. Discord runner를 재시작하지 않는다.

```bash
cd /home/ubuntu/actions-runner-vscoke-api
systemctl status actions.runner.icecokel-VSCoke.vscoke-api-oci-01.service --no-pager
```

서비스 재시작은 인프라 관리자에게 요청한다. 등록 토큰/인증 파일을 로그로 출력하지 않는다.

## API systemd 장애와 배포 복구

```bash
systemctl status vscoke-api.service --no-pager
journalctl -u vscoke-api.service -n 100 --no-pager
readlink -f /home/ubuntu/vscoke-api/current
```

`logs/combined-YYYY-MM-DD.log`에서 X-Request-Id를 찾는다. 로그는 공유 디렉터리에 일별·20MB
압축 회전으로 180일 보관하며 배포가 삭제하지 않는다. 이는 호스트 장애에 대한 별도 백업이 아니다.
LOG_LEVEL 미설정은 운영 info이며 잘못된 값은 시작을 실패시킨다. 환경은 Secret 변경 후 재배포한다.

배포 스크립트가 이전 current/env를 복구했는지 확인한다. systemd 재시작 권한 실패 또는 SIGKILL·
호스트 장애가 있으면 `.local/deploy-<release-id>`의 복구 기록과
[수동 복구 명령](../apps/api/DEPLOY.md#3-빌드배포와-실패-복구)을 사용한다. 코드 복구는 DB 쓰기나
migration을 되돌리지 않는다. 반복 시작 제한에 걸리면 관리자가 원인을 해결하고 reset-failed/start를
수행한다. runner에는 이 관리자 권한을 포괄적으로 주지 않는다.

## Claude 답변 생성 장애

이력 질문·메인 채팅 답변이 timeout이나 공급자 오류로 실패하고 health는 정상이면 API의
`chat.answer` 로그에서 stage가 `query-rewrite`인지 `answer`인지 확인한다. 질문·대화·키 원문을
로그에 추가하지 않는다. upstream 오류 원문은 API 응답에 포함하지 않는다.

1. 운영 Secret의 `RAG_CHAT_PROVIDER=claude`, `RAG_CHAT_MODEL=claude-sonnet-5-5`와
   `ANTHROPIC_API_KEY` 설정 여부를 확인한다. 이전 Codex 값이 남아 있으면 교체한다.
2. Anthropic Console에서 키 유효성, 크레딧·요청 한도와 모델 접근 권한을 확인한다.
3. OCI 호스트에서 `https://api.anthropic.com`으로 HTTPS 연결이 가능한지 확인한다.
4. `RAG_CHAT_TIMEOUT_MS` 기본값은 45000이며 자동 재시도하지 않는다. 후속 질문에는
   재작성·답변 두 번의 호출이 있을 수 있다. 키·모델 변경은 Secret 수정 후 재배포한다.

Codex app-server나 CLI 로그인은 현재 답변 생성 경로에 사용하지 않는다.

## FE·BE 오류 추적

웹 오류 화면의 `오류 번호`는 `eventId`다. API 실패 응답의 `requestId`와
`X-Request-Id` 헤더는 API 요청 로그를 찾는 값이다. 브라우저·Next 서버 오류는
`POST /client-errors`를 통해 API의 일별 오류 로그에 `web.error`로 기록된다.
API 요청 종료는 `api.request`, API 예외는 `api.error`로 기록된다.
웹 API 클라이언트가 보낸 `X-Request-Id`는 세 이벤트의 `relatedRequestId`와
`requestId`를 연결한다.

```bash
cd /home/ubuntu/vscoke-api
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

OCI loopback health가 성공하고 공개 API가 실패하면 서비스보다 DNS·cloudflared·ingress를 먼저 본다.
공개 hostname은 OCI 전용 터널 `cc5f9f8e-fe12-436b-b243-be03466df18c`를 향한다. OCI의 전용 cloudflared
서비스와 `http://127.0.0.1:3000` ingress, api.icecoke.kr의 tunnel route를 확인한다.
서비스·인증 원본은 icecoke-ops가 관리한다. API 배포가 터널 설정을 바꾸지 않는다.

## DB 접속 장애

OCI의 PostgreSQL은 네이티브 `postgresql@16-main.service`이며 `127.0.0.1:5432`에서만 받는다.
`.local/db.env`가 OCI role·DB 자격 증명의 원본이다. write-native가 이를 앱 env에 적용하며 기존
Secret의 Docker `DB_HOST=postgres`는 덮어쓴다. 비밀번호 원문을 출력하지 말고 서비스·바인딩·파일
권한을 확인한다. role 암호 변경은 DB와 `.local/db.env`를 인프라 절차로 함께 변경한 후 재배포한다.

```bash
systemctl is-active postgresql@16-main.service
ss -ltn '( sport = :5432 )'
stat -c '%a %U' /home/ubuntu/vscoke-api/.local/db.env /home/ubuntu/vscoke-api/api.env
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
