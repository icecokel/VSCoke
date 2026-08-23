# 사용자 배포 후속 작업

확인 기준일: 2026-08-20

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

## 이전 API 저장소

- [ ] 이전 저장소에 monorepo의 `apps/api` 위치를 안내한다.
- [ ] 이전 저장소를 archive하고 read-only history 조회를 확인한다.
