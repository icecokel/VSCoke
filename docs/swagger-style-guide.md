# Swagger 작성 규칙과 가이드

기준:

- 운영 Swagger: [https://api.icecoke.kr/api](https://api.icecoke.kr/api)
- OpenAPI JSON: [https://api.icecoke.kr/api-json](https://api.icecoke.kr/api-json)
- 확인 기준일: 2026-04-15

이 문서는 `api.icecoke.kr`의 현재 노출 스펙을 기준으로, 앞으로 Swagger를 일관되게 유지하기 위한 작성 규칙과 실무 가이드를 정리합니다.

## 1. 기본 원칙

1. Swagger는 구현 추정 문서가 아니라 실제 HTTP 계약 문서여야 합니다.
2. 프런트가 소비하는 필드명, nullable 여부, enum 값은 Swagger와 동일해야 합니다.
3. 설명이 비어 있는 `response description`, `query description`은 배포 전 채웁니다.
4. `required`와 `nullable`은 서로 다른 의미이므로 둘 다 명시합니다.
5. 목록 응답은 `array`와 item DTO를 분리해서 표현합니다.

## 2. 경로와 태그 규칙

### 2-1. 태그

- 컨트롤러 단위로 `@ApiTags()`를 반드시 선언합니다.
- 태그명은 도메인 기준 단수/복수 혼용 없이 고정합니다.
- 루트 OpenAPI 문서의 `tags` 메타데이터도 함께 채워 Swagger UI에서 그룹 설명이 보이게 합니다.

권장 예시:

```ts
@ApiTags("GeekNews")
@Controller("geeknews")
export class GeekNewsController {}
```

### 2-2. 경로

- 리소스명은 소문자 케밥 또는 단일 소문자 세그먼트로 통일합니다.
- 동사 대신 리소스 중심 경로를 우선합니다.
- 수동 작업처럼 액션 성격이 강한 엔드포인트만 예외적으로 액션 세그먼트를 허용합니다.

예시:

- `GET /geeknews/articles`
- `POST /geeknews/sync`

## 3. Operation 규칙

### 3-1. summary

- 한글로 작성합니다.
- UI에서 바로 이해되도록 동작 + 대상 순서로 씁니다.
- 30자 안팎으로 짧게 유지합니다.

좋은 예:

- `저장된 긱뉴스 번역 결과 조회`
- `긱뉴스 최신 글을 수동으로 동기화`

### 3-2. operationId

- `ControllerName_methodName` 패턴을 유지합니다.
- 리팩터링 시에도 외부 코드 생성 영향이 크므로 불필요한 변경을 피합니다.

## 4. 요청 스키마 규칙

### 4-1. query/path/body 분리

- `query`, `path`, `body`는 각각 별도 스키마로 인식되도록 문서화합니다.
- `GET`은 본문 없이 `query`/`path`만 사용합니다.
- 검색, 정렬, 제한 수량은 `query`에 둡니다.

`GET /geeknews/articles` 예시:

```ts
@ApiQuery({
  name: "limit",
  type: Number,
  required: true,
  description: "조회할 기사 개수",
  example: 10,
})
```

### 4-2. 숫자 타입

- 개수, 페이지, 랭크처럼 정수 의미가 분명한 값은 가능하면 `integer`로 문서화합니다.
- 현재 운영 스펙의 `limit`은 `number`로 노출되어 있으므로, 백엔드가 정수만 허용한다면 Swagger도 `integer/int32`로 맞춰 갱신합니다.

### 4-3. 필수값

- validation 데코레이터와 Swagger 필수 여부가 어긋나지 않게 유지합니다.
- 선택 필드는 optional만 두지 말고 실제 null 가능 여부도 함께 결정합니다.

## 5. 응답 스키마 규칙

### 5-1. DTO 중심 문서화

- 익명 `object` 응답을 피하고 DTO 이름을 노출합니다.
- 배열은 `type: array` + `items: { $ref: ... }` 형태로 문서화합니다.
- 성공 응답은 `200`, 생성 응답은 `201`을 명확히 구분합니다.

예시:

```ts
@ApiOkResponse({
  description: "긱뉴스 기사 목록 조회 성공",
  type: GeekNewsArticleResponseDto,
  isArray: true,
})
```

### 5-2. 응답 설명

- `description` 공란 금지
- 어떤 상황에서 해당 status code가 반환되는지 한 문장으로 적습니다.

예시:

- `긱뉴스 기사 목록 조회 성공`
- `동기화 작업이 새로 수행되어 결과가 생성됨`

### 5-3. 오류 응답

- 최소 `400`, `404`, `500` 규칙을 문서화합니다.
- 인증/인가가 필요한 경우 `401`, `403`을 추가합니다.
- 오류 응답도 공통 DTO를 둡니다.

## 6. 필드 규칙

### 6-1. 이름

- JSON 필드명은 실제 응답과 동일하게 유지합니다.
- 프런트에서 별도 매핑하더라도 Swagger는 원본 계약 기준으로 적습니다.
- 현재 운영 스펙은 `sourceTopicId`, `translatedAt`처럼 camelCase를 사용하므로 새 필드도 같은 기준을 따릅니다.

### 6-2. nullable

- 값이 없을 수 있는 필드는 `nullable: true`를 명시합니다.
- optional과 nullable은 구분합니다.

예시:

- `sourceUrl?: string | null`
- `translatedAt?: string | null`

### 6-3. enum

- 상태값은 문자열 enum으로 고정합니다.
- enum 후보는 응답 예시와 DTO 설명 모두에서 일치해야 합니다.

예시:

```ts
@ApiProperty({
  enum: ["pending", "translated", "failed"],
  description: "번역 상태",
})
translationStatus: "pending" | "translated" | "failed";
```

### 6-4. 날짜

- 날짜/시각은 ISO 8601 문자열로 통일합니다.
- Swagger에는 `format: date-time`을 반드시 노출합니다.

## 7. 예시값 규칙

- 핵심 요청 파라미터에는 `example`를 넣습니다.
- 대표 응답 DTO에는 최소 1개의 현실적인 예시를 둡니다.
- 번역/집계처럼 nullable이 많은 DTO는 `null` 예시도 일부 포함합니다.

## 8. GeekNews 권장 문서화 예시

```ts
@ApiTags("GeekNews")
@ApiOperation({ summary: "저장된 긱뉴스 번역 결과 조회" })
@ApiQuery({
  name: "limit",
  type: Number,
  required: true,
  description: "조회할 기사 개수",
  example: 10,
})
@ApiOkResponse({
  description: "긱뉴스 기사 목록 조회 성공",
  type: GeekNewsArticleResponseDto,
  isArray: true,
})
@Get("articles")
getLatestArticles(@Query("limit", ParseIntPipe) limit: number) {
  return this.geekNewsService.getLatestArticles(limit);
}
```

## 9. 현재 운영 Swagger 기준 개선 포인트

2026-04-15 기준 확인 결과:

- 루트 `tags` 메타데이터가 비어 있습니다.
- 일부 응답의 `description`이 비어 있습니다.
- `limit`이 의미상 정수인데 `number`로만 노출됩니다.
- 오류 응답 스키마가 충분히 드러나지 않습니다.

우선순위:

1. 응답 설명 채우기
2. 태그 메타데이터 채우기
3. `limit` 같은 수량 파라미터를 `integer`로 정리
4. 공통 에러 DTO와 상태 코드 문서화

## 10. 배포 전 체크리스트

- [ ] 태그가 컨트롤러와 루트 문서에 모두 반영되었는가
- [ ] summary가 한글로 짧고 명확한가
- [ ] query/path/body가 구분되어 보이는가
- [ ] required와 nullable이 실제 구현과 일치하는가
- [ ] enum, date-time, array item DTO가 정확한가
- [ ] 200/201/4xx/5xx 응답 설명이 비어 있지 않은가
- [ ] Swagger UI와 `api-json`에서 동일하게 확인되는가
