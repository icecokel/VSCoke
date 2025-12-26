import * as Phaser from "phaser";
import { BlockTowerConstants, BlockType } from "../BlockTowerConstants";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: "PreloadScene" });
  }

  preload() {
    // 로딩 진행률 이벤트
    this.load.on("progress", (value: number) => {
      this.game.events.emit("game:progress", value);
    });

    // 도형 텍스처 생성
    this.createBlockTextures();
  }

  private createBlockTextures() {
    const graphics = this.make.graphics({ x: 0, y: 0 }, false);

    // 각 도형 타입별로 텍스처 생성
    const blockTypes: BlockType[] = [
      "smallSquare",
      "mediumSquare",
      "largeSquare",
      "smallRect",
      "largeRect",
    ];

    blockTypes.forEach(type => {
      const block = BlockTowerConstants.BLOCKS[type];
      graphics.clear();

      // 배경색 (흰색 기반, 나중에 tint로 색상 적용)
      graphics.fillStyle(0xffffff);
      graphics.fillRoundedRect(0, 0, block.width, block.height, 4);

      // 이너 섀도우 (우측 하단 가장자리에 얇게)
      graphics.lineStyle(2, 0x000000, 0.15);
      graphics.beginPath();
      graphics.moveTo(block.width - 1, 4);
      graphics.lineTo(block.width - 1, block.height - 1);
      graphics.lineTo(4, block.height - 1);
      graphics.strokePath();

      // 테두리 (1px, 가장자리에 맞춤)
      graphics.lineStyle(1, 0x000000, 0.8);
      graphics.strokeRoundedRect(0.5, 0.5, block.width - 1, block.height - 1, 4);

      graphics.generateTexture(`block_${type}`, block.width, block.height);
    });

    graphics.destroy();
  }

  create() {
    // 준비 완료 알림
    this.game.events.emit("game:ready");

    // 시작 신호 대기
    this.game.events.on("game:start", this.startGame, this);

    // 리사이즈 이벤트 연결
    this.scale.on("resize", this.resize, this);
    this.game.events.on("external-resize", this.resize, this);
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
