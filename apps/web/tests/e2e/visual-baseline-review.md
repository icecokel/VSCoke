# 시각 회귀 기준 검토 — 이슈 #68

## 범위와 재현 환경

- 검토 기준: `72a338687dd4f2f2c32eccc32966fdb3e7e20418`.
- `gh issue view 68`과 `git log --oneline 693aba41..HEAD`를 확인했다.
- `rg -n toHaveScreenshot apps/web/tests/e2e` 결과, 이미지 비교는
  `visual-regression.spec.ts`의 26개 테스트, 29개 PNG에만 있다.
- 지정된 `mobile-behavior`, `blog-reading-tools`, `blog-benchmark-touch`, `hobby-games`,
  `resume-conversation-persistence`에는 이미지 비교가 없다. 일부 `page.screenshot`은
  관찰용 산출물이며 기준 이미지와 비교하지 않는다.
- Chromium 데스크톱 프로젝트가 각 테스트에서 모바일·태블릿·가로 viewport도 설정한다.
  별도 모바일 프로젝트에는 이 시각 spec이 등록되어 있지 않다.
- 모든 E2E는 포트 `37205`, worker 1, 자동 기동한 로컬 fixture API를 사용했다.
  운영 서비스, DB, 다른 작업의 서버는 사용하지 않았다.
- 실행 환경: macOS, Node `v26.7.0`, pnpm `9.12.0`. Node 요구 버전은 24이므로
  engine 경고가 발생했다. 의존성이나 실행 환경은 변경하지 않았다.

## 실패 분류와 이미지 검토

초기 6개 spec 실행은 141개 중 101개 통과, 18개 실패, 22개 미실행이었다.
시각 spec은 9개 통과, 17개 실패였다. 홈은 삭제된 `home-hero`를 기다리다 실패(B)했고,
나머지는 expected/actual/diff PNG를 모두 직접 확인했다.

홈 준비 조건 수정 후 스냅샷을 갱신하지 않고 시각 spec을 다시 실행했다.
Sky Drop의 ready 검사를 soft assertion으로 바꿔 같은 테스트의 playing diff도 수집했다.
이 실행에서도 9개 통과, 17개 실패였으며, 홈의 새 이미지 차이는 기존 메인 채팅 개편(A)이었다.
비교한 차이는 총 19개 PNG였다.
벤치마크 준비 조건을 바꾼 2개를 제외한 기존 actual 14개는 초기 실행과 바이트까지 같았다.

아래 파일은 모두 `apps/web/tests/e2e/visual-regression.spec.ts-snapshots/` 기준이다.
A는 기존 제품 변경, B는 준비 조건 문제이며, C로 분류한 실제 시각 회귀는 없다.

