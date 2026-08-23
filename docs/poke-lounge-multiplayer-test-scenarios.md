# Poke Lounge 공개 멀티플레이 테스트 시나리오

확인 기준일: 2026-08-20
구현 기준: `main`

## 1. 목적

이 문서는 현재 공개 Poke Lounge 멀티플레이의 인수 테스트 기준이다. 제품 규칙 자체는
[Poke Lounge 게임 규칙 인덱스](./poke-lounge-rules/index.md)에서 관리한다.

이 문서의 모든 `P0` 시나리오를 통과해야 현재 멀티플레이 기능을 정상으로 판정한다. 공개
멀티플레이의 세부 판정은 규칙 인덱스와 연결된 하위 문서를 따른다.

## 2. 제품 계약

테스트는 [멀티플레이 규칙](./poke-lounge-rules/multiplayer-rules.md)과
[3라운드 챔피언십 규칙](./poke-lounge-rules/three-round-championship.md)의 사용자 관찰 결과를
검증한다. 이 문서에는 규칙을 다시 정의하지 않고 테스트 환경, 절차와 증적만 기록한다.

### 2.1 테스트 제외 범위

다음 항목은 공개 멀티플레이 인수 테스트에서 제외한다.

- Google 로그인, 계정 선택과 OAuth callback
- 사용자에게 보이는 방 코드, 방 생성·참가 선택과 초대 링크
- 방장 강퇴·방 설정, 준비 시간 선택과 경쟁 모드 설정
- Google 계정에 바인딩하는 competitive seat
- direct room URL, 수동 WebRTC와 내부 경쟁 API
- 사용자 간 파티·재화·인벤토리 공유

공통 셸이 `/api/auth/session`을 조회할 수는 있지만, 멀티플레이 접속 성공 조건으로 로그인이나
Authorization header를 요구해서는 안 된다.

## 3. 상태와 우선순위

| 표기 | 의미                                                           |
| ---- | -------------------------------------------------------------- |
| `A`  | 현재 단위·API·브라우저 테스트 중 하나 이상으로 자동화되어 있음 |
| `P`  | 하위 계층은 자동화됐지만 실제 다중 브라우저 검증이 필요함      |
| `N`  | 자동화되지 않았으며 신규 자동화가 필요함                       |
| `M`  | 운영 환경에서 수동으로 확인해야 함                             |

