# Hobby API Swagger Concept

기준:

- 대상 앱: `apps/api`
- 대상 도메인: `Recipe`, `EspressoHistory`
- 공개 문서: `/api`, `/api-json`
- 확인 기준일: 2026-06-16

이 문서는 취미 영역 API를 추가하거나 수정할 때 Swagger 계약을 빠뜨리지 않기 위한 기준 문서다. 상세 작성 규칙은 [Swagger 작성 규칙과 가이드](./swagger-style-guide.md)를 따른다.

## 목표

취미 API의 Swagger는 프론트가 타입을 생성하거나 수동 타입을 대조할 수 있을 만큼 구체적인 HTTP 계약이어야 한다.

```txt
NestJS controller
-> Response DTO
-> /api-json
-> openapi-typescript
-> apps/web service schema
```

## 대상 API

| 도메인          | 메서드 | 경로                           | 응답 DTO                    |
| --------------- | ------ | ------------------------------ | --------------------------- |
| Recipe          | GET    | `/recipes`                     | `RecipeResponseDto[]`       |
| Recipe          | GET    | `/recipes/{id}`                | `RecipeResponseDto`         |
| EspressoHistory | GET    | `/espresso-history/beans`      | `EspressoBeanResponseDto[]` |
| EspressoHistory | GET    | `/espresso-history/beans/{id}` | `EspressoBeanResponseDto`   |

## Swagger 원칙

1. 컨트롤러는 `@ApiTags`, `@ApiOperation`, `@ApiOkResponse`를 선언한다.
2. `@ApiOkResponse`에는 빈 설명을 두지 않고 성공 상황을 한 문장으로 적는다.
3. path parameter는 `@ApiParam`으로 이름, 설명, 예시를 문서화한다.
4. 응답 필드는 익명 `Object`를 피하고 named DTO로 분리한다.
5. 날짜/시각은 Swagger에서 `string`, `date-time`으로 노출한다.
6. nullable과 optional은 실제 JSON 응답 기준으로 구분한다.
7. enum 또는 literal 값은 Swagger enum으로 고정한다.

## 에스프레소 중첩 DTO 기준

에스프레소 기록은 중첩 객체가 많으므로 다음 구조를 DTO로 분리한다.

```txt
EspressoBeanResponseDto
├─ EspressoEquipmentDto
└─ EspressoLogResponseDto
   ├─ EspressoRoundResponseDto
   │  ├─ EspressoRecipeParametersDto
   │  ├─ EspressoResultDto
   │  └─ EspressoRoundAnalysisDto
   ├─ EspressoCurrentAnalysisDto
   ├─ EspressoAdjustmentGuideDto
   └─ EspressoNextTestDto
      ├─ EspressoRecipeParametersDto
      └─ EspressoMethodStepDto
```

## 레시피 DTO 기준

레시피 응답은 프론트가 목록과 상세를 동일 타입으로 소비한다.

| 필드          | 타입                | 필수 | 비고           |
| ------------- | ------------------- | ---- | -------------- |
| `id`          | `string(uuid)`      | Y    | DB 식별자      |
| `name`        | `string`            | Y    | 레시피 이름    |
| `tags`        | `string[]`          | Y    | 검색/분류 태그 |
| `ingredients` | `string[]`          | Y    | 재료           |
| `recipe`      | `string[]`          | Y    | 조리 단계      |
| `source`      | `RecipeSourceDto`   | N    | 원문 출처      |
| `createdAt`   | `string(date-time)` | Y    | 생성 시각      |
| `updatedAt`   | `string(date-time)` | Y    | 수정 시각      |

## 검증 기준

작업 후 다음을 확인한다.

```bash
pnpm --filter @vscoke/api build
pnpm --filter @vscoke/api test -- --runInBand
```

DB 연결이 가능한 환경에서는 `/api-json`을 조회해 다음을 확인한다.

- `/recipes`, `/recipes/{id}`가 존재한다.
- `/espresso-history/beans`, `/espresso-history/beans/{id}`가 존재한다.
- 에스프레소 핵심 객체가 `type: object`만으로 노출되지 않는다.
- `RecipeResponseDto`, `EspressoBeanResponseDto`가 named schema로 노출된다.