| 갱신 파일                                    | 분류 | 직접 확인한 차이와 근거                                                                                                                                                 |
| -------------------------------------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `home-ko-kr-chromium.png`                    | A    | 이전 허브 대신 메인 채팅(`c5abeedf`, `73a1f14a`). 삭제된 hero 대신 현재 채팅 제목과 활성 입력창을 기다리고 폰트 로딩을 완료한다.                                        |
| `blog-ko-kr-chromium.png`                    | A    | 새 글·공개 글로 목록과 태그 수가 변경됨(`7a8dc6c9`, `0ad6ff16`, `f0708f97`). 탭은 slug 대신 번역 제목을 사용함(`6cb65c40`).                                             |
| `blog-dashboard-ko-kr-chromium.png`          | A    | 위 글 목록 변경으로 통계가 44건이 되고 카드 순서·내용이 달라짐. 탭 제목은 대시보드로 표시됨(`6cb65c40`).                                                                |
| `game-center-ko-kr-chromium.png`             | A    | 본문은 동일하고 탭의 `game`이 `Game Center`로 바뀜(`6cb65c40`).                                                                                                         |
| `blog-detail-desktop-chromium.png`           | A    | 본문 배치는 같고 slug 탭이 글 제목으로 바뀜(`6cb65c40`).                                                                                                                |
| `blog-detail-mobile-chromium.png`            | A    | 우측 하단 원형 탐색기 버튼이 상단 예약 영역으로 이동하고 목록 링크 간격이 바뀜(`72a33868`).                                                                             |
| `sky-drop-desktop-ready-chromium.png`        | A    | 메뉴바 아래 높이 보정으로 480×804에서 480×770으로 줄고 중앙 정렬 내용이 위로 이동함(`cc8f92c7`).                                                                        |
| `sky-drop-desktop-playing-chromium.png`      | A    | 같은 높이 보정으로 블록·데드라인·하단 안내가 새 가용 높이에 배치됨(`cc8f92c7`).                                                                                         |
| `sky-drop-mobile-ready-chromium.png`         | A    | 상단 예약 영역을 제외한 ready 프레임 높이가 844에서 796으로 바뀌고 하단 탐색기 버튼이 사라짐(`72a33868`).                                                               |
| `sky-drop-landscape-ready-chromium.png`      | A    | 기존 프레임 너비와 내용은 유지되고 가용 높이가 310에서 260으로 바뀜(`cc8f92c7`, `72a33868`).                                                                            |
| `sky-drop-landscape-playing-chromium.png`    | A    | 공통 높이 보정으로 310에서 276으로 바뀜. 상단 HUD와 보드는 같고 하단 안내의 캡처 범위가 달라짐(`cc8f92c7`).                                                             |
| `postgresql-clickhouse-desktop-chromium.png` | B    | 기존 768×1556 이미지가 1100px viewport 안의 스크롤 영역에 잘려 위·아래가 비어 있었음. 캡처 높이를 확보하고 전체 교차 비율 1을 검증해 제목부터 그래프·범례까지 포함한다. |
| `postgresql-clickhouse-mobile-chromium.png`  | B    | 기존 358×1614 이미지도 844px viewport에 잘렸고 개발 도구·탐색기 버튼이 섞였음. 동일한 높이 준비와 개발 overlay 제거 후 전체 컴포넌트를 캡처한다.                        |
| `jev-pixel-desktop-intro-chromium.png`       | A    | 1168×1052에서 1168×984로 높이만 달라짐. 공통 영역의 모든 픽셀이 동일함(`cc8f92c7`).                                                                                     |
| `jev-pixel-desktop-othello-chromium.png`     | A    | 1168×1234에서 1168×1200으로 높이만 달라짐. 공통 영역의 모든 픽셀이 동일함(`cc8f92c7`).                                                                                  |
| `jev-pixel-desktop-yacht-dice-chromium.png`  | A    | 1168×1208에서 1168×1174로 높이만 달라짐. 공통 영역의 모든 픽셀이 동일함(`cc8f92c7`).                                                                                    |
| `jev-pixel-desktop-result-chromium.png`      | A    | 1168×1234에서 1168×1200으로 높이만 달라짐. 공통 영역의 모든 픽셀이 동일함(`cc8f92c7`).                                                                                  |
| `jev-pixel-mobile-intro-chromium.png`        | A    | 상단 예약 영역으로 높이가 48px 줄고 캡처 하단의 기존 탐색기 버튼이 사라짐. 나머지 내용은 동일함(`72a33868`).                                                            |
| `jev-pixel-mobile-result-chromium.png`       | A    | 같은 48px 높이 변화와 탐색기 버튼 제거만 있음(`72a33868`).                                                                                                              |

관찰 이후 커밋만으로는 오래된 홈·글 목록·공통 높이 차이를 설명할 수 없어,
해당 기준 이미지를 만든 커밋부터 제품 변경 이력까지 역추적했다. 새 제품 기준을 임의로
설계하지 않고 이미 반영된 변경을 근거로 삼았다.

## 준비 조건과 갱신 방법

- 홈은 `ko.home.mainChat.workspaceTitle` heading과 `ko.home.mainChat.placeholder`
  textbox의 활성 상태로 실제 화면과 hydration을 확인한다.
- 기본 화면 비교에도 `document.fonts.ready`를 기다린다. 기존 애니메이션 비활성화와
  caret 숨김, 게임 시간·난수 mock은 유지한다.
- 벤치마크는 폰트 로딩 후 컴포넌트 높이를 측정하고 viewport 높이를 확보한다.
  `toBeInViewport({ ratio: 1 })`로 잘린 캡처가 기준이 되는 것을 막는다.
