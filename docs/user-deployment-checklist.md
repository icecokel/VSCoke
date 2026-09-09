# 사용자 배포 후속 작업

확인 기준일: 2026-09-08

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

2026-09-07 23:07 KST 기준. 기능 커밋 `73a1f14`의 API/Vercel 운영 배포와 실모델 검증을
완료했다. 최초 계획은 AI 지침 9절, 실제 실행 결과와 잔여 제약은
[10절 운영 반영 기록](./main-chat-ai-usage-guide.md#10-2026-09-07-후속-운영-반영)을 따른다.

- [x] 운영 DB/환경 설정 백업과 신규 대화 migration 적용.
- [x] 임베딩 외부 유료 키 없이 서버 CPU의 고정 revision 다국어 E5 구성.
- [x] 공개 앱 이력 자료 패키징·import·index를 배포 workflow에 연결.
- [x] 공개 자료 import 실패 0, 최종 원본 175개/벡터 419개 해시·수량 대조.
- [x] 실제 벡터 검색의 기본 관련 질문/무관 질문 점검.
- [x] 실제 DB의 접근키·locale·idempotency·동시성·CASCADE·보존 상한·만료 검증.
- [x] GitHub Actions API 배포와 Vercel production 배포 성공.
- [x] 실제 API 재시작 후 기록 복원·후속 질문·HTTP 재시도 검증.
- [x] 메인/이력서 운영 브라우저의 후속 질문·새로고침·삭제 검증 및 테스트 대화 정리.
- [ ] 별도 테스트 DB를 준비해 전체 백업 복원 리허설 수행.
- [ ] 전체 평가셋·다국어·다중 브라우저 실모델 품질 평가 확대.
- [ ] 장기 요약·문장별 근거 검증·추가 보안/보존 정책 검토는 별도 후속 이슈로 진행.

### 2026-09-08 개발 검증 보완

중단됐던 대화 저장 PostgreSQL 통합 검증, migration 파일 선택, API 문서 테스트와
초기 입력 안정화 작업을 마무리했다. 실제 DB 테스트와 Chromium·WebKit 회귀 결과는
[AI 지침 11절](./main-chat-ai-usage-guide.md#11-2026-09-08-중단-작업-복구와-회귀-검증)에 기록했다.
이 절의 완료·미배포 여부는 2026-09-08 기록 시점의 결과다. 현재 배포 상태는 실제 배포 SHA로
확인하며, 아래 검증 수치나 코드 병합만으로 실모델 평가·백업 복원 과제를 완료로 바꾸지 않는다.

## 이전 API 저장소

- [ ] 이전 저장소에 monorepo의 `apps/api` 위치를 안내한다.
- [ ] 이전 저장소를 archive하고 read-only history 조회를 확인한다.
