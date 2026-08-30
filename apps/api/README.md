# VSCoke API

`apps/api`는 VSCoke monorepo의 NestJS 백엔드 앱이다. 웹 앱(`apps/web`)이 사용하는 공개 API, 게임 점수/랭킹, 취미 데이터, 이력 RAG chat API를 제공한다.

## 기술 스택

- Node.js 20 이상
- NestJS 11
- TypeScript
- TypeORM + PostgreSQL
- Swagger UI `/api`, OpenAPI JSON `/api-json`
- Winston logging
- Google ID token 인증 guard

## 주요 모듈

| 모듈            | 주요 endpoint                                                    |
| --------------- | ---------------------------------------------------------------- |
| App             | `GET /`, `GET /health`                                           |
| Recipe          | `GET /recipes`, `GET /recipes/:id`                               |
| EspressoHistory | `GET /espresso-history/beans`, `GET /espresso-history/beans/:id` |
| Game            | `POST /game/result`, `GET /game/ranking`, `GET /game/result/:id` |
| Resume RAG      | `POST /resume-rag/chat`                                          |
| Wordle          | `GET /wordle/word`, `POST /wordle/check`                         |

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

## 배포

배포 구조와 환경은 [Deployment and Environment Plan](../../docs/deployment-and-env.md), 실행 절차는
[DEPLOY.md](DEPLOY.md), 장애 대응은 [Operations Runbook](../../docs/operations-runbook.md)을 따른다.
