# API 배포 가이드

이 프로젝트(`apps/api`)는 Termux 서버의 GitHub Actions self-hosted runner로 배포하고, 환경 변수는 서버에서 수동 관리합니다.

전체 monorepo 배포/환경 변수 기준은 [Deployment and Environment Plan](../../docs/deployment-and-env.md)을 우선합니다.

## 1. 소스 코드 배포 (자동)

코드 변경 사항(`apps/api/src/`, `apps/api/package.json` 등)은 Git을 통해 배포합니다.

1. 변경 사항 커밋:
   ```bash
   git add .
   git commit -m "feat(api):기능 추가"
   ```
2. 원격 저장소 푸시:
   ```bash
   git push origin main
   ```
3. GitHub Actions가 자동으로 다음을 수행합니다:
   - Termux PM2가 관리하는 self-hosted runner에서 작업 실행
   - Termux native `node`, `corepack`, `pm2` 사용
   - 빌드 (`pnpm --filter @vscoke/api build`)
   - staged release 생성 (`~/projects/vscoke-api/.next-release`)
   - production 의존성 설치
   - 서버 재기동 (`pm2 delete vscoke-api || true` 후 `pm2 start apps/api/dist/src/main.js --name vscoke-api --update-env`)
   - `pm2 save`
   - 내부/공개 API smoke test

## 2. 환경 변수 배포 (수동)

보안상 `.env` 파일은 Git에 포함되지 않으므로 수동으로 전송해야 합니다. 운영 `.env`는 Termux 서버의 `~/projects/vscoke-api/.env` 기준입니다.

로컬 또는 운영 환경을 새로 만들 때는 `apps/api/.env.example`을 복사한 뒤 실제 값으로 채웁니다.

1. `.env` 파일 전송:

   ```bash
   tmx cp .env
   ```

   > 주: `tmx cp`는 기본적으로 `~/projects/vscoke-api` 경로로 전송합니다.

2. (환경 변수만 변경 시) 서버 재시작 필요:
   ```bash
   tmx run "pm2 restart vscoke-api --update-env"
   ```
   > 코드 배포와 함께라면 GitHub Actions가 재시작해주므로 생략 가능합니다.

## 3. DB schema 변경

운영 API는 `DB_SYNCHRONIZE=false`를 기본으로 유지합니다. schema 변경은 TypeORM migration 파일로 추적하고, 운영 DB에는 backup을 만든 뒤 migration 명령으로만 반영합니다. 운영 DB에서 `psql`로 직접 DDL을 실행하는 방식은 긴급 복구 상황이 아니면 사용하지 않습니다.

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

운영 migration을 실행하기 직전에 Termux 서버에서 backup을 생성합니다.

```bash
cd /data/data/com.termux/files/home/projects/vscoke-api
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
cd /data/data/com.termux/files/home/projects/vscoke-api
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
cd /data/data/com.termux/files/home/projects/vscoke-api
set -a
. ./.env
set +a
pnpm --filter @vscoke/api migration:revert
pm2 restart vscoke-api --update-env
pnpm smoke:api:remote
```

backup으로 복구해야 하는 경우에는 API를 멈추고 restore한 뒤 다시 시작합니다.

```bash
cd /data/data/com.termux/files/home/projects/vscoke-api
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

Termux 서버에서는 API와 PostgreSQL이 같은 서버 안에서 동작하므로 `.env`의 `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`를 그대로 사용합니다.

Mac 로컬에서는 Cloudflare Access TCP tunnel을 먼저 실행합니다.

```bash
pnpm --filter @vscoke/api db:tunnel
```

tunnel 터미널은 유지하고, 다른 터미널에서 migration dry run이나 DB 확인 명령을 실행합니다.

## 요약

| 변경 유형                    | 배포 방법                  | 비고                       |
| :--------------------------- | :------------------------- | :------------------------- |
| **코드 (`apps/api/src` 등)** | `git push`                 | GitHub Actions가 자동 처리 |
| **환경 변수 (`.env`)**       | `tmx cp .env`              | 수동 전송 및 재시작 필요   |
| **DB schema**                | TypeORM migration + backup | 운영 반영 직전 backup 필수 |

## 운영 전 확인할 항목

- GitHub Actions self-hosted runner: labels `self-hosted`, `termux`, `vscoke-api`
- Termux runtime: Node.js 20 이상, Corepack, pnpm 9.12.0, PM2, PostgreSQL 접근성
- Cloudflare Tunnel: API 도메인이 Termux API 포트로 라우팅되는지 확인
- API runtime env: `NODE_ENV=production`, `DB_SYNCHRONIZE=false`, `GOOGLE_CLIENT_ID`, DB 접속 정보
- Web 연동: Vercel의 `NEXT_PUBLIC_API_URL`이 API 공개 도메인을 가리키는지 확인

## PM2 복구 절차

배포 workflow는 `vscoke-api` 프로세스를 삭제한 뒤 새로 시작합니다. 첫 운영 배포가 성공하면 Termux 서버에서 현재 PM2 목록을 저장합니다.

```bash
tmx run "pm2 status"
tmx run "pm2 save"
```

기기 재부팅 후 자동 복구가 필요하면 Termux:Boot 또는 기존 부팅 자동화에서 아래 흐름을 실행하도록 구성합니다.

```bash
pm2 resurrect
pm2 status
```

Cloudflare Tunnel도 재부팅 후 API 도메인을 다시 Termux API 포트로 연결해야 합니다. Tunnel이 별도 서비스로 관리되는지, Termux boot script에서 같이 시작되는지 운영 환경에서 확인합니다.
