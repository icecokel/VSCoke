# 운영 로그와 사용 집계

## 운영 로그

API의 모든 요청에 `X-Request-Id`를 발급하거나 전달받은 UUID를 사용한다. 웹 공통 API
클라이언트도 이 값을 보내므로 브라우저 오류 보고의 `relatedRequestId`와 API 로그를 연결할
수 있다. 비동기 작업에도 요청 컨텍스트를 전달해 인증, 게임, 채팅, 외부 JEV 호출 로그에 같은
`requestId`를 붙인다.

- `api.request`: 메서드, 라우트 템플릿, 상태 코드, 처리 시간, Content-Length 기반 요청·응답
  크기(헤더가 없으면 생략), 완료·중단 결과.
  한 요청에는 완료 로그를 한 번만 남기며 4xx·중단은 warn, 5xx는 error로 기록한다.
- `api.error`: 요청 ID, 오류 종류, 서버 오류의 메시지와 stack. 검증 실패에는 요청 본문을
  붙이지 않는다. 외부 알림 실패도 별도 이벤트로 남기고 전송 시간을 제한한다.
- `web.error`: 기존 브라우저 runtime·Promise rejection·React 오류와 서버/API 오류 보고.
- 인증·게임·채팅·JEV 이벤트: 처리 단계, 결과, 소요 시간, 검색 근거·합법 행동 개수 등
  고정된 진단 필드. 질문·답변 원문, 사용자 프로필과 토큰은 기록하지 않는다.

Winston의 최종 출력 단계에서 구조화된 이벤트를 JSON 필드로 변환하고 민감값을 가린다.
Authorization, 쿠키, 비밀번호, API 키, URL의 인증 정보·쿼리·해시 등을 가린다. 일반 URL
경로에도 개인정보를 넣지 않아야 한다. 로그 레벨·파일 회전·보존 기간은 기존 `LOG_LEVEL`
및 Winston 설정을 따른다.

```bash
rg '"requestId":"확인할-UUID"' apps/api/logs/combined-*.log
```

## 집계 기준

웹은 GA 설정과 별개로 `POST /usage/events`에 이벤트를 보낸다. 신규 migration
`1795000000001-create-usage-events` 적용 후 수집을 시작할 수 있다.

- 방문자: 브라우저 `localStorage`에 저장한 무작위 UUID. 로그인 계정이나 실제 사람 수와
  같지 않으며 브라우저·기기 변경, 저장소 삭제 시 달라진다.
- 세션: 탭의 `sessionStorage`에 저장한 UUID. 마지막 이벤트에서 30분 이상 지나면 새로
  만든다. 저장소가 차단되면 현재 문서의 메모리에서만 식별자를 유지한다.
- 시각: 서버가 수신한 시각을 저장하며 날짜 집계는 `Asia/Seoul`을 사용한다.
- 경로: 쿼리·해시를 제거한다. 공유·원두 ID와 블로그·이력서 상세 slug는 `:id` 또는
  `:slug`로 바꿔 저장한다. 상세 게시물별 인기 순위는 제공하지 않는다.

| 이벤트                          | 기록 시점                                               | 기능                             |
| ------------------------------- | ------------------------------------------------------- | -------------------------------- |
| `page_view`                     | 최초 표시와 경로 이동. 같은 effect의 재실행은 중복 제외 | 전체 화면                        |
| `chat_submitted`                | 질문 전송 시작                                          | `main_chat`, `resume_chat`       |
| `chat_completed`, `chat_failed` | 질문 처리 성공·실패                                     | `main_chat`, `resume_chat`       |
| `game_started`                  | Sky Drop 시작, Wordle 첫 유효 제출, JEV 매치 생성 성공  | `sky_drop`, `wordle`, `beat_jev` |
| `game_completed`                | 게임 종료. 복원한 완료 화면은 제외                      | `sky_drop`, `wordle`, `beat_jev` |
| `search_used`                   | 사이드바 검색어가 180ms debounce 후 반영                | `site_search`                    |
| `share_clicked`                 | 링크 복사 또는 네이티브 공유 완료                       | `share`                          |

이벤트에 질문·검색어·공유 문구·계정 정보·IP를 저장하지 않는다. 지원하는 이벤트와 기능의
조합만 받으며, 등록되지 않은 추가 필드와 잘못된 값은 400으로 거절한다. 브라우저 origin은
`CORS_ORIGINS`로 검사하고 수집 요청은 IP별 시간당 600회로 제한한다. 제한 저장소는 현재
API 프로세스 메모리이므로 여러 worker를 사용할 때 공유 저장소로 바꿔야 한다.

같은 `eventId`는 DB primary key로 한 번만 반영한다. 웹은 네트워크·5xx 실패에 같은 ID로 한 번
재시도하고 4xx는 재시도하지 않는다. 수집 실패는 사용자 기능을 중단하지 않는다. 오프라인
이벤트의 영구 큐, 봇 판별, 데이터 자동 삭제는 제공하지 않는다. 클라이언트가 보낸 익명 이벤트는
사용 경향을 보는 자료이며 과금·정산용 근거로 사용하지 않는다.

## 요약 조회

API 서버에 `USAGE_ANALYTICS_READ_KEY`를 32자 이상으로 설정한다. 웹의 `NEXT_PUBLIC_*`
환경 변수에는 넣지 않는다. 미설정 또는 너무 짧은 키는 조회 시 503, 잘못된 Bearer 키는 401이다.
조회 응답은 `Cache-Control: no-store`로 캐시를 막는다.

```bash
curl --fail --get "${API_URL}/usage/summary" \
  -H "Authorization: Bearer ${USAGE_ANALYTICS_READ_KEY}" \
  --data-urlencode 'from=2026-10-01' \
  --data-urlencode 'to=2026-10-16'
```

`from`은 포함, `to`는 제외하는 한국 날짜이며 최대 93일을 조회한다. 위 예시는 10월 1일부터
15일까지다. 기존 API 응답 래퍼의 `data`에 전체 이벤트·고유 방문자·세션·페이지 조회 수와
날짜별·경로별·기능별·이벤트별 집계를 반환한다. 고유 방문자와 세션 총계는 전체 기간에 걸쳐
중복을 제거한다. 날짜별 고유 수를 합산한 값이 아니다. 원본 식별자는 조회 응답에 포함하지
않는다. 그룹별 결과는 상위 100개이며 이벤트가 없는 날짜는 일별 목록에 나타나지 않는다.

## 검증

```bash
pnpm --filter @vscoke/api exec jest --runInBand
pnpm --filter @vscoke/api test:e2e api-logging api-contract usage
pnpm --filter @vscoke/web exec tsx --test src/lib/usage-analytics.spec.ts
pnpm --filter @vscoke/web e2e tests/e2e/usage-analytics.spec.ts --project=chromium
pnpm check:api-contract
```

PostgreSQL 통합 테스트에는 운영 DB와 분리한 `TEST_DATABASE_URL`과 `_test` suffix DB가 필요하다.
운영 migration·환경 변수 설정과 배포는 코드 검증과 별도로 수행한다.
