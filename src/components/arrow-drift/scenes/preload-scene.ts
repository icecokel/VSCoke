import * as Phaser from "phaser";
import { ArrowDriftConstants } from "../arrow-drift-constants";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: "PreloadScene" });
  }

  preload() {
    this.load.on("progress", (value: number) => {
      this.game.events.emit("game:progress", value);
    });

    this.load.svg("ad-fish", "/images/game/arrow-drift/player-fish.svg");
    ArrowDriftConstants.ITEM.FISH_VARIANTS.forEach(variant => {
      this.load.svg(variant.key, variant.assetPath);
    });

    const graphics = this.make.graphics({ x: 0, y: 0 }, false);
    this.createBackgroundTextures(graphics);
    this.createSeaHazardPresets(graphics);
    graphics.destroy();
  }

  private createBackgroundTextures(graphics: Phaser.GameObjects.Graphics) {
    graphics.clear();
    graphics.fillStyle(0x03132b);
    graphics.fillRect(0, 0, 256, 256);

    for (let i = 0; i < 24; i += 1) {
      graphics.fillStyle(0x0f4c81, Phaser.Math.FloatBetween(0.08, 0.2));
      graphics.fillCircle(
        Phaser.Math.Between(-30, 286),
        Phaser.Math.Between(-20, 276),
        Phaser.Math.Between(18, 56),
      );
    }

    for (let i = 0; i < 90; i += 1) {
      graphics.fillStyle(0x67e8f9, Phaser.Math.FloatBetween(0.07, 0.24));
      graphics.fillCircle(
        Phaser.Math.Between(0, 255),
        Phaser.Math.Between(0, 255),
        Phaser.Math.Between(1, 3),
      );
    }

    for (let i = 0; i < 7; i += 1) {
      const startX = Phaser.Math.Between(12, 244);
      graphics.lineStyle(2, 0xe0f2fe, Phaser.Math.FloatBetween(0.07, 0.16));
      graphics.beginPath();
      graphics.moveTo(startX, -10);
      graphics.lineTo(startX + Phaser.Math.Between(-22, 22), 266);
      graphics.strokePath();
    }

    graphics.generateTexture("ad-bg-far", 256, 256);

    graphics.clear();
    graphics.fillStyle(0x06213f);
    graphics.fillRect(0, 0, 256, 256);

    for (let i = 0; i < 22; i += 1) {
      const baseX = Phaser.Math.Between(-20, 276);
      const baseY = Phaser.Math.Between(22, 255);
      const bladeHeight = Phaser.Math.Between(26, 64);

      graphics.fillStyle(0x0f766e, Phaser.Math.FloatBetween(0.2, 0.45));
      graphics.fillEllipse(baseX, baseY, Phaser.Math.Between(10, 16), bladeHeight);
      graphics.fillStyle(0x14b8a6, Phaser.Math.FloatBetween(0.08, 0.2));
      graphics.fillEllipse(baseX + Phaser.Math.Between(-3, 3), baseY, 5, bladeHeight - 8);
    }

    for (let i = 0; i < 58; i += 1) {
      graphics.fillStyle(0xbae6fd, Phaser.Math.FloatBetween(0.1, 0.36));
      graphics.fillCircle(
        Phaser.Math.Between(0, 255),
        Phaser.Math.Between(0, 255),
        Phaser.Math.Between(2, 5),
      );
    }

    graphics.generateTexture("ad-bg-near", 256, 256);
  }

  private createSeaHazardPresets(graphics: Phaser.GameObjects.Graphics) {
    const palettes = [
      { spike: 0x0f766e, core: 0x2dd4bf, outline: 0x134e4a, glow: 0x99f6e4 },
      { spike: 0x115e59, core: 0x14b8a6, outline: 0x042f2e, glow: 0xccfbf1 },
      { spike: 0x0e7490, core: 0x22d3ee, outline: 0x164e63, glow: 0xcffafe },
      { spike: 0x0f766e, core: 0x5eead4, outline: 0x134e4a, glow: 0xf0fdfa },
      { spike: 0x1d4ed8, core: 0x38bdf8, outline: 0x1e3a8a, glow: 0xbfdbfe },
      { spike: 0x164e63, core: 0x67e8f9, outline: 0x082f49, glow: 0xe0f2fe },
      { spike: 0x155e75, core: 0x22d3ee, outline: 0x083344, glow: 0xa5f3fc },
    ];

    const dotOffsets: Array<[number, number]> = [
      [-10, -4],
      [8, -9],
      [12, 6],
      [-6, 11],
      [0, 0],
    ];

    const textureSize = ArrowDriftConstants.OBSTACLE.TEXTURE_SIZE;
    const center = textureSize / 2;

    ArrowDriftConstants.OBSTACLE.PRESET_TEXTURE_KEYS.forEach((key, index) => {
      const palette = palettes[index % palettes.length];
      const spikeCount = 12 + ((index + 1) % 3) * 2;
      const outerRadius = 30 + (index % 2) * 3;
      const innerRadius = 18 + ((index + 2) % 3) * 2;
      const points: Phaser.Geom.Point[] = [];

      for (let i = 0; i < spikeCount * 2; i += 1) {
        const angle = (Math.PI * 2 * i) / (spikeCount * 2) + index * 0.14;
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        points.push(
          new Phaser.Geom.Point(
            center + Math.cos(angle) * radius,
            center + Math.sin(angle) * radius,
          ),
        );
      }

      graphics.clear();
      graphics.fillStyle(palette.spike, 0.96);
      graphics.fillPoints(points, true);
      graphics.lineStyle(2, palette.outline, 0.55);
      graphics.strokePoints(points, true, true);

      graphics.fillStyle(palette.core, 0.95);
      graphics.fillCircle(center, center, 15 + (index % 3));
      graphics.fillStyle(palette.glow, 0.36);
      graphics.fillCircle(center - 4, center - 4, 7);

      dotOffsets.forEach(([dx, dy], dotIndex) => {
        graphics.fillStyle(palette.outline, dotIndex % 2 === 0 ? 0.36 : 0.2);
        graphics.fillCircle(center + dx, center + dy, dotIndex % 2 === 0 ? 2 : 1.5);
      });

      graphics.generateTexture(key, textureSize, textureSize);
    });
  }

  create() {
    this.game.events.emit("game:ready");
    this.game.events.on("game:start", this.startGame, this);
    this.scale.on("resize", this.resize, this);
    this.game.events.on("external-resize", this.resize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
  }

  private startGame() {
    this.cleanup();
    this.scene.start("MainScene");
  }

  private resize(gameSize: { width: number; height: number }) {
    this.cameras.main.setViewport(0, 0, gameSize.width, gameSize.height);
  }

  private cleanup() {
    this.game.events.off("game:start", this.startGame, this);
    this.scale.off("resize", this.resize, this);
    this.game.events.off("external-resize", this.resize, this);
  }
}
