# Local Development

이 문서는 VSCoke monorepo를 로컬에서 실행하고 검증하는 기준을 정리한다.

## 기본 전제

- Node.js 20 이상을 사용한다.
- 패키지 매니저는 루트 `package.json`의 `packageManager`에 맞춰 `pnpm@9.12.0`을 사용한다.
- 모든 명령은 별도 안내가 없으면 저장소 루트에서 실행한다.

```bash
corepack enable
corepack prepare pnpm@9.12.0 --activate
pnpm install
```

## 앱 구조

```txt
apps/web -> Next.js frontend
apps/api -> NestJS backend
```

루트 스크립트는 workspace 명령을 감싸는 진입점이다.

| 목적      | 명령             |
| --------- | ---------------- |
| 웹 개발   | `pnpm dev:web`   |
| API 개발  | `pnpm dev:api`   |
| 전체 빌드 | `pnpm build`     |
| 웹 빌드   | `pnpm build:web` |
| API 빌드  | `pnpm build:api` |
| 웹 lint   | `pnpm lint:web`  |
| API test  | `pnpm test:api`  |
| 웹 E2E    | `pnpm e2e`       |

## 환경 변수 준비

환경 변수 파일은 Git에 커밋하지 않는다. 예시는 각 앱의 `.env.example`을 기준으로 한다.

```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
```

웹에서 API를 호출하려면 `NEXT_PUBLIC_API_URL`이 필요하다.

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

운영 API를 바라보며 웹만 개발할 때는 다음 값을 사용할 수 있다.

```env
NEXT_PUBLIC_API_URL=https://api.icecoke.kr
```

API는 DB, Google OAuth, 알림 설정을 `apps/api/.env`에서 읽는다. 운영 값은 Termux 서버의 API `.env`에서 별도로 관리한다.

## 웹만 실행

운영 API를 바라보며 웹을 확인할 때 사용한다.

```bash
pnpm dev:web
```

확인 주소:

```txt
http://localhost:3000
```

웹 빌드만 확인할 때:

```bash
pnpm build:web
```

API가 없어도 빌드만 확인해야 하면 `NEXT_PUBLIC_API_URL`에 임시 URL을 넣어 실행할 수 있다.

```bash
NEXT_PUBLIC_API_URL=http://127.0.0.1:65535 pnpm build:web
```

## API만 실행

API 개발 서버:

```bash
PORT=3001 pnpm dev:api
```

Swagger 확인:

```txt
http://localhost:3001/api
http://localhost:3001/api-json
```

API 빌드:

```bash
pnpm build:api
```

API 테스트:

```bash
pnpm test:api
```

## 웹과 API 같이 실행

터미널을 두 개 사용한다.

터미널 1:

```bash
PORT=3001 pnpm dev:api
```

터미널 2:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001 pnpm dev:web
```

이 방식은 프론트가 로컬 NestJS API를 직접 호출한다.

## DB tunnel

운영 DB는 Termux 서버 안의 PostgreSQL을 기준으로 한다. Mac에서 DB 확인이 필요하면 Cloudflare Access TCP tunnel을 먼저 띄운다.

```bash
pnpm --filter @vscoke/api db:tunnel
```

터널 실행에는 `apps/api/.env`의 `CLOUDFLARE_DB_HOST`와 `DB_PORT`가 필요하다. 터널을 띄운 터미널은 유지하고, 다른 터미널에서 API 실행이나 DB 확인을 진행한다.

```txt
Mac localhost:5432 -> cloudflared access tcp -> PostgreSQL on Termux
```

## API 타입 갱신

프론트 타입은 공개 Swagger JSON에서 생성한다.

```bash
pnpm generate:types
```

API DTO나 controller 응답이 바뀌면 다음 순서로 확인한다.

1. API를 배포하거나 로컬 Swagger가 최신인지 확인한다.
2. `pnpm generate:types`를 실행한다.
3. `apps/web/src/types/api.d.ts` 변경을 확인한다.
4. 프론트 서비스와 화면 사용처를 함께 수정한다.

## 검증 명령

작업 종류에 따라 필요한 검증만 선택한다.

```bash
pnpm lint
pnpm build
pnpm test:api
pnpm e2e:smoke
```

API 배포 후 공개 endpoint를 확인할 때:

```bash
pnpm smoke:api:remote
```

## 자주 생기는 문제

`NEXT_PUBLIC_API_URL environment variable is not defined`가 나오면 웹 환경 변수 파일이나 실행 명령에 `NEXT_PUBLIC_API_URL`을 추가한다.

API가 DB에 붙지 못하면 `apps/api/.env`의 DB 값과 tunnel 실행 여부를 먼저 확인한다.

웹에서 CORS 에러가 나오면 API의 `CORS_ORIGINS`에 현재 웹 origin이 포함되어 있는지 확인한다.

Swagger 타입이 프론트 코드와 맞지 않으면 API 배포 상태와 `apps/web/src/types/api.d.ts` 생성 시점을 확인한다.
