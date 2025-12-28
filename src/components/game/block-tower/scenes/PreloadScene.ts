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
      "extraLargeRect",
      "triangle1",
      "triangle2",
    ];

    blockTypes.forEach(type => {
      const block = BlockTowerConstants.BLOCKS[type];
      graphics.clear();

      if (type.includes("triangle")) {
        const w = block.width;
        const h = block.height;

        // 삼각형 정의
        let p1, p2, p3;

        if (type === "triangle1") {
          // 직각 삼각형 (좌하단 직각: |__ )
          // (0, 0) - 상단 뾰족
          // (0, h) - 좌하단
          // (w, h) - 우하단
          p1 = { x: 0, y: 0 };
          p2 = { x: 0, y: h };
          p3 = { x: w, y: h };
        } else {
          // 역방향 삼각형 (우하단 직각: __| )
          // (w, 0) - 상단 뾰족
          // (w, h) - 우하단
          // (0, h) - 좌하단
          p1 = { x: w, y: 0 };
          p2 = { x: w, y: h };
          p3 = { x: 0, y: h };
        }

        graphics.fillStyle(0xffffff);
        graphics.fillTriangle(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);

        // 테두리
        graphics.lineStyle(2, 0x000000, 0.8);
        graphics.strokeTriangle(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);

        // 이너 섀도우 (간단히 빗변만)
        graphics.lineStyle(2, 0x000000, 0.15);
        graphics.beginPath();
        graphics.moveTo(p1.x, p1.y);
        graphics.lineTo(p3.x, p3.y); // 빗변
        graphics.strokePath();
      } else {
        // 사각형 (기존 로직)
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
      }

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
