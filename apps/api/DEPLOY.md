# API 배포 가이드

이 문서는 API 코드·환경 변수·DB schema를 운영에 반영하는 실행 절차만 다룹니다.

전체 monorepo 배포/환경 변수 기준은 [Deployment and Environment Plan](../../docs/deployment-and-env.md)을 우선합니다.

## 운영 서버 접속

운영 Ubuntu host 접속은 SSH alias만 사용합니다.

```bash
ssh icenux-external
```

서버 경로, 프로세스와 runner 기준값은
[Deployment and Environment Plan](../../docs/deployment-and-env.md#api-ubuntu-host)을 확인합니다.

## 1. 소스 코드 배포 (자동)

`main` 반영 뒤 `.github/workflows/deploy-api.yml`이 배포를 수행합니다. 수동 재실행은 해당
workflow의 `workflow_dispatch`를 사용하고, 완료 뒤 `pnpm smoke:api:remote`로 공개 health를
확인합니다. workflow 단계와 trigger가 바뀌면 workflow 파일을 기준으로 판단합니다.

## 2. 환경 변수 배포 (수동)

보안상 `.env` 파일은 Git에 포함하지 않고 수동으로 전송합니다. 파일 위치와 변수별 기준은
[Deployment and Environment Plan](../../docs/deployment-and-env.md#api-환경-변수)을 따릅니다.

로컬 또는 운영 환경을 새로 만들 때는 `apps/api/.env.example`을 복사한 뒤 실제 값으로 채웁니다.

1. `.env` 파일 전송:

   ```bash
   scp .env icenux-external:/home/icenux/projects/vscoke-api/.env
   ssh icenux-external "chmod 600 /home/icenux/projects/vscoke-api/.env"
   ```

2. (환경 변수만 변경 시) 서버 재시작 필요:
   ```bash
   ssh icenux-external "cd /home/icenux/projects/vscoke-api && pm2 restart vscoke-api --update-env"
   ```
   > 코드 배포와 함께라면 GitHub Actions가 재시작해주므로 생략 가능합니다.

Resume RAG와 메인 채팅 환경 변수는
[메인 채팅 AI 사용 지침](../../docs/main-chat-ai-usage-guide.md#5-배포-환경-설정)을 따릅니다.

## 3. DB schema 변경

운영 API는 `DB_SYNCHRONIZE=false`를 기본으로 유지합니다. schema 변경은 TypeORM migration 파일로 추적하고, 운영 DB에는 backup을 만든 뒤 migration 명령으로만 반영합니다. 운영 DB에서 `psql`로 직접 DDL을 실행하는 방식은 긴급 복구 상황이 아니면 사용하지 않습니다.

### Legacy baseline 주의

`CreateLegacyCoreSchema1759999999999`는 migration 도입 전에 생성된 `public.user`,
`public.game_history`, `public.game_history_gametype_enum`을 ledger에 편입합니다. 세 객체가 모두
없으면 canonical schema를 만들고, 모두 있으면 알려진 정확한 schema만 채택합니다. 일부만 있거나
열·제약·enum·필수 index가 다르면 자동 수리 없이 실패합니다.

운영 최초 적용 전에는 세 객체의 schema와 TypeORM `migrations` ledger를 함께 덤프합니다. 이미
후속 enum migration이 기록된 DB를 고려해 baseline은 `SKY_DROP` 또는 순서가 고정된
`SKY_DROP, POKE_LOUNGE`만 허용합니다. 실패 시 drop, alter 또는 ledger 수동 삽입을 하지 말고
차이를 먼저 검토합니다. 이 baseline의 `down`은 기존 데이터 삭제를 막기 위해 의도적으로
실패합니다.

### Migration 생성

빈 migration을 만들 때:

```bash
pnpm --filter @vscoke/api migration:create src/migrations/<kebab-summary>
```

현재 entity와 연결된 DB를 비교해 migration 초안을 만들 때:

```bash
pnpm --filter @vscoke/api db:tunnel
pnpm --filter @vscoke/api migration:generate src/migrations/<kebab-summary>
```

`migration:generate`는 현재 DB schema와 entity 차이를 비교하므로, 별도 터미널에서 DB tunnel을 계속 유지해야 합니다. 생성된 migration의 `up`, `down`을 모두 검토하고, rollback이 불가능한 변경은 배포 전에 별도 수동 복구 절차를 이 문서나 PR에 남깁니다.

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

운영 migration을 실행하기 직전에 Ubuntu host에서 backup을 생성합니다.

```bash
cd /home/icenux/projects/vscoke-api
set -a
. ./.env
set +a
mkdir -p backups
BACKUP_FILE="backups/${DB_DATABASE}-$(date +%Y%m%d-%H%M%S).dump"
PGPASSWORD="$DB_PASSWORD" pg_dump \
  -h "$DB_HOST" \
  -p "${DB_PORT:-5432}" \
  -U "$DB_USERNAME" \
  -d "$DB_DATABASE" \
  --format=custom \
  --no-owner \
  --no-acl \
  --file "$BACKUP_FILE"
pg_restore --list "$BACKUP_FILE" | head
```

backup 파일이 생성되고 `pg_restore --list`가 archive 내용을 출력해야 migration을 진행합니다.

### 운영 migration 실행

운영 release 경로에서 migration 상태를 확인한 뒤 실행합니다.

```bash
cd /home/icenux/projects/vscoke-api
set -a
. ./.env
set +a
pnpm --filter @vscoke/api migration:show
pnpm --filter @vscoke/api migration:run
pm2 restart vscoke-api --update-env
pnpm smoke:api:remote
pm2 save
```

기본 흐름은 backward-compatible migration을 먼저 적용하고, 코드가 새 schema를 사용하도록 배포하는 방식입니다. 기존 코드와 새 코드 중 한쪽이 깨지는 breaking schema 변경은 expand/contract 단계로 나누어 별도 PR로 처리합니다.

### Rollback

마지막 migration만 되돌리면 되는 경우:

```bash
cd /home/icenux/projects/vscoke-api
set -a
. ./.env
set +a
pnpm --filter @vscoke/api migration:revert
pm2 restart vscoke-api --update-env
pnpm smoke:api:remote
```

backup으로 복구해야 하는 경우에는 API를 멈추고 restore한 뒤 다시 시작합니다.

```bash
cd /home/icenux/projects/vscoke-api
set -a
. ./.env
set +a
pm2 stop vscoke-api
PGPASSWORD="$DB_PASSWORD" pg_restore \
  -h "$DB_HOST" \
  -p "${DB_PORT:-5432}" \
  -U "$DB_USERNAME" \
  -d "$DB_DATABASE" \
  --clean \
  --if-exists \
  --no-owner \
  --no-acl \
  "$BACKUP_FILE"
pm2 restart vscoke-api --update-env
pnpm smoke:api:remote
pm2 save
```

restore에 사용할 `BACKUP_FILE`은 운영 backup 단계에서 생성한 파일 경로로 설정합니다.

### DB 접속 기준

Ubuntu host에서는 API와 PostgreSQL이 같은 서버 안에서 동작하므로 `.env`의 `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`를 그대로 사용합니다.

Mac 로컬에서는 Cloudflare Access TCP tunnel을 먼저 실행합니다.

```bash
pnpm --filter @vscoke/api db:tunnel
```

tunnel 터미널은 유지하고, 다른 터미널에서 migration dry run이나 DB 확인 명령을 실행합니다.

## 요약

| 변경 유형                    | 배포 방법                                                        | 비고                       |
| :--------------------------- | :--------------------------------------------------------------- | :------------------------- |
| **코드 (`apps/api/src` 등)** | `git push`                                                       | GitHub Actions가 자동 처리 |
| **환경 변수 (`.env`)**       | `scp .env icenux-external:/home/icenux/projects/vscoke-api/.env` | 수동 전송 및 재시작 필요   |
| **DB schema**                | TypeORM migration + backup                                       | 운영 반영 직전 backup 필수 |

배포 실패, PM2 복구와 Cloudflare Tunnel 장애 대응은
[Operations Runbook](../../docs/operations-runbook.md)을 따릅니다.
