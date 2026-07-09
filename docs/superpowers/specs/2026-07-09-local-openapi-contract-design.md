# Local OpenAPI Contract Design

## Goal

프론트 타입 생성이 운영 `https://api.icecoke.kr/api-json`에 의존하지 않고, 현재 커밋의 `apps/api` controller/DTO 계약을 기준으로 동작하게 만든다.

## Architecture

`apps/api`에 DB를 연결하지 않는 문서 전용 contract module을 둔다. 이 모듈은 실제 controller와 DTO를 사용하되 service provider는 문서 생성에 필요한 최소 stub으로 대체한다.

API tooling script는 contract module에서 OpenAPI JSON을 생성해 `apps/api/openapi.json`에 기록한다. Web의 `generate:types`는 이 로컬 JSON을 입력으로 `apps/web/src/types/api.d.ts`를 생성한다.

## Constraints

- Web은 `apps/api` 런타임 코드를 직접 import하지 않는다.
- OpenAPI JSON 생성은 DB, 운영 API, 운영 Swagger URL 없이 동작해야 한다.
- `apps/api/openapi.json`과 `apps/web/src/types/api.d.ts`는 생성 산출물로 커밋 가능한 계약 파일이다.
- CI는 생성 후 diff를 확인해 계약 파일이나 타입 파일 누락 갱신을 잡는다.
- 패키지 매니저는 루트 `packageManager`의 `pnpm@9.12.0`을 사용한다.

## Testing

- API e2e test에서 로컬 contract generator가 DB env 없이 핵심 OpenAPI path와 `GameType.POKE_LOUNGE` enum을 생성하는지 확인한다.
- `pnpm generate:types`가 로컬 `apps/api/openapi.json`을 갱신하고 Web 타입을 재생성하는지 확인한다.
- PR CI는 `pnpm generate:types` 후 `git diff --exit-code apps/api/openapi.json apps/web/src/types/api.d.ts`를 실행한다.
