import * as Phaser from "phaser";
import { FishDriftConstants } from "../fish-drift-constants";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: "PreloadScene" });
  }

  preload() {
    this.load.on("progress", (value: number) => {
      this.game.events.emit("game:progress", value);
    });

    this.load.svg("ad-fish-0", "/images/game/fish-drift/player-fish-frame-0.svg");
    this.load.svg("ad-fish-1", "/images/game/fish-drift/player-fish-frame-1.svg");
    this.load.svg("ad-fish-2", "/images/game/fish-drift/player-fish-frame-2.svg");
    FishDriftConstants.ITEM.FISH_VARIANTS.forEach(variant => {
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

    for (let i = 0; i < 380; i += 1) {
      const px = Phaser.Math.Between(0, 127) * 2;
      const py = Phaser.Math.Between(0, 127) * 2;
      graphics.fillStyle(0x0f4c81, Phaser.Math.FloatBetween(0.1, 0.26));
      graphics.fillRect(px, py, 2, 2);
    }

    for (let i = 0; i < 70; i += 1) {
      const startX = Phaser.Math.Between(6, 122) * 2;
      const startY = Phaser.Math.Between(0, 120) * 2;
      const length = Phaser.Math.Between(6, 16);
      graphics.fillStyle(0x93c5fd, Phaser.Math.FloatBetween(0.08, 0.22));
      for (let j = 0; j < length; j += 1) {
        graphics.fillRect(startX + (j % 2 === 0 ? 0 : 2), startY + j * 2, 2, 2);
      }
    }

    for (let i = 0; i < 120; i += 1) {
      graphics.fillStyle(0x67e8f9, Phaser.Math.FloatBetween(0.07, 0.24));
      graphics.fillRect(Phaser.Math.Between(0, 127) * 2, Phaser.Math.Between(0, 127) * 2, 2, 2);
    }

    graphics.generateTexture("ad-bg-far", 256, 256);

    graphics.clear();
    graphics.fillStyle(0x06213f);
    graphics.fillRect(0, 0, 256, 256);

    for (let i = 0; i < 34; i += 1) {
      const stemX = Phaser.Math.Between(2, 122) * 2;
      const stemBaseY = Phaser.Math.Between(82, 127) * 2;
      const stemHeight = Phaser.Math.Between(10, 28);
      for (let y = 0; y < stemHeight; y += 1) {
        const wobble = Math.floor(Math.sin((y + i) * 0.45) * 1);
        graphics.fillStyle(y % 3 === 0 ? 0x14b8a6 : 0x0f766e, Phaser.Math.FloatBetween(0.3, 0.55));
        graphics.fillRect(stemX + wobble * 2, stemBaseY - y * 2, 2, 2);
      }
    }

    for (let i = 0; i < 140; i += 1) {
      graphics.fillStyle(0x0369a1, Phaser.Math.FloatBetween(0.12, 0.3));
      graphics.fillRect(Phaser.Math.Between(0, 127) * 2, Phaser.Math.Between(0, 127) * 2, 2, 2);
    }

    for (let i = 0; i < 84; i += 1) {
      graphics.fillStyle(0xbae6fd, Phaser.Math.FloatBetween(0.1, 0.36));
      graphics.fillRect(Phaser.Math.Between(0, 127) * 2, Phaser.Math.Between(0, 127) * 2, 2, 2);
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

    const textureSize = FishDriftConstants.OBSTACLE.TEXTURE_SIZE;
    const center = textureSize / 2;

    FishDriftConstants.OBSTACLE.PRESET_TEXTURE_KEYS.forEach((key, index) => {
      const palette = palettes[index % palettes.length];
      graphics.clear();
      const cell = 4;
      const gridSize = textureSize / cell;
      const c = Math.floor(gridSize / 2);

      for (let gy = 0; gy < gridSize; gy += 1) {
        for (let gx = 0; gx < gridSize; gx += 1) {
          const dx = gx - c;
          const dy = gy - c;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const axis = dx === 0 || dy === 0;
          const diag = Math.abs(Math.abs(dx) - Math.abs(dy)) <= 0.6;
          const wave = (gx + gy + index) % 3 === 0;

          if (dist <= 2.7) {
            graphics.fillStyle(palette.core, 0.96);
            graphics.fillRect(gx * cell, gy * cell, cell, cell);
            continue;
          }

          if (dist <= 4.2) {
            graphics.fillStyle(palette.glow, 0.72);
            graphics.fillRect(gx * cell, gy * cell, cell, cell);
            continue;
          }

          if (dist <= 8.8 && (axis || diag || wave)) {
            graphics.fillStyle(palette.spike, 0.94);
            graphics.fillRect(gx * cell, gy * cell, cell, cell);
            continue;
          }

          if (dist <= 9.6 && (axis || diag)) {
            graphics.fillStyle(palette.outline, 0.9);
            graphics.fillRect(gx * cell, gy * cell, cell, cell);
          }
        }
      }

      dotOffsets.forEach(([dx, dy], dotIndex) => {
        graphics.fillStyle(dotIndex % 2 === 0 ? palette.outline : palette.glow, 0.75);
        graphics.fillRect((center + dx) & ~3, (center + dy) & ~3, cell, cell);
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
