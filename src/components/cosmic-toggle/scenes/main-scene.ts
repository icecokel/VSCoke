import * as Phaser from "phaser";
import { CosmicToggleConstants } from "../cosmic-toggle-constants";

export class MainScene extends Phaser.Scene {
  private ship: Phaser.Physics.Arcade.Image | null = null;
  private obstacles: Phaser.Physics.Arcade.Group | null = null;
  private scoreText: Phaser.GameObjects.Text | null = null;
  private spawnTimer: Phaser.Time.TimerEvent | null = null;
  private farBg: Phaser.GameObjects.TileSprite | null = null;
  private nearBg: Phaser.GameObjects.TileSprite | null = null;
  private shipAnchorX = 0;
  private score = 0;
  private isMovingUp = true;
  private isGameOver = false;

  constructor() {
    super({ key: "MainScene" });
  }

  create() {
    this.cameras.main.setBackgroundColor("#0b1120");
    this.score = 0;
    this.isMovingUp = true;
    this.isGameOver = false;
    this.createBackground();

    this.shipAnchorX = this.scale.width * 0.25;
    const shipX = this.shipAnchorX;
    const shipY = this.scale.height / 2;
    this.ship = this.physics.add.image(shipX, shipY, "ct-ship");
    this.ship.setDepth(5);
    this.ship.setCollideWorldBounds(false);
    this.ship.setAngle(-22);
    this.ship.body?.setSize(28, 16, true);

    this.obstacles = this.physics.add.group({
      allowGravity: false,
      immovable: true,
    });

    this.physics.add.overlap(this.ship, this.obstacles, this.handleHitObstacle, undefined, this);

    this.scoreText = this.add.text(16, 16, "Score: 0", {
      fontSize: "24px",
      color: "#ffffff",
      fontStyle: "bold",
    });
    this.scoreText.setDepth(10);

    this.input.on("pointerdown", this.toggleDirection, this);
    this.scale.on("resize", this.resize, this);
    this.game.events.on("external-resize", this.resize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);

    this.spawnTimer = this.time.addEvent({
      delay: CosmicToggleConstants.OBSTACLE_SPAWN_DELAY,
      loop: true,
      callback: this.spawnObstacle,
      callbackScope: this,
    });
  }

  update(_time: number, delta: number) {
    if (this.isGameOver || !this.ship || !this.obstacles) return;

    const dt = delta / 1000;
    const diagonalSpeed = CosmicToggleConstants.SHIP_SPEED / Math.sqrt(2);
    const verticalSpeed = this.isMovingUp ? -diagonalSpeed : diagonalSpeed;
    const backgroundScrollSpeed = CosmicToggleConstants.OBSTACLE_SPEED * dt;

    this.ship.x = this.shipAnchorX;
    this.ship.y += verticalSpeed * dt;

    const height = this.scale.height;
    const padding = CosmicToggleConstants.VERTICAL_PADDING;

    if (this.farBg) this.farBg.tilePositionX += backgroundScrollSpeed * 0.25;
    if (this.nearBg) this.nearBg.tilePositionX += backgroundScrollSpeed * 0.55;

    if (this.ship.y < padding || this.ship.y > height - padding) {
      this.startGameOver();
      return;
    }

    this.obstacles.children.each(child => {
      const obstacle = child as Phaser.Physics.Arcade.Image;
      if (!obstacle.active) return true;

      const alreadyPassed = Boolean(obstacle.getData("passed"));
      if (!alreadyPassed && obstacle.x + obstacle.displayWidth / 2 < this.ship!.x) {
        obstacle.setData("passed", true);
        this.score += 1;
        this.scoreText?.setText(`Score: ${this.score}`);
      }

      if (obstacle.x < -obstacle.displayWidth) {
        obstacle.destroy();
      }
      return true;
    });
  }

  private createBackground() {
    this.farBg = this.add
      .tileSprite(0, 0, this.scale.width, this.scale.height, "ct-bg-far")
      .setOrigin(0, 0)
      .setDepth(0);

    this.nearBg = this.add
      .tileSprite(0, 0, this.scale.width, this.scale.height, "ct-bg-near")
      .setOrigin(0, 0)
      .setAlpha(0.9)
      .setDepth(1);
  }

  private toggleDirection() {
    if (this.isGameOver || !this.ship) return;
    this.isMovingUp = !this.isMovingUp;
    this.ship.setAngle(this.isMovingUp ? -22 : 22);
  }

  private spawnObstacle() {
    if (this.isGameOver || !this.obstacles) return;

    const minY = 70;
    const maxY = Math.max(minY, this.scale.height - 70);
    const y = Phaser.Math.Between(minY, maxY);
    const obstacle = this.obstacles.create(this.scale.width + 44, y, "ct-obstacle") as
      | Phaser.Physics.Arcade.Image
      | undefined;

    if (!obstacle) return;

    obstacle.setDepth(6);
    obstacle.setVelocityX(-CosmicToggleConstants.OBSTACLE_SPEED);
    obstacle.setData("passed", false);
    obstacle.setTint(Phaser.Display.Color.RandomRGB().color);
  }

  private handleHitObstacle() {
    this.startGameOver();
  }

  private startGameOver() {
    if (this.isGameOver) return;

    this.isGameOver = true;
    this.spawnTimer?.destroy();
    this.spawnTimer = null;
    this.scene.start("GameOverScene", { score: this.score });
  }

  private resize(gameSize: { width: number; height: number }) {
    this.cameras.main.setViewport(0, 0, gameSize.width, gameSize.height);
    this.shipAnchorX = gameSize.width * 0.25;
    this.farBg?.setSize(gameSize.width, gameSize.height);
    this.nearBg?.setSize(gameSize.width, gameSize.height);

    if (this.ship) {
      const y = Phaser.Math.Clamp(this.ship.y, 20, gameSize.height - 20);
      this.ship.setPosition(this.shipAnchorX, y);
    }
  }

  private cleanup() {
    this.input.off("pointerdown", this.toggleDirection, this);
    this.scale.off("resize", this.resize, this);
    this.game.events.off("external-resize", this.resize, this);
  }
}
