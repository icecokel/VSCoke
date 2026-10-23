# 메인 채팅·이력 질문 AI 사용 지침

확인 기준일: 2026-10-23

이 문서는 채팅 구조, 검색·저장 정책과 운영 시 주의사항을 설명한다. 실행·복구 기준은
[6절](#6-배포와-검증)과 [API 배포 가이드](../apps/api/DEPLOY.md)를 따른다.

## 1. 범위와 구조

채팅은 다음 두 기능으로 정의한다. README의 질문 입력과 `/resume/question`은 같은 이력서
채팅의 진입점이며 별도 채널이 아니다. 웹은 NestJS API만 호출한다.

| 채팅              | 진입점 / API                                            | 검색 자료                                                                    |
| ----------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 메인 (`main`)     | `/` / `POST /main-chat`                                 | 공개 프로젝트 상세(`public_resume_detail`), 사이트 안내(`public_site_guide`) |
| 이력서 (`resume`) | `/readme`, `/resume/question` / `POST /resume-rag/chat` | 프로필·이력 데이터와 번역, 공개 최종 이력서·경력 원문 근거                   |

`apps/api/src/resume-rag/chat-definition.ts`에서 채팅별 자료 종류와 안내 주제를 정의한다.
두 API는 `ResumeRagService`의 인사 처리 → 후속 질문 재작성 → 검색 → 근거 기반 답변 흐름을
공유한다. 기존 API와 DB 이름은 호환성을 위해 유지한다.

채널은 서버 endpoint가 결정한다. 클라이언트가 검색 범위를 지정하거나 다른 채널의 대화를
사용할 수 없다. 키워드·벡터·hybrid 검색 모두 최신 원본의 `itemType`과 채널별 `sourceType`을
제한한다. `RAG_ALLOWED_SOURCE_TYPES`는 전체 허용 목록이며 채널 범위와 교집합으로 적용한다.
근거가 없거나 특정 채널 자료가 비어 있어도 다른 채널 자료로 대체하지 않는다.

메인 자료는 `app_resume`의 프로젝트 상세와 `docs/public-site-guide.md`, 이력서 자료는
`app_resume`의 프로필·이력과 허용된 `resume_workspace`의 공개 경력 자료다. 기존 자료는
마이그레이션이나 재임베딩 없이 분리된다. 새 사이트 안내는 API 빌드 후 기존 `resume:import`로
가져오고 `resume:index`로 인덱싱한다. 운영 반영 전까지 새 사이트 안내는 검색되지 않는다.

```text
브라우저의 대화 ID + 비밀 접근키 + 현재 질문 + 요청 ID
→ 대화 접근 검증 / 이전 턴 조회
→ 후속 질문을 독립적인 검색 질문으로 재작성
→ 키워드 검색 + pgvector 의미 검색
→ RRF 순위 결합 / 중복 근거 제거
→ 현재 공개 근거 + 제한된 대화 기록으로 답변 생성
→ 질문·답변 저장 후 응답
```

두 채팅의 인사·감사·도움말은 같은 판별 로직으로 처리하고 채팅별 안내 주제를 반환한다. 이 응답도 저장 대화에서는 기록한다.
그 외 후속 질문은 검색 질문 재작성과 최종 답변 생성에 각각 AI를 사용할 수 있다.

## 2. 검색과 인덱싱

`RAG_RETRIEVAL_MODE`의 기본값은 `hybrid`다. `keyword`는 기존 텍스트 검색만 사용하고,
`vector`는 벡터 검색만 사용한다. hybrid의 임베딩 오류는 서버에 경고를 기록하고 키워드 검색으로
대체한다. vector 모드에서는 오류를 숨기지 않고 503으로 반환한다. 벡터가 아직 없으면 hybrid는
키워드 결과를 사용한다. 이는 벡터 준비 완료를 뜻하지 않으므로 인덱스 상태를 별도로 확인한다.

키워드 검색은 `resume_source_items`, 의미 검색은 `resume_vector_chunks`를 사용한다.
모두 최신의 active/public/vectorize 자료만 허용한다. 벡터 검색은 원본 테이블과 JOIN하고,
임베딩 provider/model/dimensions 및 chunkerVersion/chunkConfigHash가 일치하는 청크만 검색한다.
서로 다른 차원의 벡터를 비교하지 않도록 eligible CTE를 먼저 materialize한다.
요청 locale과 같은 언어 또는 locale이 없는 원본만 검색한다. 다국어 임베딩을 사용해도
다른 locale의 자료가 자동으로 포함되는 것은 아니다.

코사인 점수 기준은 `RAG_VECTOR_MIN_SIMILARITY`(초기값 0.3), 키워드 기준은 기존
`RAG_MIN_SIMILARITY`(0.1)다. 두 값을 동일한 신뢰도로 취급하지 않는다. 검색 결과는
RRF로 합치고 sourceKey별 중복을 제거한 뒤 `RAG_TOP_K`(5)개를 선택한다. 수치는 실제
질문 평가로 조정하며 사용자에게 정확도 백분율로 표시하지 않는다.

인덱서는 공개 활성 자료만 외부 임베딩에 전달한다. 동일한 콘텐츠와 임베딩 프로필은 재사용한다.
청크 설정 해시에는 chunkSize와 chunkOverlap만 포함하고 API 키·채팅 모델은 포함하지 않는다.
모든 청크가 준비된 뒤 트랜잭션으로 한 원본의 해당 프로필을 교체한다. 그동안 원본이 수정되거나
비공개로 바뀌면 게시하지 않는다. import 성공 시 같은 파일의 이전 내용과 제거된 섹션은
superseded 처리한다. CLI는 `retireMissingSourceTypes: ['app_resume']`를 사용하므로
manifest에서 빠진 공개 앱 원본도 자동 비활성화한다. 단, 해당 배치에 import 실패가 없어야
하고 관리 중인 sourceType의 manifest가 비어 있지 않아야 한다. 전체 누락을 실수로 삭제하지
않기 위한 보호다. `resume_workspace` 전체나 이 조건 밖의 제거는 운영자가 별도로 검토한다.
`RESUME_WORKSPACE_ROOT`가 비어 있으면 공개 앱 자료만 처리한다. 외부 작업공간을 명시해도
승인된 public 항목만 사용하며, 개인 작업공간 전체를 운영 릴리스에 복사하지 않는다.

인덱싱은 전체 작업을 하나의 트랜잭션으로 처리하지 않는다. 실패 전에 완료한 원본의 변경은
남을 수 있으며, 검색 대상에서 벗어난 벡터는 모든 프로필에서 정리한다. import와 index를
동시에 실행하지 않는다. summary의 청크 수만으로 최종 저장량을 판단하지 말고 현재 프로필의
예상 청크 수·contentHash·chunkIndex를 DB와 대조한다. 원본당 벡터 한 개로 완전성을 보장하지 않는다.

### 서버 내부 임베딩

운영 임베딩은 서버 CPU의 `local-e5-q8` 공급자를 사용한다. 질문·이력 본문은 임베딩 외부 API에
전송하지 않고 모델 파일만 공개 저장소에서 사전 다운로드한다. 답변 생성은 Codex 공급자를 사용한다.

```dotenv
RAG_RETRIEVAL_MODE=hybrid
RAG_EMBEDDING_PROVIDER=local-e5-q8
RAG_EMBEDDING_MODEL=Xenova/multilingual-e5-small@761b726dd34fb83930e26aab4e9ac3899aa1fa78
RAG_EMBEDDING_DIMENSIONS=384
RAG_LOCAL_EMBEDDING_CACHE_DIR=/app/.cache/embeddings
RAG_LOCAL_EMBEDDING_LOCAL_FILES_ONLY=true
RAG_VECTOR_MIN_SIMILARITY=0.85
RAG_CHUNK_SIZE=600
RAG_CHUNK_OVERLAP=80
```

E5의 query/passage 접두사, mean pooling, 정규화와 q8 정밀도를 고정한다. 모델은
`repository@commit`으로 revision을 고정하며 다른 모델 공간의 벡터를 섞지 않는다. 최초 모델
준비 때만 local-files-only를 false로 사용하고 이후 true로 유지한다. 캐시는 릴리스 밖에 둔다.
CPU 연산은 직렬화하고 ONNX intra-op thread는 2개로 제한한다. 청크 크기를 바꾸면 실제
토큰 수가 E5의 512토큰 한도를 넘지 않는지 확인한다. 0.85는 운영 초기 기준이며 정확도 보증이 아니다.

OpenAI 호환 임베딩을 선택하면 `RAG_AI_BASE_URL/API_KEY`를 호환 채팅 공급자와 공유한다.
두 호환 공급자를 함께 사용할 때 이 설정 제약을 확인하고, 임베딩 키를 `NEXT_PUBLIC_*`에 넣지 않는다.

## 3. 저장 대화 API와 접근 제어

| API                                   | 역할                                               |
| ------------------------------------- | -------------------------------------------------- |
| POST /resume-rag/conversations        | channel(main/resume), locale로 대화 생성           |
| GET /resume-rag/conversations/:id     | 최근 대화 복원                                     |
| DELETE /resume-rag/conversations/:id  | 대화 및 질문·답변 삭제                             |
| POST /main-chat 또는 /resume-rag/chat | conversationId, requestId, question, locale로 질문 |

생성 응답의 256비트 무작위 token은 클라이언트에 한 번만 반환하고 서버에는 SHA-256 해시만
저장한다. 이후 `X-Resume-Conversation-Token` 헤더로 전송한다. URL·분석 이벤트에 접근키를
넣지 않는다. Origin 가드는 추가 제한이며 대화 접근 인증을 대체하지 않는다.
접근키 불일치, 만료, 채널·언어 불일치는 404로 처리한다. 대화 생성·복원·삭제는 IP당 시간당
120회, 질문은 기존 메인 30회 / 이력서 20회 제한을 유지한다. 응답에는 no-store를 적용한다.

웹은 channel과 locale별 대화 접근 정보를 localStorage에 저장한다. 따라서 같은 브라우저에서
새로고침·재방문 시 복원되지만 기기 간 동기화는 제공하지 않는다. 저장소가 차단되면 열린 화면의
메모리로만 이어가며 복원 불가 안내를 표시한다. 복원 API가 실패하면 맥락 없이 질문을 보내지
않고 재시도 또는 새 대화를 안내한다. 기존 README 답변 보기용 sessionStorage 스냅샷은 화면
복원 호환용일 뿐이며 서버의 사실 근거나 대화 맥락으로 신뢰하지 않는다.
localStorage의 접근키는 같은 origin의 script가 읽을 수 있다. 브라우저 저장소를 지우면
익명 접근키를 잃으며, 이는 서버 대화 삭제와 다르다. 접근키는 URL·콘솔·스크린샷·trace에 남기지 않는다.

보존 중인 같은 requestId 재시도는 기존 답변을 반환한다. 동일 ID에 다른 질문은 409다. 모델 생성 중 DB
잠금을 유지하지 않고 저장 직전에 대화 버전을 비교한다. 다른 요청이 먼저 저장되었으면
오래된 맥락의 답변을 저장하지 않고 409로 재시도를 요구한다. AI 실패는 턴을 저장하지 않는다.
중복 저장 방지는 해당 턴의 보존 기간에만 적용된다. 동시 재시도는 모델 호출을 각각 실행할 수
있으므로 저장 idempotency가 모델 비용의 중복까지 막는 것은 아니다.

## 4. 보존과 삭제

대화는 생성 시점부터 30일 후 만료된다. 만료 즉시 접근이 차단되며 API의 시간당 정리 작업 또는
새 대화 생성 시 물리적으로 삭제된다. 한 대화에는 최근 50개 질문·답변 쌍만 남긴다.
화면의 새 대화 버튼은 확인 후 기존 대화를 서버에서 삭제하고 접근 정보를 초기화한다.
질문과 답변의 이메일·전화번호·일부 자격증명 패턴은 기존 마스킹 함수를 적용한다. 패턴 기반
마스킹이 모든 개인정보를 제거하는 것은 아니므로 민감한 정보를 입력하지 말라는 안내를 유지한다.
저장 대화는 보존 기간이 다른 기존 질문 로그에 중복 기록하지 않는다.

AI에 전달하는 대화는 최근 6개 턴, 총 12,000자 이하로 제한한다. 질문은 턴당 1,000자,
이전 답변은 4,000자까지 사용한다. 검색 근거는 항목당 4,000자, 전체 16,000자로 제한한다.
이 값들은 현재 코드 상수이며 환경 변수로 변경하는 옵션은 없다.
이 제한은 문자 기준이며 모델별 정확한 토큰 수 계산은 아니다. 6턴보다 오래된 내용 전체를
계속 기억한다고 보장하지 않는다.

자료 공개 철회와 기존 대화 삭제는 별개다. 저장 답변과 sources는 복원 시 현재 원본의 공개
상태로 다시 필터링하지 않는다. 철회한 자료의 기존 답변도 지워야 한다면 관련 대화를 별도로
정리한다. 서버에서 삭제한 기록이 백업에서 즉시 제거되는 것은 아니므로 백업의 접근 권한과
보존 정책도 관리한다. README의 legacy sessionStorage 스냅샷은 서버 대화와 별도 수명이며,
새 대화 버튼이 모든 과거 스냅샷을 지우지는 않는다.

## 5. 답변 생성 경계

이전 대화는 지시 대상과 검색 질문을 해석하는 용도로만 사용한다. 경력 사실은 반드시 이번
요청에서 검색한 공개 자료를 근거로 한다. 이전 assistant의 문장이 새 사실의 증거가 되어서는
안 된다. 질문·대화·문서에 포함된 명령을 시스템 지시로 취급하지 않는다. 검색 근거가 없으면
최종 답변 생성기를 호출하지 않고 기존 근거 부족 답변을 반환한다. 후속 검색 질문 재작성은
이 단계 이전에 이미 호출되었을 수 있다.

Codex app-server는 기존처럼 ephemeral/read-only/networkAccess:false 스레드를 사용한다.
스레드 자체를 영구 세션으로 만들지 않고 API가 DB의 허용된 맥락을 전달한다. 모델은
`RAG_CHAT_MODEL`, 추론 강도는 `RAG_CODEX_REASONING_EFFORT`를 따른다.
OpenAI 호환 공급자도 동일한 질문 재작성·근거 제한 프롬프트를 사용한다.
read-only 설정과 프롬프트의 도구 금지만으로 비공개 파일 읽기까지 차단된다고 가정하지 않는다.
Codex 작업 경로에 민감한 파일을 두지 않고 접근 경계를 별도로 관리한다.

`grounded`는 현재 검색 근거와 생성 성공 여부를 나타내는 기존 계약이다. 문장별 사실 검증이
완료되었다는 뜻은 아니며 sources는 답변에 전달한 자료 목록이다. 문장별 출처 검증은 별도 과제다.

## 6. 배포와 검증

### 현재 운영 배포

신규 DB schema는 [API 배포 가이드](../apps/api/DEPLOY.md#3-db-schema-변경)에 따라 먼저
백업·migration을 수행한다. 자동 workflow는 공개 웹 원본을 포함하고 import를 실행하며,
keyword 모드가 아니고 임베딩 공급자가 설정된 경우 index를 갱신한다. 실패하면 API 재시작
단계로 진행하지 않는다. 운영 릴리스에 개인 작업공간을 복사하지 않는다.

임베딩 공급자가 없으면 hybrid는 키워드로 대체되므로 성공 답변만으로 벡터 준비를 판단하지
않는다. 실제 임베딩·DB 환경에서 동의어 질문, 후속 질문, 공개 범위와 최신 자료를 확인한다.
소스 파일 삭제 시 app_resume 자동 폐기 조건은 2절을 따른다.

`migration:run`은 대기 중인 모든 migration을 적용하므로 먼저 전체 목록과 연결 DB를 확인한다.
백업 archive 목록 확인은 실제 복원 리허설을 대신하지 않는다. 대화 migration의 down은
대화·턴 테이블을 삭제하므로 기록이 있는 운영에서 기본 롤백 수단으로 사용하지 않는다.
벡터 장애는 검증된 `keyword` 모드로 전환할 수 있지만 대화 저장과 후속 질문 AI는 계속 실행된다.
환경 변경은 [API 배포 가이드](../apps/api/DEPLOY.md#2-환경-변수-배포-github-secret)의 Secret
반영 절차를 따르고, 코드 롤백은 호환 웹을 먼저 복원한 뒤 API를 되돌리는 순서를 검토한다.

### 로컬 API 연결

로컬 API 환경 파일과 DB 준비는 [Local Development](./local-development.md#api만-실행)를
따른다. `RAG_CHAT_PROVIDER`와 선택한 공급자의 설정을 `apps/api/.env.example`에서 확인한다.
Codex 경로는 기존 loopback listener와 승인된 작업 경로를 사용하며 새 외부 listener를 열지
않는다. 일반 API 테스트는 공급자를 모킹하고 별도 테스트 DB를 사용한다.

웹의 `NEXT_PUBLIC_API_URL`을 해당 로컬 API로 맞춘다. 실제 웹 origin을
`CORS_ORIGINS`와 `RAG_PUBLIC_CHAT_ORIGINS` 양쪽에 명시한다. 임의로 운영 DB를 테스트
DB처럼 초기화하거나 공개 원본 import/index를 운영에 실행하지 않는다.

일반 DataSource는 `process.cwd()/.env`를 읽고 `pnpm --filter @vscoke/api`는 API 디렉터리에서
실행된다. release 루트의 `.env`가 자동 적용된다고 가정하지 않는다. 일반 migration과
import/index는 `TEST_DATABASE_URL`만으로 테스트 DB를 선택하지 않으므로 실제 `DB_*`를 확인한다.
`node --env-file`로 파일을 지정해도 기존 프로세스 환경 변수가 우선한다.

### 검증 종류와 명령

`pnpm check:api-contract`는 생성물 일치, `pnpm test:tooling`은 배포 보존·health 패키징·CLI
옵션 전달을 검증한다. `resume-conversation-persistence.spec.ts`는 mock API 기반 UI 검증이며
실모델 품질 보장은 아니다. API의 `resume-conversation.integration-spec.ts`는 실제 PostgreSQL
저장·접근키·동시성·삭제·보존을 검증한다. 운영 smoke 세트에는 후속 질문·복원·삭제 및 테스트
대화 정리가 포함되어 있으나 모든 언어·모든 생성 결과를 평가하는 것은 아니다.

Codex app-server listener는 loopback에 둔다. 서버·모델 변경은 별도 운영 결정이며 transport
지원 범위와 버전 고정 정책을 유지한다.

첫 질문과 후속 질문의 지연은 구분한다. 후속 질문은 검색 질문 재작성과 답변 생성에 AI를
각각 사용할 수 있다. 공급자 timeout은 전체 HTTP 요청 deadline이 아니며, hybrid는 양쪽
검색이 끝날 때까지 기다리므로 임베딩 지연 동안 키워드 결과도 즉시 반환하지 않는다.
요청 ID·단계·지연·프로필로 원인을 좁히되 질문·대화 원문과 접근키·API 키는 로그에 남기지 않는다.
rate limit은 프로세스 메모리 기반이므로 여러 인스턴스에서 공유되는 전역 제한으로 간주하지 않는다.

## 7. 분석과 기존 질문 로그

이력 질문 화면은 다음 `dataLayer` 이벤트를 사용한다.

| 이벤트                                | 발생 시점                          |
| ------------------------------------- | ---------------------------------- |
| `resume_readme_viewed`                | README 이력 페이지 진입            |
| `resume_chat_page_viewed`             | 이력 질문 페이지 진입              |
| `resume_rag_chat_composer_focused`    | 질문 입력창 첫 focus               |
| `resume_rag_chat_opened`              | 모바일 README에서 질문 페이지 열기 |
| `resume_rag_chat_topic_expanded`      | 추천 질문 주제 펼치기              |
| `resume_rag_chat_suggestion_selected` | 추천 질문 선택                     |
| `resume_rag_chat_submitted`           | 질문 API 전송                      |
| `resume_rag_chat_completed`           | 답변 수신                          |
| `resume_rag_chat_failed`              | API 또는 응답 계약 실패            |
| `resume_rag_chat_answer_viewed`       | README에서 준비한 답변 보기        |

공통 parameter는 `chat_entry_point`, `chat_locale`, `chat_keyword`, `chat_question_length`다. 완료
이벤트에는 `chat_evidence`, `chat_source_count`, 실패 이벤트에는 `chat_failure_reason`, 추천 주제
이벤트에는 `chat_topic_index`를 추가한다. 질문 원문, IP 주소와 계정 식별자는 보내지 않는다.

GTM에서는 이벤트별 Custom Event trigger와 같은 이름의 GA4 Event 태그를 만들고 Data Layer
Variable을 parameter로 매핑한다. `chat_keyword`, `chat_entry_point`, `chat_evidence`,
`chat_failure_reason`은 event-scoped custom dimension으로 등록한다. `NEXT_PUBLIC_GTM_ID` 없이
GA만 연결하면 같은 이벤트를 `gtag`로 보내고, GA와 GTM을 함께 설정하면 GTM 경로만 사용한다.

새 키워드는 `resume-rag-chat-analytics.ts`의 허용 목록에 정규화 값과 matcher를 추가한다. 점검
모드에서 차단된 요청은 전송·완료·실패 이벤트를 만들지 않는다.

`resume_rag_chat_logs`는 conversationId 없는 기존 단일 턴 이력 질문만 기록한다. 저장 대화 요청은 이 로그에 중복 기록하지 않고, 삭제·보존 정책이 적용되는 resume_chat_turns에만 저장한다. 이메일,
전화번호, Bearer/API key·token·secret은 마스킹하고 동일한 마스킹 결과의 반복 수는
`questionHash`로 집계한다. 메인 채팅 질문은 이 로그에 저장하지 않는다.

최근 질문은 다음 조회로 확인한다.

```sql
SELECT "createdAt", "locale", "questionText"
FROM "resume_rag_chat_logs"
ORDER BY "createdAt" DESC
LIMIT 100;
```

## 8. 구현과 회귀 검사

- 대화 저장/접근: resume-conversation.service.ts, resume-conversation.controller.ts
- 검색: resume-rag-retriever.service.ts, indexing/resume-vector-indexer.service.ts
- 맥락·프롬프트: resume-chat-history.ts, ai/resume-chat-prompt.ts
- 웹 복원: use-resume-conversation.ts, resume-conversation-client.ts
- 회귀: resume-conversation.service.spec.ts, resume-vector-search.spec.ts,
  resume-vector-indexer.service.spec.ts, resume-conversation-persistence.spec.ts

DTO를 변경하면 pnpm generate:types 및 pnpm check:api-contract를 실행한다.
실제 생성 품질은 mock 기반 회귀 테스트와 구분해 평가한다.
