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

    const graphics = this.make.graphics({ x: 0, y: 0 }, false);

    graphics.fillStyle(0x020617);
    graphics.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 90; i += 1) {
      graphics.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.15, 0.65));
      graphics.fillCircle(
        Phaser.Math.Between(0, 255),
        Phaser.Math.Between(0, 255),
        Phaser.Math.Between(1, 2),
      );
    }
    graphics.generateTexture("ad-bg-far", 256, 256);

    graphics.clear();
    graphics.fillStyle(0x0f172a);
    graphics.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 45; i += 1) {
      graphics.fillStyle(0x67e8f9, Phaser.Math.FloatBetween(0.08, 0.28));
      graphics.fillCircle(
        Phaser.Math.Between(0, 255),
        Phaser.Math.Between(0, 255),
        Phaser.Math.Between(2, 6),
      );
    }
    graphics.generateTexture("ad-bg-near", 256, 256);

    graphics.clear();
    const arrowShape = [
      new Phaser.Geom.Point(36, 14),
      new Phaser.Geom.Point(23, 6),
      new Phaser.Geom.Point(23, 9),
      new Phaser.Geom.Point(9, 9),
      new Phaser.Geom.Point(9, 19),
      new Phaser.Geom.Point(23, 19),
      new Phaser.Geom.Point(23, 22),
    ];
    graphics.fillStyle(ArrowDriftConstants.ARROW_COLOR);
    graphics.fillPoints(arrowShape, true);
    graphics.generateTexture("ad-arrow", 38, 28);

    this.createAsteroidPresets(graphics);
    this.createScoreItemTexture(graphics);

    graphics.destroy();
  }

  private createAsteroidPresets(graphics: Phaser.GameObjects.Graphics) {
    const presets = [
      {
        color: 0x8d6e63,
        shade: 0x4e342e,
        points: [
          [16, 48],
          [24, 24],
          [44, 14],
          [69, 18],
          [82, 36],
          [79, 62],
          [60, 82],
          [35, 80],
          [20, 66],
        ],
        craters: [
          [36, 38, 8],
          [60, 56, 6],
        ],
      },
      {
        color: 0xa1887f,
        shade: 0x5d4037,
        points: [
          [14, 44],
          [30, 20],
          [52, 12],
          [74, 20],
          [84, 44],
          [78, 70],
          [57, 83],
          [33, 78],
          [18, 62],
        ],
        craters: [
          [44, 32, 7],
          [58, 62, 5],
        ],
      },
      {
        color: 0x6d4c41,
        shade: 0x3e2723,
        points: [
          [20, 50],
          [25, 28],
          [43, 16],
          [63, 17],
          [80, 31],
          [82, 52],
          [71, 72],
          [47, 84],
          [28, 77],
          [17, 63],
        ],
        craters: [
          [33, 55, 6],
          [60, 39, 8],
        ],
      },
      {
        color: 0x8d6e63,
        shade: 0x4e342e,
        points: [
          [13, 52],
          [19, 31],
          [39, 17],
          [61, 15],
          [78, 23],
          [86, 43],
          [80, 66],
          [64, 82],
          [42, 84],
          [23, 73],
        ],
        craters: [
          [49, 36, 7],
          [31, 63, 6],
        ],
      },
      {
        color: 0x795548,
        shade: 0x3e2723,
        points: [
          [18, 40],
          [33, 18],
          [57, 12],
          [74, 25],
          [84, 46],
          [76, 71],
          [50, 83],
          [30, 79],
          [16, 61],
        ],
        craters: [
          [42, 47, 9],
          [63, 55, 5],
        ],
      },
      {
        color: 0x9c7b6c,
        shade: 0x5d4037,
        points: [
          [12, 47],
          [20, 27],
          [36, 14],
          [58, 14],
          [77, 28],
          [84, 49],
          [77, 72],
          [56, 84],
          [33, 80],
          [17, 66],
        ],
        craters: [
          [29, 42, 6],
          [54, 60, 8],
        ],
      },
      {
        color: 0x7b5e57,
        shade: 0x3e2723,
        points: [
          [15, 52],
          [23, 29],
          [42, 16],
          [68, 17],
          [82, 36],
          [81, 60],
          [66, 79],
          [40, 84],
          [22, 72],
        ],
        craters: [
          [37, 33, 7],
          [60, 50, 6],
        ],
      },
    ];

    const textureSize = ArrowDriftConstants.OBSTACLE.TEXTURE_SIZE;

    ArrowDriftConstants.OBSTACLE.PRESET_TEXTURE_KEYS.forEach((key, index) => {
      const preset = presets[index % presets.length];
      const points = preset.points.map(([x, y]) => new Phaser.Geom.Point(x, y));

      graphics.clear();
      graphics.fillStyle(preset.color);
      graphics.fillPoints(points, true);
      graphics.lineStyle(2, preset.shade, 0.45);
      graphics.strokePoints(points, true, true);

      preset.craters.forEach(([x, y, radius]) => {
        graphics.fillStyle(preset.shade, 0.34);
        graphics.fillCircle(x, y, radius);
        graphics.lineStyle(1, preset.shade, 0.25);
        graphics.strokeCircle(x, y, radius);
      });

      graphics.generateTexture(key, textureSize, textureSize);
    });
  }

  private createScoreItemTexture(graphics: Phaser.GameObjects.Graphics) {
    const textureSize = ArrowDriftConstants.ITEM.TEXTURE_SIZE;
    const center = textureSize / 2;
    const outerRadius = textureSize * 0.36;
    const innerRadius = textureSize * 0.16;
    const points: Phaser.Geom.Point[] = [];

    for (let i = 0; i < 10; i += 1) {
      const angle = -Math.PI / 2 + i * (Math.PI / 5);
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      points.push(
        new Phaser.Geom.Point(center + Math.cos(angle) * radius, center + Math.sin(angle) * radius),
      );
    }

    graphics.clear();
    graphics.fillStyle(0xfacc15);
    graphics.fillPoints(points, true);
    graphics.lineStyle(3, 0xfef3c7, 0.95);
    graphics.strokePoints(points, true, true);
    graphics.fillStyle(0xffffff, 0.5);
    graphics.fillCircle(
      center - textureSize * 0.12,
      center - textureSize * 0.15,
      textureSize * 0.08,
    );
    graphics.generateTexture(ArrowDriftConstants.ITEM.TEXTURE_KEY, textureSize, textureSize);
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
