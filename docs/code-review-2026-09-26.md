# 코드 레벨 리뷰 — 2026-09-26

- 기준 커밋: `3ddd9729eabfdc976bfdaa8491cfe2fb431706c0`
- 대상: 로컬 체크아웃의 웹/API 주요 실행 흐름. 특정 PR의 변경분 리뷰가 아니다.
- 검토 범위: 인증, 게임 점수·Wordle, 대화 저장·복원, 채팅 공급자, 검색, 공통 화면 상태,
  API 계약과 배포 설정.
- 결과: 격리 재현으로 확인한 P2 문제 4건. 같은 날 수정하고 회귀 검증했다.

전 파일을 빠짐없이 검증한 결과나 운영 장애 발생 기록은 아니다. 아래 코드 위치는 기준
커밋의 줄 번호이며, 수정 방향과 완료 조건은 후속 작업을 위한 제안이다.

## 발견 사항

| ID     | 우선순위 | 문제                                          | 상태      |
| ------ | -------- | --------------------------------------------- | --------- |
| REV-01 | P2       | 저장소 접근 실패가 공통 화면 오류로 전파됨    | 수정·검증 |
| REV-02 | P2       | Wordle 재시작 후 이전 응답이 새 게임을 변경함 | 수정·검증 |
| REV-03 | P2       | 토큰 만료 직전 자동 갱신이 건너뛰어짐         | 수정·검증 |
| REV-04 | P2       | 채팅 중간 메시지가 최종 답변에 합쳐짐         | 수정·검증 |

### REV-01. 저장소 접근 실패가 공통 화면 오류로 전파됨

