# Hobby Frontend Schema Concept

기준:

- 대상 앱: `apps/web`
- 대상 도메인: `Recipe`, `EspressoHistory`
- 백엔드 기준 문서: [Hobby API Swagger Concept](./hobby-api-swagger-concept.md)
- 확인 기준일: 2026-07-10

이 문서는 취미 영역 프론트가 백엔드 API 계약을 놓치지 않고 소비하기 위한 타입/스키마 관리 기준 문서다.

## 목표

프론트의 취미 타입은 raw JSON 파일 구조가 아니라 백엔드 API 응답 계약을 기준으로 유지한다.

```txt
Backend controller/DTO
-> local OpenAPI contract
-> generated OpenAPI types
-> service layer
-> page/component props
```

## 원칙

1. 취미 페이지는 raw JSON을 import하지 않는다.
2. API 호출은 `apps/web/src/services/*`에 둔다.
3. 컴포넌트는 서비스 응답 타입을 props로 받아 렌더링한다.
4. API 응답 필드는 프론트에서 사용하지 않더라도 계약 타입에 포함한다.
5. 취미 도메인 타입은 `apps/web/src/types/api.d.ts`의 `components["schemas"]` alias로 유지한다.
6. API DTO가 바뀌면 `pnpm generate:types`와 `pnpm check:api-contract`를 함께 실행한다.

## 현재 구조

```txt
apps/web/src/services/recipe-service.ts
└─ Recipe[] = components["schemas"]["RecipeResponseDto"][]

apps/web/src/services/espresso-history-service.ts
└─ EspressoBean[] = components["schemas"]["EspressoBeanResponseDto"][]

apps/web/src/features/hobby/
├─ types/
├─ components/
└─ lib/
```

## 레시피 타입 기준

`Recipe`는 백엔드 `RecipeResponseDto`와 같은 필드를 포함한다.

| 필드          | 프론트 타입    | 비고          |
| ------------- | -------------- | ------------- |
| `id`          | `string`       | UUID          |
| `name`        | `string`       | 이름          |
| `tags`        | `string[]`     | 검색 키워드   |
| `ingredients` | `string[]`     | 재료          |
| `recipe`      | `string[]`     | 조리 단계     |
| `source`      | `RecipeSource` | 선택 필드     |
| `createdAt`   | `string`       | ISO date-time |
| `updatedAt`   | `string`       | ISO date-time |

## 에스프레소 타입 기준

에스프레소 타입은 백엔드 중첩 DTO와 같은 구조를 유지한다.

- 장비: `machine`, `grinder`, `basket`, `dosingShaker`, `tamper`
- 측정값: `value`, `min`, `max`, `unit`
- 라운드: `recipe`, `result`, `analysis`, `nextActions`
- 로그: `rounds`, `currentAnalysis`, `adjustmentGuide`, `finalHypothesis`, `nextTest`, `nextDirection`

## 검색 인덱스 기준

전역 검색은 같은-origin Next route인 `/api/hobby-search-index`를 통해 취미 API 데이터를 읽는다. 브라우저에서 운영 API를 직접 호출하면 로컬 동적 포트와 운영 도메인 차이 때문에 CORS 이슈가 생길 수 있다.

```txt
SearchPanel
-> /api/hobby-search-index
-> getRecipes(), getEspressoBeans()
-> apps/api public API
```

## 검증 기준

작업 후 다음을 확인한다.

```bash
pnpm generate:types
pnpm check:api-contract
pnpm --filter @vscoke/web type:check
pnpm --filter @vscoke/web e2e -- tests/e2e/hobby-recipes.spec.ts tests/e2e/hobby-espresso.spec.ts --project=chromium
```

API 문서와 타입을 같이 바꾼 경우 다음도 확인한다.

```bash
pnpm --filter @vscoke/api build
```

## 타입 갱신 기준

취미 타입은 이미 generated schema alias를 사용한다. 운영 API Swagger는 배포 상태 확인용으로만 보고, 개발/CI의 타입 source of truth는 현재 커밋에서 생성한 `apps/api/openapi.json`이다.
