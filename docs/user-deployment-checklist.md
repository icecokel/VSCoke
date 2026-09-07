# 사용자 배포 후속 작업

확인 기준일: 2026-09-07

이 문서는 저장소 밖에서 사용자가 직접 처리해야 하는 미완료 작업만 추적한다. 설정값과 실행
절차는 [Deployment and Environment Plan](./deployment-and-env.md), 장애 대응은
[Operations Runbook](./operations-runbook.md)을 따른다.

## Web과 외부 서비스

- [ ] `vscoke.vercel.app`이 같은 경로의 `vscoke.icecoke.kr`로 영구 이동하는지 확인한다.
- [ ] Google OAuth 승인 redirect URI에 운영 callback을 등록하고 로그인 진입을 점검한다.
- [ ] GA4 웹 데이터 스트림의 기본 URL을 운영 도메인으로 변경한다.
- [ ] Search Console에 운영 `sitemap.xml`을 제출한다.
- [ ] Wanted 프로필의 이력서 링크를 운영 README URL로 변경한다.
- [ ] 운영 Web의 API 호출과 CORS 성공을 확인한다.

## API 운영

- [ ] 운영 `.env`의 `CORS_ORIGINS`, `RAG_PUBLIC_CHAT_ORIGINS`가 운영 Web을 허용하는지 확인한다.
- [ ] 운영 에러 알림 사용 여부를 결정하고 관련 세 변수를 모두 설정하거나 모두 비운다.

## 벡터 검색·저장 대화 운영 반영

아래 항목은 2026-09-07에 추가한 운영 미완료 작업이다. 코드 구현/로컬 테스트 완료와 운영 적용을
구분한다. 이전 Web·외부 서비스 항목의 완료 여부를 이번에 새로 확인한 것은 아니다.
상세 실행 순서, 중단 조건, 실제 DB 조회, 승인 기준은
[메인 채팅·이력 질문 AI 사용 지침 9절](./main-chat-ai-usage-guide.md#9-배포-적용-절차)을 따른다.

- [ ] RAG-01: API/웹 기능 SHA와 DB → API → 웹 순서를 확정하고 자동 production 승격을 통제한다.
- [ ] RAG-02: 임베딩 공급자·모델·차원·비용 한도와 외부 전송할 공개 원본을 승인한다.
- [ ] RAG-03: release 밖에 정비용 전체 checkout과 승인 원본/증빙 경로를 준비하고 명령별 DB 환경을 확인한다.
- [ ] RAG-04: 운영 백업을 만들고 격리된 DB에서 복원 및 신규 migration/제약을 검증한다.
- [ ] RAG-05: 실제 원본을 import하고 batch 실패 0, 누락/구버전/예상하지 못한 공개 자료가 없음을 확인한다.
- [ ] RAG-06: 승인된 외부 API로 인덱싱하고 현재 프로필의 원본·청크 수·해시·누락을 대조한다.
- [ ] RAG-07: 실제 vector 모드, hybrid 모드, 후속 질문, 주제 전환, 근거 부족/비공개 차단을 평가한다.
- [ ] RAG-08: 운영 migration 후 API를 선배포하고 대화 API·기존 API·CORS를 실제 검증한다.
- [ ] RAG-09: 웹을 배포하고 새로고침·재방문·API 재시작 후 복원, 새 대화 삭제를 확인한다.
- [ ] RAG-10: 지연/비용 감시, 익명 접근키·30일 만료·백업 보존·공개 철회 정책과 롤백 담당자를 확정한다.
- [ ] 인수인계: 테스트 대화/민감 산출물을 정리하고 승인 기록과 미완료 후속 이슈를 남긴다.

## 이전 API 저장소

- [ ] 이전 저장소에 monorepo의 `apps/api` 위치를 안내한다.
- [ ] 이전 저장소를 archive하고 read-only history 조회를 확인한다.
