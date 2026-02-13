import * as Phaser from "phaser";

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
    graphics.generateTexture("ct-bg-far", 256, 256);

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
    graphics.generateTexture("ct-bg-near", 256, 256);

    graphics.clear();
    const arrowShape = [
      new Phaser.Geom.Point(2, 14),
      new Phaser.Geom.Point(22, 3),
      new Phaser.Geom.Point(22, 9),
      new Phaser.Geom.Point(40, 9),
      new Phaser.Geom.Point(40, 19),
      new Phaser.Geom.Point(22, 19),
      new Phaser.Geom.Point(22, 25),
    ];
    graphics.fillStyle(0x67e8f9);
    graphics.fillPoints(arrowShape, true);
    graphics.lineStyle(2, 0xe0f2fe, 0.9);
    graphics.strokePoints(arrowShape, true, true);
    graphics.generateTexture("ct-arrow", 42, 28);

    graphics.clear();
    graphics.fillStyle(0xfb7185);
    graphics.fillRoundedRect(0, 0, 52, 120, 10);
    graphics.lineStyle(2, 0xffffff, 0.3);
    graphics.strokeRoundedRect(1, 1, 50, 118, 9);
    graphics.generateTexture("ct-obstacle", 52, 120);

    graphics.destroy();
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