- Sky Drop ready 비교는 soft assertion이지만 여전히 테스트를 실패시킨다.
  첫 이미지 차이 때문에 playing 상태의 비교가 누락되지 않게 한다.
- `maxDiffPixels` 등 임계값, skip 설정, 제품 코드, 번역 문구는 변경하지 않았다.
- package 1개, Wordle 4개, 읽기 도구 2개, Sky Drop mobile playing 1개,
  JEV mobile othello/yacht-dice 2개의 기준선은 유지한다.

갱신은 아래 명령의 `-g`에 표의 필터를 각각 전달했다. package나 성공한 다른 테스트를
포함한 전체 갱신은 실행하지 않았다.

```bash
PLAYWRIGHT_PORT=37205 pnpm --filter @vscoke/web e2e:update-snapshots -g '<필터>'
```

| 대상          | 필터                                                                                                        |
| ------------- | ----------------------------------------------------------------------------------------------------------- |
| 기본 화면 4개 | `비주얼 회귀 (/ko-KR 화면\|/ko-KR/blog 화면\|/ko-KR/blog/dashboard 화면\|/ko-KR/game 화면) 시각 회귀 체크$` |
| 글 상세 2개   | `블로그 상세 비주얼 (desktop\|mobile) 읽기 레이아웃$`                                                       |
| Sky Drop 3개  | `Sky Drop DOM 비주얼 (desktop\|mobile\|landscape) 시작·플레이 레이아웃$`                                    |
| 벤치마크 2개  | `PostgreSQL ClickHouse 비교 화면 비주얼 벤치마크 (desktop\|mobile) 측정값 시각화$`                          |
| JEV 6개       | `JEV 픽셀 아케이드 비주얼 (desktop (intro\|othello\|yacht-dice\|result)\|mobile (intro\|result)) 화면$`     |

## 검증과 남은 범위

아래 명령을 동일하게 2회 연속 실행했고, 매번 새로운 서버·브라우저에서 26개 테스트와
29개 기준 이미지 비교가 모두 통과했다. 재시도나 스냅샷 갱신 옵션은 사용하지 않았다.

```bash
PLAYWRIGHT_PORT=37205 pnpm --filter @vscoke/web e2e tests/e2e/visual-regression.spec.ts --project=chromium
```

| 검증                           | 결과                              |
| ------------------------------ | --------------------------------- |
| 시각 회귀 1회차                | `26 passed (31.6s)`               |
| 시각 회귀 2회차                | `26 passed (35.8s)`               |
| `pnpm test:web`                | 169 passed, 0 failed, 0 skipped   |
| `pnpm lint:web`                | 종료 코드 0                       |
| `pnpm type:check:web`          | 종료 코드 0                       |
| 변경 TS·Markdown Prettier 검사 | 통과; PNG는 포맷 검사 대상이 아님 |
| `git diff --check`             | 통과                              |

갱신한 19개 PNG 모두 사전에 검토한 `prepared` actual과 바이트까지 같았다.
package와 나머지 9개 PNG에는 Git 변경이 없다. 시각 범위의 이슈 완료 기준은 충족했다.

초기 확장 실행에서 시각 비교와 무관한 `hobby-games.spec.ts:68`이 60초 후 실패했다.
`wordle`이라는 탭 버튼을 기다리지만 현재 접근 이름은 `Wordle`이다(`6cb65c40`).
수정 전 기준 커밋에서 재현했으며 serial 설정 때문에 이후 22건은 실행되지 않았다.
이 파일에는 `toHaveScreenshot`이 없어 이슈 #68의 변경 범위에서 제외했다.
모바일 3개 프로젝트의 `mobile-behavior` 39건과 나머지 지정 spec의 실행된 검사는 통과했다.

산출물은 Git에서 제외되는 `output/playwright/visual-baseline-review/`에 보관했다.
`initial`에는 최초 이미지와 오류 문맥, `prepared`에는 홈·playing 및 준비 조건 수정 후
expected/actual/diff가 있다. 브라우저 설치, API 검사, 제품 기능 변경은 수행하지 않았다.
