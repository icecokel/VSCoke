---
trigger: always_on
---

# Browser Test Guide

실행 기준은 [Playwright CLI 테스트 흐름 스펙](../../docs/playwright-cli-test-spec.md)이다.
기본 실행은 `pnpm e2e` 또는 해당 기능의 focused spec이며 러너가 포트·산출물을 격리한다.
반복 검증 서버 `pnpm e2e:server`의 기본 포트는 37123이다.

다른 Node 프로세스를 포트 번호만으로 종료하지 않는다. 충돌하면 사용 가능한 별도
`PLAYWRIGHT_PORT`를 사용한다. 종료 시 자신이 시작한 서버·자식 프로세스만 정리하고,
외부 서버 재사용 시 그 서버를 종료하지 않는다. 브라우저·spec 선택은 실행 목록으로 확인한다.