`P0`·`P1`·`P2` 실행 시점과 실패 처리는
[전체 기능 E2E 테스트 시나리오](./e2e-full-feature-test-scenarios.md#22-우선순위)를 따른다.

## 4. 테스트 환경

### 4.1 환경 계층

| 환경      | Web           | API           | DB                      | 목적                       |
| --------- | ------------- | ------------- | ----------------------- | -------------------------- |
| UI 격리   | 로컬 Next.js  | 응답 fixture  | 없음                    | 입력·오류·레이아웃         |
| 로컬 통합 | 로컬 Next.js  | 실제 NestJS   | 격리 PostgreSQL `_test` | 참가·Socket·leave·재접속   |
| 운영 인수 | 운영 배포 Web | 운영 배포 API | 운영 정책               | 실제 배포·CORS·Socket·화면 |

운영 인수 테스트는 임시 비밀번호 원문, 쿠키, token과 전체 Socket payload를 artifact에 저장하지
않는다. 운영 room에는 테스트 전용 닉네임 prefix를 사용하고 완료 후 모든 참가자가 명시적으로
나간다.

### 4.2 브라우저 구성

| 사용자 | 환경                               | 역할                         |
| ------ | ---------------------------------- | ---------------------------- |
| `MP1`  | Desktop Chromium, 1440×900         | 최초 참가자·방장·키보드 이동 |
| `MP2`  | Mobile Chromium, Pixel 7 390×844   | 모바일 참가자·터치 이동      |
| `MP3`  | Desktop Firefox                    | 정원 참가자                  |
| `MP4`  | Mobile WebKit, iPhone 13 emulation | 정원 참가자                  |
| `MP5`  | Desktop WebKit                     | 정원 참가자                  |
| `MP6`  | 별도 Desktop Chromium context      | 여섯 번째 참가자·나가기      |
| `MP7`  | 새 browser context                 | 일곱 번째 거부·빈자리 재입장 |

모든 context는 서로 다른 `sessionStorage`를 사용한다. 같은 사용자 재접속 시나리오에서만 기존
탭과 storage를 유지한다.

### 4.3 테스트 데이터

- `PW_A`: 실행 시 생성한 동일 세션용 임시 비밀번호
- `PW_B`: `PW_A`와 다른 격리 확인용 임시 비밀번호
- 닉네임: `MP-1`부터 `MP-7`
- 저장 상태: 최초 실행은 빈 상태, 독립 진행 검증에서는 `MP1`만 파티·재화 fixture 보유

`PW_A`, `PW_B` 원문은 문서, URL, screenshot, trace 제목과 JSON 결과에 기록하지 않는다.
해시에서 파생된 내부 6자리 key도 사용자 화면 증거로 사용하지 않는다.

## 5. 상세 시나리오

### 5.1 입장 화면

| ID             | 우선순위/상태 | 절차                                   | 기대 결과                                                         |
| -------------- | ------------- | -------------------------------------- | ----------------------------------------------------------------- |
| `MP-ENTRY-001` | P0/A          | 비로그인으로 Poke Lounge에 진입        | 닉네임, 임시 비밀번호와 접속 CTA가 표시된다.                      |
| `MP-ENTRY-002` | P0/A          | 닉네임을 비우고 접속                   | 닉네임 필수 안내와 입력 focus가 표시된다.                         |
| `MP-ENTRY-003` | P0/A          | 닉네임만 입력하고 접속                 | 임시 비밀번호 필수 안내와 입력 focus가 표시된다.                  |
| `MP-ENTRY-004` | P0/A          | 공개 control을 모두 확인               | 방 코드·초대·생성/참가·로그인·경쟁전 설정이 없다.                 |
| `MP-ENTRY-005` | P1/A          | 전각·공백을 포함한 임시 비밀번호 입력  | NFKC·trim 결과가 같은 값이면 같은 내부 key를 사용한다.            |
| `MP-ENTRY-006` | P1/A          | 12자를 넘는 닉네임 입력                | Unicode 문자 기준 앞 12자만 사용하고 빈 문자열은 허용하지 않는다. |
| `MP-ENTRY-007` | P0/A          | Desktop과 390×844 Mobile에서 화면 확인 | 입력, 설명과 CTA가 game frame을 벗어나지 않고 overflow가 없다.    |

### 5.2 세션 자동 생성·참가와 비밀값

| ID               | 우선순위/상태 | 절차                                    | 기대 결과                                                                                       |
| ---------------- | ------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `MP-SESSION-001` | P0/A          | `MP1`이 닉네임과 `PW_A`로 접속          | 별도 선택 없이 세션을 생성하고 스타터 선택 뒤 대기실에 입장한다.                                |
| `MP-SESSION-002` | P0/A          | `MP2`가 다른 닉네임과 `PW_A`로 접속     | 같은 대기실에 자동 참가하고 양쪽이 두 닉네임을 본다.                                            |
| `MP-SESSION-003` | P0/P          | 새 context가 `PW_B`로 접속              | `PW_A` 세션 참가자와 서로 보이지 않는다.                                                        |
| `MP-SESSION-004` | P0/A          | URL, storage, API body와 console을 검사 | 임시 비밀번호 원문이 남지 않고 API에는 파생 key만 전달된다.                                     |
| `MP-SESSION-005` | P0/A          | room REST·Socket 요청을 관찰            | party snapshot은 자동 전송하지만 ready는 자동 전송하지 않고 competitive seat도 호출하지 않는다. |
| `MP-SESSION-006` | P0/A          | 인증 쿠키가 없는 `MP1`, `MP2`로 접속    | Google 로그인이나 bearer token 없이 create-or-join과 Socket 승인이 성공한다.                    |
| `MP-SESSION-007` | P0/A          | 두 참가자의 파티 동기화 완료            | 양쪽이 대기실에 머물며 ready나 1라운드 5분 준비가 자동 시작되지 않는다.                         |

### 5.3 방장·ready·수동 시작 대기실

| ID             | 우선순위/상태 | 절차                                 | 기대 결과                                                               |
| -------------- | ------------- | ------------------------------------ | ----------------------------------------------------------------------- |
| `MP-LOBBY-001` | P0/A          | `MP1`이 먼저 대기실에 입장           | `MP1`에 방장 표시가 있고 준비 타이머는 시작되지 않는다.                 |
| `MP-LOBBY-002` | P0/A          | 2분 뒤 `MP2`가 같은 대기실에 입장    | 양쪽 타이머가 시작되지 않고 참가자 2명이 표시된다.                      |
| `MP-LOBBY-003` | P0/A          | `MP1`만 ready 선택                   | `MP2`는 준비 전이며 방장 시작 버튼은 비활성화된다.                      |
| `MP-LOBBY-004` | P0/A          | `MP1`, `MP2` 모두 ready              | `MP1`만 시작할 수 있고 `MP2`는 방장 시작 대기 안내를 본다.              |
| `MP-LOBBY-005` | P0/A          | 방장 `MP1`이 시작                    | 양쪽이 같은 `startedAtMs`, `endsAtMs`와 정확한 5분 준비를 받는다.       |
| `MP-LOBBY-006` | P0/A          | 시작 전에 `MP3` 참가                 | `MP3`도 ready 조건에 포함되며 세 명 모두 준비해야 시작할 수 있다.       |
| `MP-LOBBY-007` | P0/A          | 시작 뒤 신규 context로 참가          | 신규 참가를 거부하고 기존 참가자 명단과 준비 종료 시각을 바꾸지 않는다. |
| `MP-LOBBY-008` | P0/A          | 대기실에서 `MP1`이 명시적으로 나감   | 다음 최초 입장자인 `MP2`가 방장이 된다.                                 |
| `MP-LOBBY-009` | P1/A          | 방장 Socket을 끊고 15초 안에 재연결  | 유예 중 방장을 유지하고 시작을 막으며 재연결 뒤 기존 방장으로 복구한다. |
| `MP-LOBBY-010` | P0/A          | 참가자 6명을 Desktop·Mobile에서 확인 | 전체 목록에 접근할 수 있고 필수 버튼이 game frame 안에 남는다.          |
| `MP-LOBBY-011` | P0/A          | 준비 중 이탈로 참가자가 1명이 됨     | `waiting`으로 돌아가 남은 ready를 해제하고 대기실을 다시 연다.          |

### 5.4 최대 6명과 7번째 접속 거부

| ID           | 우선순위/상태 | 절차                                           | 기대 결과                                                                |
| ------------ | ------------- | ---------------------------------------------- | ------------------------------------------------------------------------ |
| `MP-CAP-001` | P0/P          | `MP1`~`MP6`이 순서대로 `PW_A`에 접속           | 여섯 사용자 모두 참가자이며 관전자로 전환되는 사용자가 없다.             |
| `MP-CAP-002` | P0/A          | `MP7`이 같은 `PW_A`로 접속                     | HTTP 409와 `POKE_LOUNGE_ROOM_FULL`로 거부되고 참가자 수는 6명이다.       |
| `MP-CAP-003` | P0/A          | `MP7`의 오류 화면 확인                         | “6명이 접속 중” 안내와 입장 화면 복귀만 제공하며 자동 재시도하지 않는다. |
| `MP-CAP-004` | P0/A          | 정원이 찬 상태에서 `MP1`의 같은 탭을 새로고침  | 같은 identity로 복원되고 참가자 수가 7명으로 늘지 않는다.                |
| `MP-CAP-005` | P0/P          | `MP6`이 방 나가기를 확인하고 `MP7`이 다시 접속 | `MP6` 자리가 즉시 제거되고 `MP7`이 여섯 번째 신규 참가자로 성공한다.     |
| `MP-CAP-006` | P1/A          | `MP5` Socket을 끊고 14,999ms 동안 관찰         | 재접속 유예 중에는 자리를 유지해 다른 신규 사용자의 접속을 거부한다.     |
| `MP-CAP-007` | P1/A          | `MP5`가 15초 안에 같은 탭으로 재연결           | 만료를 취소하고 동일 참가자로 복원한다.                                  |
| `MP-CAP-008` | P1/P          | `MP5`를 재연결하지 않고 유예 종료 후 신규 접속 | 만료된 참가자를 제거하고 신규 사용자가 빈자리에 입장한다.                |

정원 검증은 `role === participant` 개수만 보지 않고 room에 남아 있는 전체 사용자 행이 6개를
넘지 않는지 확인한다.

### 5.5 동일 사용자와 재접속

| ID          | 우선순위/상태 | 절차                                       | 기대 결과                                                              |
| ----------- | ------------- | ------------------------------------------ | ---------------------------------------------------------------------- |
| `MP-ID-001` | P0/A          | 같은 탭을 새로고침                         | 저장된 `playerId + sessionId`로 같은 참가자를 복원한다.                |
| `MP-ID-002` | P0/A          | 다른 context에서 같은 닉네임·`PW_A` 입력   | 닉네임과 비밀번호가 같아도 신규 참가자로 계산한다.                     |
| `MP-ID-003` | P0/A          | 명시적 방 나가기 후 같은 값을 다시 입력    | 저장 identity를 지우고 신규 참가자로 입장한다.                         |
| `MP-ID-004` | P1/A          | 다른 sessionId로 기존 playerId 재사용 시도 | session 불일치로 거부하고 기존 참가자 identity를 탈취하지 못한다.      |
| `MP-ID-005` | P1/A          | 일시 disconnect 후 같은 탭 재연결          | 한 Socket identity로 REST 복구·재구독하고 중복 avatar를 만들지 않는다. |

### 5.6 같은 월드와 각자의 플레이

| ID             | 우선순위/상태 | 절차                                           | 기대 결과                                                                      |
| -------------- | ------------- | ---------------------------------------------- | ------------------------------------------------------------------------------ |
| `MP-WORLD-001` | P0/P          | `MP1`을 키보드로 이동                          | `MP2` 화면에서 `MP1`의 좌표와 방향이 갱신된다.                                 |
| `MP-WORLD-002` | P0/P          | `MP2`를 터치 방향 패드로 이동                  | `MP1` 화면에서 `MP2`의 좌표와 방향이 갱신된다.                                 |
| `MP-WORLD-003` | P0/A          | 위조 playerId·sessionId·displayName event 전송 | 서버가 durable identity와 닉네임으로 덮어쓰고 승인된 좌표·방향만 중계한다.     |
| `MP-WORLD-004` | P0/P          | `MP1`이 야생전에 진입하고 `MP2`는 계속 이동    | 전투는 `MP1` 탭에서만 열리고 `MP2` 플레이와 이동은 계속된다.                   |
| `MP-WORLD-005` | P0/P          | `MP1` 파티·재화·인벤토리를 변경                | `MP2`의 파티·재화·인벤토리는 변하지 않고 네트워크 payload에도 포함되지 않는다. |
| `MP-WORLD-006` | P1/P          | `MP1`이 전투 종료 후 월드로 복귀               | 상대 avatar와 최신 위치를 다시 보고 자신의 HP·PP·보상만 유지한다.              |
| `MP-WORLD-007` | P0/P          | 3명 이상 중 한 명이 명시적으로 나가기          | 다른 화면에서 해당 avatar가 제거되고 2명 이상 남은 사용자는 계속 플레이한다.   |

### 5.7 3라운드 챔피언십

| ID             | 우선순위/상태 | 절차                                         | 기대 결과                                                                       |
| -------------- | ------------- | -------------------------------------------- | ------------------------------------------------------------------------------- |
| `MP-CHAMP-001` | P0/A          | 2명의 party snapshot·수동 ready 뒤 방장 시작 | 정확히 5분 준비가 시작되고 현재 라운드와 남은 시간이 같은 기준 시각으로 보인다. |
| `MP-CHAMP-002` | P0/A          | 준비 중 한 명이 나가 참가자가 1명이 됨       | 이탈자의 파티를 제거하고 ready를 해제한 뒤 대진 없이 `waiting`으로 돌아간다.    |
| `MP-CHAMP-003` | P0/P          | 준비 종료 뒤 첫 대진에서 행동 제출           | 로그인 없이 private session identity로 자기 행동만 제출할 수 있다.              |
| `MP-CHAMP-004` | P0/P          | 전투를 terminal까지 진행                     | 서버가 승패·bracket 전진·각 파티 terminal HP 비율 점수를 확정한다.              |
| `MP-CHAMP-005` | P0/P          | 3개 라운드를 모두 완료                       | 누적 점수 내림차순 최종 순위가 표시되고 동점 최고 점수는 공동 우승이다.         |
| `MP-CHAMP-006` | P0/A          | 1·2라운드 토너먼트 완료                      | 별도 ready 없이 다음 라운드의 정확한 5분 준비가 자동 시작된다.                  |

### 5.8 오류·복구·화면

| ID             | 우선순위/상태 | 절차                                     | 기대 결과                                                                            |
| -------------- | ------------- | ---------------------------------------- | ------------------------------------------------------------------------------------ |
| `MP-ERROR-001` | P0/A          | room create-or-join API 5xx·network 실패 | 일반 연결 오류와 재시도·입장 복귀를 표시하고 무한 요청을 만들지 않는다.              |
| `MP-ERROR-002` | P0/A          | 정원 초과 409 수신                       | 일반 네트워크 오류가 아닌 정원 6명 안내를 표시한다.                                  |
| `MP-ERROR-003` | P1/A          | Socket disconnect 후 복구                | 로컬 게임 상태를 잃지 않고 REST snapshot과 Socket 구독이 최신 revision으로 수렴한다. |
| `MP-ERROR-004` | P1/A          | stale identity 또는 cursor regression    | 이전 identity를 종료하고 닉네임·임시 비밀번호 화면으로 돌아간다.                     |
| `MP-ERROR-005` | P0/P          | Desktop과 Mobile에서 오류 화면 확인      | 버튼과 문구가 frame 안에 있고 keyboard·touch로 입장 화면에 복귀한다.                 |
| `MP-ERROR-006` | P1/A          | ko-KR, en-US, ja-JP 정원 초과 문구 확인  | 각 locale에 대응하는 6명 정원 안내가 표시된다.                                       |
| `MP-ERROR-007` | P1/N          | ready 또는 시작 mutation 실패            | 대기실을 유지하고 최신 snapshot과 인라인 재시도 안내로 수렴한다.                     |

## 6. 실행 시나리오

### 6.1 기본 2인 shared world

1. `MP1`, `MP2`의 storage를 비우고 Poke Lounge 입장 화면을 연다.
2. Desktop과 Mobile 입장 화면을 각각 캡처한다.
3. 두 context가 서로 다른 닉네임과 같은 `PW_A`로 접속한다.
4. 양쪽 대기실에서 두 닉네임, `MP1` 방장 표시와 준비 전 상태를 확인한다.
5. 두 사용자가 ready를 선택하고 방장 `MP1`이 시작한다.
6. 양쪽에 같은 5분 준비가 시작된 뒤 대기실이 닫히는지 확인한다.
7. `MP1`은 키보드, `MP2`는 터치로 이동하고 상대 화면의 좌표·방향 변화를 확인한다.
8. `MP1`만 야생전에 진입한 동안 `MP2`가 계속 월드를 이동하는지 확인한다.
9. `MP1`의 전투 보상과 파티 변경이 `MP2`에 반영되지 않는지 확인한다.
10. 두 사용자가 방에서 나가고 입장 화면으로 돌아오는지 확인한다.

### 6.2 6명 정원·7번째 거부·재입장

1. `MP1`~`MP6`이 같은 `PW_A`에 순서대로 접속한다.
2. REST snapshot에서 참가자 6명과 서로 다른 identity를 확인한다.
3. `MP7`이 같은 `PW_A`로 접속해 409 정원 초과 화면을 확인한다.
4. 정원이 찬 상태에서 `MP1`을 새로고침해 동일 identity와 참가자 6명을 확인한다.
5. `MP6`이 명시적으로 나가고 `MP7`이 다시 접속해 여섯 번째 자리를 얻는지 확인한다.
6. 한 참가자의 Socket을 일시 중단하고 15초 안에 재연결해 같은 자리를 유지하는지 확인한다.
7. 다시 연결을 끊고 유예를 넘겨 참가자 제거와 다음 신규 참가자의 입장을 확인한다.
8. 남은 모든 참가자가 명시적으로 나가도록 정리한다.

### 6.3 기본 2인 챔피언십

1. `MP1`, `MP2`가 같은 `PW_A`에 접속해 각자의 파티를 준비한다.
2. 자동 party snapshot 뒤에도 대기실과 준비 전 상태가 유지되는지 확인한다.
3. 두 사용자가 ready를 선택하고 방장 `MP1`이 시작한다.
4. 양쪽 HUD의 현재 라운드와 남은 시간이 같은 서버 종료 시각을 기준으로 감소하는지 확인한다.
5. 첫 대진을 끝내고 terminal HP 비율 점수와 다음 대진 또는 다음 라운드 전환을 확인한다.
6. 2·3라운드 준비가 별도 ready 없이 자동 시작되는지 확인한다.
7. 3라운드 완료 뒤 누적 최종 순위와 공동 1위 규칙을 확인한다.

## 7. 필수 증적

| 번호 | 증적                                                   |
| ---- | ------------------------------------------------------ |
| `01` | Desktop 닉네임·임시 비밀번호 입장 화면                 |
| `02` | Mobile 390×844 입장 화면                               |
| `03` | Desktop 대기실의 두 참가자와 방장 표시                 |
| `04` | Mobile 대기실의 두 참가자와 준비 상태                  |
| `05` | 한 명만 ready인 상태의 비활성화된 시작 버튼            |
| `06` | 전원 ready 뒤 방장에게만 활성화된 시작 버튼            |
| `07` | 방장 시작 뒤 같은 준비 종료 시각이 표시된 양쪽 화면    |
| `08` | 여섯 참가자가 모두 들어온 대기실                       |
| `09` | 7번째 사용자의 6명 정원 초과 안내                      |
| `10` | 시작 뒤 신규 참가자의 접속 거부 안내                   |
| `11` | 대기실 방장 이탈 뒤 다음 참가자에게 권한이 승계된 상태 |
| `12` | 한 사용자는 전투, 다른 사용자는 월드인 독립 상태       |
| `13` | 서버 확정 대진 결과와 terminal HP 라운드 점수          |
| `14` | 3라운드 누적 최종 순위                                 |
| `15` | 테스트 종료 후 입장 화면 또는 정리된 room 상태         |

각 screenshot은 시나리오 ID, browser, viewport와 시각을 함께 기록한다. 추가로 다음 JSON 또는
로그를 남긴다.

- commit SHA와 배포 URL
- 공개 participant 수와 room status
- 예상된 409 한 건과 `POKE_LOUNGE_ROOM_FULL` code
- 자동 party snapshot, 수동 ready·start와 session action 요청 경로, competitive seat 요청 건수 0
- 공개 `hostPlayerId`, room status와 양쪽의 준비 시작·종료 시각
- console error, page error와 예상하지 않은 4xx/5xx
- 가로 overflow 여부

임시 비밀번호 원문, sessionId, token, cookie와 전체 Socket payload는 남기지 않는다.

## 8. 통과 기준

다음을 모두 만족해야 통과다.

1. `MP1`~`MP6`은 대기실에 참가하고 `MP7`은 정원 초과로 거부된다.
2. 최초 참가자가 방장이며 명시적 이탈이나 재접속 유예 만료 뒤 다음 참가자에게 승계된다.
3. party snapshot은 자동 동기화되지만 ready와 1라운드 준비는 자동 시작되지 않는다.
4. 2~6명이 모두 ready일 때 방장만 시작할 수 있다.
5. 방장 시작 뒤 모든 참가자의 준비 시작·종료 시각이 같고 정확히 5분이다.
6. 시작 뒤 신규 참가자는 거부되고 기존 identity 재접속은 허용된다.
7. 준비 취소로 `waiting`에 돌아오면 ready를 해제하고 대기실을 다시 연다.
8. Desktop 키보드와 Mobile 터치 이동이 시작 이후 서로의 화면에 반영된다.
9. 각 사용자의 파티·재화·전투 진행은 다른 사용자에게 공유되지 않는다.
10. 임시 비밀번호 원문과 identity credential이 URL, 저장소, 로그와 artifact에 노출되지 않는다.
11. 경쟁전은 competitive seat 없이 private session identity를 사용한다.
12. 5분 준비, 서버 권위 대진, terminal HP 점수와 3라운드 누적 순위가 규칙대로 진행된다.
13. 예상된 접속 거부 외에 예상하지 않은 4xx/5xx, page error와 console error가 없다.
14. Desktop과 Mobile에서 entry, 대기실, world, 챔피언십과 오류 화면이 frame을 벗어나지 않는다.

## 9. 현재 자동화 근거와 공백

| 범위                      | 현재 근거                                                                                                                 | 남은 공백                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| 입장 입력·금지 control    | `room-entry.test.ts`, `poke-lounge.spec.ts`, `poke-lounge-mobile.spec.ts`                                                 | 없음                                           |
| 임시 비밀번호 파생·비노출 | `room-entry.test.ts`, `server-room-snapshot-replay.test.ts`                                                               | 운영 artifact 수동 점검                        |
| 자동 create-or-join       | `poke-lounge-room.service.spec.ts`, `poke-lounge-room.e2e-spec.ts`, `poke-lounge-public-lobby.spec.ts`                    | 다른 비밀번호 세션 격리의 실제 browser 검증    |
| 방장·수동 ready·시작      | `poke-lounge-room.service.spec.ts`, `poke-lounge-multiplayer.spec.ts`, `poke-lounge-public-lobby.spec.ts`                 | 3명 이상 실제 browser 시작 검증                |
| 6명 정원·7번째 거부       | `poke-lounge-room.service.spec.ts`, `server-room-snapshot-replay.test.ts`                                                 | 실제 7 browser UI 통합                         |
| 동일 세션 재접속          | `poke-lounge-room.service.spec.ts`, `poke-lounge.gateway.spec.ts`                                                         | 정원 6명 상태의 실제 browser reload            |
| disconnect 유예           | `poke-lounge.gateway.spec.ts`, `poke-lounge-room-policy.spec.ts`                                                          | 실제 Socket 연결 중단·복귀                     |
| 위치 중계·identity 보호   | `poke-lounge.gateway.spec.ts`, `server-room-snapshot-replay.test.ts`                                                      | Desktop↔Mobile 실제 양방향 이동                |
| 독립 게임 진행            | `game-state-store.test.ts`, `server-room-snapshot-replay.test.ts`, Poke Lounge 전투 E2E                                   | 한쪽 전투·한쪽 월드의 실제 2 browser 동시 검증 |
| 서버 권위 대진·3라운드    | `poke-lounge-room.service.spec.ts`, `postgres-poke-lounge-room.repository.spec.ts`, `server-room-snapshot-replay.test.ts` | 수동 시작 기반 3라운드 실제 2 browser 완주     |
| 이탈·점수·누적 순위       | `poke-lounge-room-policy.spec.ts`, `postgres-competitive-action.repository.spec.ts`                                       | 실제 disconnect와 동점 공동 우승 UI 검증       |
| 오류·복구                 | `server-room-snapshot-replay.test.ts`, `server-room-error-copy.test.ts`, `poke-lounge-multiplayer.spec.ts`                | 운영 API·Socket 장애 수동 smoke                |

같은 임시 비밀번호를 실제 입력하는 Desktop·Mobile 2개 context의 대기실 수동 시작과 동일한
5분 기준 시각 검증은 자동화됐다. 다음 확장 완료 조건은 실제 2개 context의 3라운드 완주와 정원
검증용 7개 context 통합 테스트다.

## 10. 기준 문서

- [Poke Lounge 게임 규칙 인덱스](./poke-lounge-rules/index.md)
- [Poke Lounge Game Concept](./poke-lounge-game-concept.md)
- [VSCoke Monorepo Concept](./vscoke-monorepo-concept.md)
- [VSCoke 전체 기능 E2E 테스트 시나리오](./e2e-full-feature-test-scenarios.md)
- [Playwright CLI 테스트 흐름 스펙](./playwright-cli-test-spec.md)