**위치:** [history-context.tsx](../apps/web/src/contexts/history-context.tsx#L44),
44–63행. 적용 범위는 [로케일 layout](../apps/web/src/app/[locale]/layout.tsx#L81)이다.

초기 `localStorage.getItem`이 `try` 바깥에 있고, 저장 effect의 `setItem`과 오류 처리 중
`removeItem`에도 예외 처리가 없다. 저장소 접근이 차단되면 공통 Provider의 effect에서
예외가 전파된다. 초기 읽기 실패 시 `onTrue()`에도 도달하지 못해 hydration 완료 상태가
설정되지 않는다.

**재현:** 저장소 대역의 `getItem`이 `SecurityError`를 던지도록 설정하고 실제 Provider의
초기 effect를 호출했다. 예외가 호출부까지 전파되고 hydration이 완료되지 않음을 확인했다.
실제 브라우저 오류 화면은 이번 리뷰에서 확인하지 않았다.

**수정 방향:** 읽기·쓰기·삭제 실패를 처리하고, 저장소를 사용할 수 없어도 메모리 상태와
hydration 완료 처리는 유지한다.

**완료 조건:** 초기 읽기 차단과 저장 용량 초과 상황에서도 화면 탐색·탭 사용이 가능하고,
처리되지 않은 예외가 발생하지 않는다.

### REV-02. Wordle 재시작 후 이전 응답이 새 게임을 변경함

**위치:** [use-wordle.ts](../apps/web/src/hooks/use-wordle.ts#L100), 100–134행.
재시작 호출부는 [Wordle 페이지](../apps/web/src/app/[locale]/game/wordle/page.tsx#L100)다.

단어 검증을 기다리는 동안 헤더에서 재시작할 수 있다. `resetGame`은 화면 상태를
초기화하지만 진행 중인 검증을 무효화하지 않는다. 이전 `submitGuess`는 응답을 받은 뒤
이전 판의 `answer`와 `turn`으로 새 판의 승패·입력 기록·턴을 변경한다.

**재현:** 훅 상태와 비동기 응답을 제어하는 대역으로 다음 순서를 실행했다.

1. 정답이 `APPLE`인 판에서 `APPLE`을 제출하고 `checkWord` 응답을 보류한다.
2. 게임을 재시작하고 새 정답 `BREAD`의 로딩을 완료한다.
3. 이전 `checkWord`를 `true`로 완료한다.
4. 새 정답은 `BREAD`인데 `gameStatus === "won"`, `turn === 1`이 되는 것을 확인한다.

**수정 방향:** 게임 세대 또는 요청 식별자로 오래된 응답을 무시한다. 같은 훅의
`loadNewWord`도 응답 순서에 따라 정답을 덮어쓸 수 있으므로 함께 보호한다.

**완료 조건:** 검증 중 재시작 및 연속 재시작 시 이전 요청이 새 판의 정답·기록·승패·로딩
상태를 변경하지 않는다. 연속 단어 로딩의 응답 역전은 별도 회귀 검증이 필요하다.

### REV-03. 토큰 만료 직전 자동 갱신이 건너뛰어짐

**위치:** [auth.ts](../apps/web/src/auth.ts#L66), 66–69행.
관련 코드: [토큰 유효성 판정](../apps/web/src/lib/auth-token.ts#L31),
[점수 제출의 로그인 판정](../apps/web/src/components/game/result-screen.tsx#L98).

`jwt` 콜백은 access token의 실제 만료 시각까지 기존 토큰을 반환한다. 반면 `session`
콜백의 `isIdTokenUsable`은 ID token 만료 60초 전부터 사용할 수 없다고 판단한다. 두 토큰의
만료 시각이 같아도 마지막 60초 동안 갱신은 생략되고 세션에서는 ID token이 제거된다.
점수 제출 화면은 이 상태를 재로그인이 필요한 상태로 처리한다.

**재현:** 만료까지 30초 남은 access token·ID token과 refresh token을 가진 입력으로 실제
콜백을 실행했다. `jwt`는 입력 토큰을 그대로 반환했고, `session`은
`idToken: undefined`, `error: "IdTokenUnavailable"`을 반환했다. Google 서버는 호출하지 않았다.

**수정 방향:** ID token의 만료 버퍼와 갱신 시점을 일치시킨다. access token이 아직 유효해도
API 인증에 필요한 ID token을 사용할 수 없다면 갱신을 시도해야 한다.

**완료 조건:** 만료 60초 이내에 세션을 조회해도 정상 refresh token으로 갱신할 수 있다면
재로그인을 요구하지 않는다. 갱신 실패 시의 기존 인증 오류 처리는 유지한다.

### REV-04. 채팅 중간 메시지가 최종 답변에 합쳐짐

**위치:** [codex-app-server.provider.ts](../apps/api/src/resume-rag/ai/codex-app-server.provider.ts#L265),
265–273행 및 302행.

모든 `item/agentMessage/delta`를 항목 구분 없이 `answerText`에 누적하고,
`answerText || completedAgentText`로 반환한다. 중간 안내와 최종 답변이 서로 다른 메시지로
전달되어도 최종 완료 메시지보다 누적 문자열이 우선한다. 이 공급자의 결과는 사용자 답변,
대화 기록 및 후속 질문의 검색어 재작성에 사용된다.

**재현:** 가짜 WebSocket으로 중간 메시지 `자료를 확인하겠습니다. `와 최종 메시지
`최종 답변입니다.`의 delta·완료 이벤트를 순서대로 전달했다. 각 메시지에 별도 ID와
`commentary`/`final_answer` phase를 부여했지만 반환값은
`자료를 확인하겠습니다. 최종 답변입니다.`였다.

**수정 방향:** 최종 답변 항목을 식별하고 해당 항목의 완료 텍스트 또는 delta만 반환한다.
누적 delta가 존재한다는 이유로 최종 완료 텍스트를 무시하지 않는다.

**완료 조건:** 중간 메시지와 최종 메시지가 함께 발생해도 최종 답변만 반환한다. 실제 운영
공급자에서 이 이벤트 조합이 발생하는 빈도와 런타임 연동은 별도 확인이 필요하다.

## 검증 결과와 한계

아래 결과는 수정 전 코드 리뷰의 실행 결과다.

| 검증                | 실행 명령                                                         | 결과                    |
| ------------------- | ----------------------------------------------------------------- | ----------------------- |
| 웹 단위 테스트      | `pnpm test:web`                                                   | 72개 통과               |
| API 단위 테스트     | `pnpm --filter @vscoke/api exec jest --runInBand`                 | 47 suite, 269개 통과    |
| 웹/API 린트         | `pnpm lint`                                                       | 통과                    |
| 웹 타입 검사        | `pnpm --filter @vscoke/web exec tsc --noEmit --incremental false` | 통과                    |
| 생성 API 계약 일치  | `pnpm check:api-contract`                                         | 통과                    |
| 변경 공백 검사      | `git diff --check`                                                | 통과                    |
| 발견 사항 격리 재현 | 실제 소스를 변환·로딩한 Node stdin harness                        | 위 4건의 관찰 결과 확인 |

API 단위 테스트의 Jest 캐시와 계약 생성의 `TMPDIR`은 저장소 내부 임시 경로로 지정했다.
초기 `pnpm test:api --runInBand` 시도는 pnpm 옵션 오류로 실패해 위 `exec jest` 명령으로
다시 실행했다.

격리 재현에서는 React 훅·스토리지·인증 초기화·WebSocket 등을 대역으로 제어했다. 따라서
실제 브라우저 렌더링, Google 인증, 실모델 답변 품질을 검증한 결과로 해석하지 않는다.
재현 harness는 stdin으로 실행했으며 영구 회귀 테스트 파일로 추가하지 않았다. 임시 로그와
캐시도 리뷰 종료 시 정리했으므로 이 문서는 관찰 결과와 재현 절차를 보존한다.

이번 리뷰에서는 브라우저 E2E, PostgreSQL 통합 테스트, production build, 실제 Google 로그인,
운영 채팅 공급자 연동 및 배포 실행을 검증하지 않았다. 기존 테스트 통과가 위 네 경계 조건의
정상 동작을 보장하지는 않는다.

## 후속 작업

- [x] REV-01: 저장소 실패 처리와 공통 화면 회귀 검증
- [x] REV-02: 게임 재시작 시 오래된 응답 무효화와 응답 순서 회귀 검증
- [x] REV-03: 토큰 갱신 조건 정합성 확보와 만료 경계 회귀 검증
- [x] REV-04: 최종 메시지 선택과 여러 메시지 이벤트 회귀 검증

### 수정 및 검증 기록

- REV-01: 히스토리 저장소의 읽기·쓰기·삭제 실패를 처리해 메모리 탭 상태와 hydration을
  유지한다. `history-tabs.spec.ts`에서 전체 접근 차단과 쓰기 실패를 Chromium으로 검증했다.
- REV-02: Wordle 요청에 게임 세대를 적용해 재시작 전 단어 로딩·검증 응답을 무시한다.
  `hobby-games.spec.ts`에서 검증 응답 지연과 단어 로딩 응답 역전을 각각 검증했다.
- REV-03: access token뿐 아니라 ID token의 만료 여유 시간도 갱신 조건에 반영한다.
  `auth.spec.ts`에서 만료 직전 성공 갱신과 갱신 실패 오류를 검증했다.
- REV-04: Codex app-server의 `itemId`와 `phase`를 이용해 중간 메시지를 제외하고 최종
  답변을 반환한다. 로컬 Codex app-server 생성 타입에서 두 필드를 확인했고 공급자 단위
  테스트에서 여러 메시지 수신과 `phase` 미제공 호환 동작을 검증했다.

수정 후 `pnpm test:web` 74개, `pnpm test:api` 271개, 웹/API lint, 웹 타입 검사,
`pnpm build`, 관련 Chromium E2E 10개가 통과했다. API 계약은 변경하지 않았다. 실제
Google 인증 서버, 운영 Codex 공급자, PostgreSQL 통합 테스트 및 배포 결과는 이 로컬
검증에 포함되지 않는다.
