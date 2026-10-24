# API 배포 가이드

이 문서는 API 코드·환경 변수·DB schema를 운영에 반영하는 실행 절차만 다룹니다.

전체 monorepo 배포/환경 변수 기준은 [Deployment and Environment Plan](../../docs/deployment-and-env.md)을 우선합니다.

## 운영 서버 접속

운영 API는 Mac mini의 Docker Compose에서 실행됩니다. 아래 명령은 Mac mini의 배포 디렉터리에서
실행합니다.

```bash
cd /Users/smlee/projects/vscoke-api
```

서버 경로, 컨테이너와 runner 기준값은
[Deployment and Environment Plan](../../docs/deployment-and-env.md#api-mac-mini-docker)을 확인합니다.

## 1. 소스 코드 배포 (자동)

`main` 반영 뒤 `.github/workflows/deploy-api.yml`이 배포를 수행합니다. 수동 재실행은 해당
workflow의 `workflow_dispatch`를 사용하고, 완료 뒤 `pnpm smoke:api:remote`로 공개 health를
확인합니다. workflow 단계와 trigger가 바뀌면 workflow 파일을 기준으로 판단합니다.

## 2. 환경 변수 배포 (GitHub Secret)

운영 환경변수의 원본은 `icecokel/VSCoke`의 Repository Secret `API_ENV_PRODUCTION`입니다.
서버 `api.env`, `postgres.env`, `.env`는 배포 결과물이며 직접 수정하거나 수동으로 전송하지
않습니다. 로컬 개발은 기존처럼 `apps/api/.env`를 사용합니다.

1. GitHub의 **Settings → Secrets and variables → Actions → API_ENV_PRODUCTION**에서
   운영용 dotenv 전체 내용을 수정합니다. 예제와 변수 기준은
   [Deployment and Environment Plan](../../docs/deployment-and-env.md#api-환경-변수)을 따릅니다.
2. **Actions → Deploy API to Mac mini (Docker) → Run workflow**로 `main`을 다시 배포합니다.
3. workflow가 Secret을 검증하고 서버 `api.env`를 권한 `600`으로 원자적으로 교체한 뒤
   import/index와 API 컨테이너 교체를 수행합니다. Secret이 비어 있으면 기존 파일로 대체하지 않고
   릴리스 변경 전에 실패합니다. `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`는 postgres 컨테이너의
   최초 초기화에만 쓰이므로 이미 초기화된 DB의 비밀번호를 바꾸려면 DB에서 `ALTER ROLE`을 먼저
   실행합니다.
4. 공개 health와 JEV 상태를 확인합니다. `JEV_API_KEY`가 비어 있으면 JEV 게임은 숨겨집니다.

`NODE_ENV=production`, `DB_SYNCHRONIZE=false`와 DB·Google 인증 필수값을 포함합니다. Docker
운영 필수값(`DB_HOST=postgres`, `RAG_CODEX_APP_SERVER_URL=ws://host.docker.internal:14561` 등)은
[Mac mini 초기 준비](../../docs/deployment-and-env.md#mac-mini-초기-준비)의 표를 따릅니다.
개발 인증 우회와 테스트 토큰은 제외합니다. 비밀값을 명령 인자, Git 파일 또는 로그에
남기지 않습니다. 컨테이너 진입점은 dotenv를 셸로 실행하지 않고 파싱해 자식 프로세스에 전달합니다.

Resume RAG와 메인 채팅 환경 변수는
[현재 배포·검증 기준](../../docs/main-chat-ai-usage-guide.md#6-배포와-검증)을 따릅니다.

### 현재 릴리스 구성과 실행 순서

| 구분         | 현재 동작                                                                                                            |
| ------------ | -------------------------------------------------------------------------------------------------------------------- |
| DB migration | 자동 실행하지 않습니다. 신규 schema는 백업·ledger 확인 후 API보다 먼저 적용합니다.                                   |
| 이미지       | `apps/api/Dockerfile`로 빌드하고 `vscoke-api:<sha>`, `vscoke-api:latest`로 태그합니다.                               |
| 공개 원본    | 웹 이력 JSON·번역 메시지·경력 MDX·공개 안내 문서를 이미지에 포함합니다. 개인 이력 작업공간은 제외합니다.             |
| import       | DB 기동 후 API 이미지로 공개 원본을 `resume:import`와 같은 스크립트로 동기화합니다. 실패하면 배포를 실패 처리합니다. |
| index        | keyword 모드가 아니고 임베딩 공급자가 설정됐을 때 실행합니다.                                                        |
| API 교체     | import와 필요한 index가 성공한 뒤 `docker compose up --wait api`로 컨테이너를 교체합니다.                            |
| health 도구  | `scripts/check-api-health.mjs`, `api-health-checker.mjs`, `api-deploy-env.mjs`를 릴리스와 이미지에 포함합니다.       |
| 보존 경로    | `rsync --delete`에서 `.env`, `api.env`, `postgres.env`, `.next-release`, `backups`, `logs`를 제외합니다.             |

신규 기능 릴리스는 **migration → API → 웹** 순서를 확보합니다. API와 Vercel 사이의 자동
순서 보장은 없습니다. 소스 빌드 도구나 개인 원본을 운영 릴리스에 임의로 추가하지 않습니다.
현재 자동화의 판단 기준은 위 표와 workflow입니다.

health 검사는 checkout 루트 또는 새 릴리스 루트에서 `pnpm smoke:api:remote`로 실행합니다.
이전 릴리스로 롤백해 health 파일이 없으면 검증된 checkout에서 대상 `API_HEALTH_URL`을
지정해 실행합니다. health 성공은 DB migration·RAG 검색 품질 검증을 대체하지 않습니다.

## 3. DB schema 변경

운영 API는 `DB_SYNCHRONIZE=false`를 기본으로 유지합니다. schema 변경은 TypeORM migration 파일로 추적하고, 운영 DB에는 backup을 만든 뒤 migration 명령으로만 반영합니다. 운영 DB에서 `psql`로 직접 DDL을 실행하는 방식은 긴급 복구 상황이 아니면 사용하지 않습니다.

### Legacy baseline 주의

`CreateLegacyCoreSchema1759999999999`는 migration 도입 전에 생성된 `public.user`,
`public.game_history`, `public.game_history_gametype_enum`을 ledger에 편입합니다. 세 객체가 모두
없으면 canonical schema를 만들고, 모두 있으면 알려진 정확한 schema만 채택합니다. 일부만 있거나
열·제약·enum·필수 index가 다르면 자동 수리 없이 실패합니다.

운영 최초 적용 전에는 세 객체의 schema와 TypeORM `migrations` ledger를 함께 덤프합니다.
baseline은 `SKY_DROP` enum만 허용합니다. 실패 시 drop, alter 또는 ledger 수동 삽입을 하지 말고
차이를 먼저 검토합니다. 이 baseline의 `down`은 기존 데이터 삭제를 막기 위해 의도적으로
실패합니다.

### Migration 생성

아래 `<kebab-summary>`는 실제 변경 요약의 kebab-case 이름으로 바꿉니다.

빈 migration을 만들 때:

```bash
pnpm --filter @vscoke/api migration:create 'src/migrations/<kebab-summary>'
```

현재 entity와 연결된 DB를 비교해 migration 초안을 만들 때:

```bash
pnpm --filter @vscoke/api migration:generate 'src/migrations/<kebab-summary>'
```

`migration:generate`는 `apps/api/.env`의 `DB_*`가 가리키는 로컬 DB schema와 entity 차이를 비교합니다.
운영 PostgreSQL은 호스트에 포트를 publish하지 않으므로 운영 schema와 비교하려면 운영 backup을 로컬 DB에
restore한 뒤 실행합니다. 생성된 migration의 `up`, `down`을 모두 검토하고, rollback이 불가능한 변경은
배포 전에 별도 수동 복구 절차를 이 문서나 PR에 남깁니다.

### Local dry run

schema 변경 PR에서는 운영 반영 전에 로컬 또는 staging DB에서 migration 실행과 되돌리기를 확인합니다.

```bash
pnpm --filter @vscoke/api build
pnpm --filter @vscoke/api migration:show
pnpm --filter @vscoke/api migration:run
pnpm --filter @vscoke/api migration:revert
pnpm --filter @vscoke/api migration:run
```

`migration:show`, `migration:run`, `migration:revert`는 `dist/src/data-source.js`를 사용하므로 먼저 API를 build합니다.

### 운영 backup

운영 migration을 실행하기 직전에 Mac mini에서 postgres 컨테이너로 backup을 생성합니다. 컨테이너의
`/backups`는 호스트 `backups/`에 bind mount되어 있고 배포가 보존합니다. `$POSTGRES_*`는 컨테이너
환경에서 해석되므로 호스트 셸에 비밀값을 두지 않습니다.

```bash
cd /Users/smlee/projects/vscoke-api
BACKUP_NAME="vscoke-$(date +%Y%m%d-%H%M%S).dump"
docker compose exec postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-acl --file "/backups/'"$BACKUP_NAME"'"'
docker compose exec postgres pg_restore --list "/backups/$BACKUP_NAME" | head
```

backup 파일이 `backups/`에 생성되고 `pg_restore --list`가 archive 내용을 출력해야 migration을 진행합니다.

### 운영 migration 실행

API 이미지로 일회성 컨테이너를 띄워 migration 상태를 확인한 뒤 실행합니다. 컨테이너 진입점과 같은
`api-deploy-env.mjs run`이 mount된 secret을 주입합니다.

```bash
cd /Users/smlee/projects/vscoke-api
docker compose run --rm --no-deps api node scripts/api-deploy-env.mjs run pnpm --filter @vscoke/api migration:show
docker compose run --rm --no-deps api node scripts/api-deploy-env.mjs run pnpm --filter @vscoke/api migration:run
docker compose restart api
pnpm smoke:api:remote
```

기본 흐름은 backward-compatible migration을 먼저 적용하고, 코드가 새 schema를 사용하도록 배포하는 방식입니다. 기존 코드와 새 코드 중 한쪽이 깨지는 breaking schema 변경은 expand/contract 단계로 나누어 별도 PR로 처리합니다.

### Rollback

마지막 migration만 되돌리면 되는 경우:

```bash
cd /Users/smlee/projects/vscoke-api
docker compose run --rm --no-deps api node scripts/api-deploy-env.mjs run pnpm --filter @vscoke/api migration:revert
docker compose restart api
pnpm smoke:api:remote
```

backup으로 복구해야 하는 경우에는 API를 멈추고 restore한 뒤 다시 시작합니다.

```bash
cd /Users/smlee/projects/vscoke-api
docker compose stop api
docker compose exec postgres sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner --no-acl "/backups/'"$BACKUP_NAME"'"'
docker compose up --detach --wait api
pnpm smoke:api:remote
```

restore에 사용할 `BACKUP_NAME`은 운영 backup 단계에서 생성한 파일 이름으로 설정합니다.

코드 롤백은 이전 이미지를 되살리지 않고 `main`에 revert 커밋을 올려 workflow를 다시 실행합니다.
직전 sha 이미지는 workflow 끝에서 제거되므로 수동 롤백 수단으로 가정하지 않습니다.

### DB 접속 기준

운영 PostgreSQL은 compose 네트워크 안의 `postgres` 컨테이너이며 호스트 포트를 publish하지 않습니다.
확인 명령은 `docker compose exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"`로 실행합니다.
`migration:generate`는 로컬 개발 DB를 기준으로 하고, 운영 schema 비교가 필요하면 backup을 로컬 DB에
restore해 사용합니다.

## 4. Ubuntu host에서 Mac mini Docker로 전환

한 번만 수행하는 전환 절차입니다. 사전 준비(OrbStack, runner, Codex app-server, cloudflared, Secret 갱신)는
[Mac mini 초기 준비](../../docs/deployment-and-env.md#mac-mini-초기-준비)를 먼저 마칩니다.

1. Ubuntu host에서 최종 backup을 만들어 Mac mini의 `backups/`로 옮깁니다. Ubuntu PostgreSQL은 18이라
   `pg_dump` 결과(archive 1.16)를 pg16 `pg_restore`가 읽지 못합니다. restore 전에 `postgres:18` 이미지의
   `pg_restore`로 plain SQL로 바꿔 둡니다.

   ```bash
   ssh icenux-external 'export LD_LIBRARY_PATH=/home/icenux/.local/pgsql-root/usr/lib/x86_64-linux-gnu:/home/icenux/.local/pgsql-root/usr/lib/postgresql/18/lib; /home/icenux/.local/pgsql-root/usr/lib/postgresql/18/bin/pg_dump -h /home/icenux/postgresql/18/run -U vscoke-api -d vscoke-api --format=custom --no-owner --no-acl' > /Users/smlee/projects/vscoke-api/backups/cutover.dump
   docker run --rm -v /Users/smlee/projects/vscoke-api/backups:/backups postgres:18 pg_restore --no-owner --no-acl -f /backups/cutover.sql /backups/cutover.dump
   sed -i '' '/^SET transaction_timeout = 0;$/d' /Users/smlee/projects/vscoke-api/backups/cutover.sql
   ```

2. Mac mini 저장소 checkout에서 compose 파일과 Secret 파일을 수동으로 한 번 준비합니다. `API_ENV_PRODUCTION`
   값은 GitHub Secret과 같은 내용을 사용하고 파일로 남기지 않습니다.

   ```bash
   cd /Users/smlee/vscoke
   cp apps/api/docker-compose.yml /Users/smlee/projects/vscoke-api/
   API_DEPLOY_DIR=/Users/smlee/projects/vscoke-api API_ENV_PRODUCTION="$(pbpaste)" node scripts/api-deploy-env.mjs write
   ```

3. postgres만 올리고 backup을 restore합니다. `CREATE EXTENSION vector`는 dump에 포함되며
   `pgvector/pgvector:pg16` 이미지가 지원합니다.

   ```bash
   cd /Users/smlee/projects/vscoke-api
   docker compose up --detach --wait postgres
   docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 --single-transaction -f /backups/cutover.sql'
   docker compose exec postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "select count(*) from migrations"'
   ```

4. GitHub Actions에서 **Deploy API to Mac mini (Docker)**를 수동 실행합니다. 이미지 빌드, import, API
   컨테이너 기동과 내부 health까지 통과한 뒤 공개 health는 tunnel 전환 전이라 실패할 수 있습니다.
5. Cloudflare에서 `api.icecoke.kr` route를 Mac mini tunnel로 옮기고 Ubuntu tunnel의 route를 제거합니다.
   `pnpm smoke:api:remote`로 공개 health를 확인한 뒤 workflow를 한 번 더 실행해 전체 통과를 확인합니다.
6. Ubuntu host에서 `pm2 stop vscoke-api`, runner 서비스와 `cloudflared-icenux.service`를 중지합니다.
   Ubuntu PostgreSQL은 전환 검증이 끝날 때까지 읽기 전용 비교 용도로 유지한 뒤 정리합니다.

### 전환 실행 기록 (2026-10-24)

Ubuntu host가 꺼진 상태에서 전환을 시작해 위 1·3단계를 그대로 수행하지 못했습니다. 실제로 적용한 상태는
다음과 같습니다.

- Mac mini DB는 빈 DB에 migration 6개를 적용해 schema를 만들었습니다.
- 데이터는 `~/icecoke-ops/docker/backups/vscoke-api-icenux-20260628-132521.dump`(2026-06-28 Ubuntu
  backup)에서 현재 schema에 남아 있는 `user`(3건)와 `game_history`(43건)만 옮겼습니다. 적용한 SQL은
  `backups/restored-icenux-20260628-user-game_history.sql`에 있습니다.
- dump의 `espresso_*`, `geek_news_article`, `recipe`, `word`는 현재 API에 table이 없어 옮기지 않았습니다.
- 2026-06-28 이후 Ubuntu에 쌓인 `user`, `game_history`, resume chat, usage event 데이터는 Ubuntu 디스크에만
  있습니다. host가 다시 켜지면 1단계 방식으로 최신 dump를 받아 아래처럼 `id` 기준으로 합칩니다.

  ```bash
  docker run --rm -v /Users/smlee/projects/vscoke-api/backups:/backups postgres:18 pg_restore --data-only --no-owner --no-acl -t user -t game_history -f /backups/icenux-latest.sql /backups/icenux-latest.dump
  # COPY를 임시 table로 받아 ON CONFLICT (id) DO NOTHING으로 insert하는 SQL로 바꾼 뒤 적용합니다.
  ```

## 요약

| 변경 유형                    | 배포 방법                                                      | 비고                              |
| :--------------------------- | :------------------------------------------------------------- | :-------------------------------- |
| **코드 (`apps/api/src` 등)** | `git push`                                                     | GitHub Actions가 이미지 빌드·교체 |
| **환경 변수 (`api.env`)**    | Repository Secret `API_ENV_PRODUCTION` 수정 후 workflow 재실행 | Actions가 생성 및 컨테이너 교체   |
| **DB schema**                | TypeORM migration + backup                                     | 운영 반영 직전 backup 필수        |

배포 실패, 컨테이너 복구와 Cloudflare Tunnel 장애 대응은
[Operations Runbook](../../docs/operations-runbook.md)을 따릅니다.
