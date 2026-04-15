# GeekNews API 스키마

기준 문서:

- 운영 Swagger: [https://api.icecoke.kr/api](https://api.icecoke.kr/api)
- 확인 기준일: 2026-04-15
- 기준 엔드포인트: `GeekNewsController_getLatestArticles`

## 1. GET `/geeknews/articles`

저장된 긱뉴스 번역 결과를 조회합니다.

### 요청 스키마

요청 본문은 없고, `query` 파라미터만 사용합니다.

| 위치  | 필드    | 타입     | 필수 | 설명             |
| ----- | ------- | -------- | ---- | ---------------- |
| query | `limit` | `number` | Y    | 조회할 기사 개수 |

TypeScript 기준 정의:

```ts
export type GetLatestGeekNewsArticlesRequest = {
  limit: number;
};
```

### 응답 스키마

`200 OK`

```ts
export type GetLatestGeekNewsArticlesResponse = GeekNewsArticleResponseDto[];
```

`GeekNewsArticleResponseDto`

| 필드                  | 타입                                    | 필수 | nullable | 비고                  |
| --------------------- | --------------------------------------- | ---- | -------- | --------------------- |
| `id`                  | `string`                                | Y    | N        | 내부 ID               |
| `sourceTopicId`       | `number`                                | Y    | N        | 원본 긱뉴스 토픽 ID   |
| `topicUrl`            | `string`                                | Y    | N        | 긱뉴스 토픽 URL       |
| `sourceUrl`           | `string`                                | N    | Y        | 원문 URL              |
| `title`               | `string`                                | Y    | N        | 원문 제목             |
| `content`             | `string`                                | Y    | N        | 원문 본문             |
| `translatedTitle`     | `string`                                | N    | Y        | 번역 제목             |
| `translatedContent`   | `string`                                | N    | Y        | 번역 본문             |
| `author`              | `string`                                | Y    | N        | 작성자                |
| `points`              | `number`                                | Y    | N        | 포인트                |
| `commentCount`        | `number`                                | Y    | N        | 댓글 수               |
| `rank`                | `number`                                | Y    | N        | 랭킹                  |
| `listedAtText`        | `string`                                | Y    | N        | 목록 노출 시간 텍스트 |
| `postedAt`            | `string(date-time)`                     | N    | Y        | 원문 게시 시각        |
| `sourceLanguage`      | `string`                                | Y    | N        | 원문 언어             |
| `translatedLanguage`  | `string`                                | N    | Y        | 번역 언어             |
| `translationStatus`   | `"pending" \| "translated" \| "failed"` | Y    | N        | 번역 상태             |
| `translationProvider` | `string`                                | N    | Y        | 번역 제공자           |
| `translationModel`    | `string`                                | N    | Y        | 번역 모델             |
| `translationError`    | `string`                                | N    | Y        | 번역 실패 사유        |
| `translatedAt`        | `string(date-time)`                     | N    | Y        | 번역 완료 시각        |
| `createdAt`           | `string(date-time)`                     | Y    | N        | 생성 시각             |
| `updatedAt`           | `string(date-time)`                     | Y    | N        | 수정 시각             |

응답 예시:

```json
[
  {
    "id": "1b9170b6-f49c-4b45-9d16-2c8cbf8cbb2e",
    "sourceTopicId": 12345,
    "topicUrl": "https://news.hada.io/topic?id=12345",
    "sourceUrl": "https://example.com/article",
    "title": "Original title",
    "content": "Original content",
    "translatedTitle": "번역된 제목",
    "translatedContent": "번역된 본문",
    "author": "hada",
    "points": 221,
    "commentCount": 48,
    "rank": 1,
    "listedAtText": "3시간 전",
    "postedAt": "2026-04-15T02:30:00.000Z",
    "sourceLanguage": "en",
    "translatedLanguage": "ko",
    "translationStatus": "translated",
    "translationProvider": "openai",
    "translationModel": "gpt-4.1-mini",
    "translationError": null,
    "translatedAt": "2026-04-15T02:31:10.000Z",
    "createdAt": "2026-04-15T02:31:20.000Z",
    "updatedAt": "2026-04-15T02:31:20.000Z"
  }
]
```

## 2. POST `/geeknews/sync`

관련 엔드포인트로, 최신 긱뉴스를 수동 동기화합니다.

### 요청 스키마

요청 본문과 파라미터가 없습니다.

### 응답 스키마

`200 OK`, `201 Created`

```ts
export type GeekNewsSyncResponseDto = {
  status: "completed" | "skipped";
  reason?: string | null;
  crawledPages: number;
  crawledTopics: number;
  createdTopics: number;
  updatedTopics: number;
  skippedTopics: number;
  translatedTopics: number;
  pendingTopics: number;
  failedTopics: number;
  articles: GeekNewsArticleResponseDto[];
};
```

## 3. 프런트 적용 위치

이 저장소에서는 아래 타입/함수로 계약을 재사용합니다.

- `src/types/api.d.ts`
- `src/services/geeknews-service.ts`
