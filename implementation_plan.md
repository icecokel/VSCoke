# Implementation Plan - Block Tower 개선

## 개요

Block Tower 게임의 시각적 밸런스를 조정하고, 탑이 높아질 때의 게임 플레이 경험을 개선합니다. 정사각형 블록의 크기를 줄여 난이도와 시각적 조화를 맞추고, 탑이 쌓임에 따라 최상단 블록이 항상 화면 중앙에 위치하도록 카메라를 부드럽게 이동시킵니다.

## 작업 단계

### Phase 1: 블록 크기 조정

- **`BlockTowerConstants.ts` 수정**
  - `smallSquare`, `mediumSquare`, `largeSquare`의 `width`, `height`를 기존 대비 **70% 수준**으로 축소합니다.
  - 물리 엔진(`mass`) 값도 줄어든 면적을 고려해 적절히 하향 조정하여 물리적 리얼리티를 유지합니다.

### Phase 2: 카메라 스크롤링 및 UI 고정

- **`MainScene.ts` 수정**
  - **UI 고정 (`setScrollFactor(0)`)**: `scoreText`, `heightText`, `livesText`, `shooter`(슈터 컨테이너), `shooterBlock`(대기 중인 블록), `landingZone`(바닥) 등 고정되어야 할 요소들에 스크롤 팩터 0을 적용합니다.
  - **카메라 이동 로직 추가**:
    - `highestBlockY` 변수를 추가하여 가장 높이 쌓인 블록의 Y좌표를 실시간으로 추적합니다.
    - **목표 스크롤 계산**: 최상단 블록(`highestBlockY`)이 **화면 중앙**에 오도록 목표 카메라 Y값(`targetScrollY`)을 계산합니다.
      - `targetScrollY = highestBlockY - (screenHeight / 2)` (기본적으로 Phaser 카메라는 좌상단이 기준이므로 좌표계산 필요)
      - 단, 초기 상태(탑이 낮을 때)에는 스크롤이 0 이하로 내려가거나 바닥이 들리지 않도록 최소값(0)을 제한합니다.
    - **부드러운 이동 (Lerp)**: `update` 루프에서 카메라의 현재 `scrollY`를 `targetScrollY`로 부드럽게 보간(Lerp, `factor: 0.05`)하여 이동시킵니다. 카메라는 탑이 무너짐에 따라 다시 내려갈 수도 있어야 하므로 양방향 이동을 허용하되, 급격한 움직임은 방지합니다.
  - **게임 오버 판정 수정**:
    - `checkFallenBlocks`에서 블록 낙하 판정 기준을 `threshold + this.cameras.main.scrollY`로 수정하여 카메라 이동에 대응합니다.

## 변경 사항

- **`src/components/game/block-tower/BlockTowerConstants.ts`**:
  - 정사각형 블록 3종의 크기 및 질량 수정.
- **`src/components/game/block-tower/scenes/MainScene.ts`**:
  - `highestBlockY` 프로퍼티 추가.
  - `createUI`, `createShooter`, `createLandingZone`에서 `setScrollFactor(0)` 적용.
  - `update`에서 `highestBlockY` 갱신 및 카메라 Lerp 로직 구현.
  - `checkFallenBlocks` 판정 로직 수정.

## 검증 계획

1. 정사각형 블록이 이전보다 작아졌는지 시각적으로 확인.
2. 탑을 쌓을 때 **최상단 블록이 화면 중앙에 오도록** 카메라가 부드럽게 따라오는지 확인.
3. 카메라 이동 중에도 슈터와 UI가 흔들리지 않고 고정되어 있는지 확인.
4. 높이 올라간 상태에서 블록을 떨어뜨렸을 때 정상적으로 생명력이 깎이는지 확인.
