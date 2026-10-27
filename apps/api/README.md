# VSCoke API

`apps/api`는 VSCoke monorepo의 NestJS 백엔드 앱이다. 웹 앱(`apps/web`)이 사용하는 공개 API, 게임 점수/랭킹, 취미 데이터, 이력 RAG chat API를 제공한다.

## 기술 스택

- Node.js 24.22.1 (`.nvmrc`, 운영 이미지 `node:24.22.1-bookworm-slim`)
- NestJS 11
- TypeScript
- TypeORM + PostgreSQL
- Swagger UI `/api`, OpenAPI JSON `/api-json`
- Winston logging
- Google ID token 인증 guard

## 주요 모듈

| 모듈                 | 주요 endpoint                                                                                                                                                                                                                       |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App                  | `GET /`, `GET /health`                                                                                                                                                                                                              |
| Recipe               | `GET /recipes`, `GET /recipes/:id`                                                                                                                                                                                                  |
| EspressoHistory      | `GET /espresso-history/beans`, `GET /espresso-history/beans/:id`                                                                                                                                                                    |
| Game                 | `POST /game/result`, `GET /game/ranking`, `GET /game/result/:id`                                                                                                                                                                    |
| Main Chat            | `POST /main-chat`                                                                                                                                                                                                                   |
| Resume RAG           | `POST /resume-rag/chat`                                                                                                                                                                                                             |
| Resume               | `GET /resume`, `GET /resume/preview`, `GET /resume/details`, `GET /resume/details/:slug`                                                                                                                                            |
| Career management    | `GET /career-data`, `PUT /career-data`, `POST /career-data/facts/:id/publish`, `GET /resume-management/resumes`, `POST /resume-management/versions`, `PATCH /resume-management/resumes/:id`, `PUT /resume-management/details/:slug` |
| Resume conversations | `POST /resume-rag/conversations`, `GET /resume-rag/conversations/:id`, `DELETE /resume-rag/conversations/:id`                                                                                                                       |
| Wordle               | `GET /wordle/word`, `POST /wordle/check`                                                                                                                                                                                            |
| Beat Jev             | `GET /beat-jev/status`, `POST /beat-jev/matches`, `GET /beat-jev/matches/:id`, `POST /beat-jev/matches/:id/actions`, `POST /beat-jev/matches/:id/continue`, `POST /beat-jev/matches/:id/next`                                       |
| Observability        | `POST /client-errors`                                                                                                                                                                                                               |

사용 집계는 `POST /usage/events`, `GET /usage/summary`로 제공한다.
상세 로그 필드, 집계 기준과 조회 키 설정은
[운영 로그와 사용 집계](../../docs/observability-and-usage.md)를 따른다.

현재 위 표와 사용 집계는 HTTP operation 36개를 포함한다. Google 인증이 필요한 점수 저장과
익명 대화 접근키로 보호하는 대화 API는 다른 인증 경계다.

## 로컬 실행

설치, 환경 변수, 실행과 검증 명령은 [Local Development](../../docs/local-development.md#api만-실행)를
따른다. API 환경 변수의 실제 목록은 `.env.example`에서 확인한다.

## OpenAPI 계약

프론트 타입은 현재 커밋의 controller/DTO에서 생성한 로컬 OpenAPI 계약을 기준으로 한다. 갱신
절차는 [Local Development의 API 타입 갱신](../../docs/local-development.md#api-타입-갱신)을
따른다.

## DB와 migration

운영에서는 `DB_SYNCHRONIZE=false`를 유지하고 schema 변경은 TypeORM migration으로 반영한다.
생성, dry run, 운영 반영과 rollback은 [API 배포 가이드](DEPLOY.md#3-db-schema-변경)를 따른다.

랭킹 정책은 [Game Score Policy](../../docs/game-score-policy.md)를 따른다.

Resume RAG와 메인 채팅의 동작·환경 변수·검증 기준은
[메인 채팅 AI 사용 지침](../../docs/main-chat-ai-usage-guide.md)을 따른다.

공개 이력서는 `resumes`의 선택 key/locale과 현재 불변 `resume_versions`만 조회한다.
`GET /resume?resume=pe&locale=ko-KR`가 기본이며 미등록·비공개·철회 문서는 404다.
역사적 `resume_documents`와 파일에는 fallback하지 않는다. 기존 상세는 새 migration에서
private으로 유지하며, 실제 경력 등록과 문서 매핑은 resume 프로젝트가 관리 API로 수행한다.
운영 사전 조회에서 migration #1795000000003은 미적용이고 legacy 본문·상세 테이블도
없음을 확인했다. 해당 migration은 동일 legacy DDL만 생성하며 과거 업무 스냅샷을 import하거나
INSERT하지 않는다. 스냅샷 artifact와 기존 DB 데이터는 보존한다. 실제 경력·이력서 데이터
등록은 resume 프로젝트가 관리 API로 수행하며 migration에 자동 seed하지 않는다.

저장 계약과 합성 payload 예제는 [공통 경력 DB 계약](../../docs/shared-career-data-design.md)을 따른다.
모든 관리 조회·쓰기는 서버 전용 `CAREER_DATA_WRITE_KEY`(32자 이상) Bearer 인증을 요구하며
키 미설정은 503, 인증 실패는 401, stale revision/current·동명이내용 버전은 409다.
관리 JSON 본문은 2 MiB로 제한한다. 기본 공개 범위는 private이다.
같은 버전명·의미 있는 payload의 재요청은 기존 결과를 반환하며 과거 요청이 current를 되돌리지 않는다.
일반 원본 편집은 동결 문구를 재작성하지 않으며 명시적 철회는 관련 공개 조회·RAG를 차단한다.
배포 시 기존 `RAG_ALLOWED_SOURCE_TYPES`에도 `career_data`를 명시적으로 추가한다.
허용 목록에서 제외하면 canonical 이력서 RAG 원문을 검색하지 않는다.
새 원문은 즉시 키워드 검색 가능하고 임베딩은 기존 `resume:index`가 갱신한다.
벡터 저장은 관리 쓰기와 같은 transaction lock에서 최신 공개 조건을 재검사한다.

사용자가 승인한 앱 배포 전 사전 적재는 root가 백업·schema-only migration·loopback 임시 관리
API 실행을 맡고 resume 프로젝트가 데이터를 등록한다. 현재 운영 앱 배포·재시작은 별개다.
관리 쓰기는 기존 app_resume/resume_workspace 원문과 벡터 상태를 변경하지 않으며 철회는
career_data에만 적용한다. 새 reader는 대응 상세의 exact/#section legacy family를 현재
canonical 상세나 tombstone으로 제외한다. 앱 전환 전에는 기존 운영 앱의 소비 범위가 유지된다.

현재 이력서 채널은 선택한 현재 문서와 명시 발행한 공통 사실만 읽는다.
기존 파일 출처는 보존하지만 이력서 채널에는 자동 혼합하지 않는다. main의 아직 매핑하지 않은
상세 출처를 원본 철회와 완전히 연동했다고 보장하지 않으며, 출처별 등록·매핑은 resume 소유자의 후속 작업이다.

## 배포

운영은 `apps/api/Dockerfile`로 빌드한 이미지를 Mac mini의 Docker Compose(`docker-compose.yml`)로
실행한다. 배포 구조와 환경은 [Deployment and Environment Plan](../../docs/deployment-and-env.md),
실행 절차는 [DEPLOY.md](DEPLOY.md), 장애 대응은
[Operations Runbook](../../docs/operations-runbook.md)을 따른다.
