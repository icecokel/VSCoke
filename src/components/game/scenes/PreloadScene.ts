import * as Phaser from "phaser";
import { GameConstants } from "../GameConstants";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: "PreloadScene" });
  }

  preload() {
    // 0. 로딩 이벤트 리스너
    this.load.on("progress", (value: number) => {
      this.game.events.emit("game:progress", value);
    });

    // 1. 블록 텍스처 생성 (기존 MainScene에서 이동)
    const graphics = this.make.graphics({ x: 0, y: 0 }, false);

    // 배경 (흰색)
    graphics.fillStyle(0xffffff);
    graphics.fillRoundedRect(0, 0, 80, 32, 8); // BASE_BLOCK_WIDTH, BASE_BLOCK_HEIGHT

    // 이너 테두리 (검은색, 투명도 조절로 음영 효과)
    graphics.lineStyle(2, 0x000000, 0.4);
    graphics.strokeRoundedRect(2, 2, 76, 28, 6); // 안쪽으로 2px 들여쓰기

    graphics.generateTexture("block_base", 80, 32);

    // 파티클 텍스처 생성 (흰색 원형)
    graphics.clear();
    graphics.fillStyle(0xffffff);
    graphics.fillCircle(4, 4, 4);
    graphics.generateTexture("particle", 8, 8);

    graphics.destroy();

    // Debug: 로딩 바 테스트를 위한 임의의 지연 (실제 에셋이 적으므로)
    // 실제 프로덕션에서는 제거하거나 에셋이 많으면 자연스럽게 동작함
    for (let i = 0; i < 50; i++) {
      this.load.image(`dummy${i}`, "https://labs.phaser.io/assets/skies/space3.png");
    }
  }

  create() {
    // 2. 게임 데이터 준비 (색상 랜덤 선택)
    this.prepareGameData();

    // 3. 준비 완료 알림
    this.game.events.emit("game:ready");

    // 4. 시작 신호 대기
    this.game.events.on("game:start", this.startGame, this);

    // 리사이즈 이벤트 연결
    this.scale.on("resize", this.resize, this);
    this.game.events.on("external-resize", this.resize, this);
  }

  private prepareGameData() {
    // 난이도(컬럼 수)에 따른 색상 수 결정
    const cols = 3;
    const colorCount = GameConstants.COLOR_COUNT_BY_COLS[cols] || 5;

    // 전체 팔레트에서 랜덤하게 선택
    const shuffledPalette = Phaser.Utils.Array.Shuffle([...GameConstants.BLOCK_PALETTE]);
    const currentColors = shuffledPalette.slice(0, colorCount);

    // MainScene에서 사용할 수 있도록 레지스트리에 저장
    this.registry.set("currentColors", currentColors);
    this.registry.set("cols", cols);
  }

  private startGame() {
    this.game.events.off("game:start", this.startGame, this);
    this.scene.start("MainScene");
  }

  private resize(gameSize: { width: number; height: number }) {
    if (this.cameras.main) {
      this.cameras.main.setViewport(0, 0, gameSize.width, gameSize.height);
    }
  }
}
