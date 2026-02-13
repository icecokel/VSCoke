import * as Phaser from "phaser";
import { CosmicToggleConstants } from "../cosmic-toggle-constants";

export class MainScene extends Phaser.Scene {
  private ship: Phaser.Physics.Arcade.Image | null = null;
  private obstacles: Phaser.Physics.Arcade.Group | null = null;
  private scoreText: Phaser.GameObjects.Text | null = null;
  private spawnTimer: Phaser.Time.TimerEvent | null = null;
  private farBg: Phaser.GameObjects.TileSprite | null = null;
  private nearBg: Phaser.GameObjects.TileSprite | null = null;
  private topBoundLine: Phaser.GameObjects.Rectangle | null = null;
  private bottomBoundLine: Phaser.GameObjects.Rectangle | null = null;
  private shipAnchorX = 0;
  private score = 0;
  private isMovingUp = true;
  private isGameOver = false;
  private startedAt = 0;
  private currentObstacleSpeed = CosmicToggleConstants.BASE_OBSTACLE_SPEED;
  private currentVerticalPadding = CosmicToggleConstants.BASE_VERTICAL_PADDING;

  constructor() {
    super({ key: "MainScene" });
  }

  create() {
    this.cameras.main.setBackgroundColor("#0b1120");
    this.score = 0;
    this.isMovingUp = true;
    this.isGameOver = false;
    this.startedAt = this.time.now;
    this.currentObstacleSpeed = CosmicToggleConstants.BASE_OBSTACLE_SPEED;
    this.currentVerticalPadding = CosmicToggleConstants.BASE_VERTICAL_PADDING;
    this.createBackground();
    this.createBoundGuides();
    this.updateDifficulty(0);

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
    this.scheduleNextWave();
  }

  update(_time: number, delta: number) {
    if (this.isGameOver || !this.ship || !this.obstacles) return;

    const dt = delta / 1000;
    const elapsedMs = this.time.now - this.startedAt;
    this.updateDifficulty(elapsedMs);

    const diagonalSpeed = CosmicToggleConstants.SHIP_SPEED / Math.sqrt(2);
    const verticalSpeed = this.isMovingUp ? -diagonalSpeed : diagonalSpeed;
    const backgroundScrollSpeed = this.currentObstacleSpeed * dt;

    this.ship.x = this.shipAnchorX;
    this.ship.y += verticalSpeed * dt;

    const height = this.scale.height;
    const padding = this.currentVerticalPadding;

    if (this.farBg) {
      this.farBg.tilePositionX +=
        backgroundScrollSpeed * CosmicToggleConstants.BACKGROUND_SCROLL.FAR_FACTOR;
    }
    if (this.nearBg) {
      this.nearBg.tilePositionX +=
        backgroundScrollSpeed * CosmicToggleConstants.BACKGROUND_SCROLL.NEAR_FACTOR;
    }

    if (this.ship.y < padding || this.ship.y > height - padding) {
      this.startGameOver();
      return;
    }

    this.obstacles.children.each(child => {
      const obstacle = child as Phaser.Physics.Arcade.Image;
      if (!obstacle.active) return true;
      obstacle.setVelocityX(-this.currentObstacleSpeed);

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

  private createBoundGuides() {
    this.topBoundLine = this.add
      .rectangle(0, 0, this.scale.width, 3, 0xf43f5e, 0.8)
      .setOrigin(0, 0.5)
      .setDepth(9);

    this.bottomBoundLine = this.add
      .rectangle(0, this.scale.height, this.scale.width, 3, 0xf43f5e, 0.8)
      .setOrigin(0, 0.5)
      .setDepth(9);
  }

  private updateDifficulty(elapsedMs: number) {
    const speedStep = Math.floor(
      elapsedMs / CosmicToggleConstants.DIFFICULTY.SPEED_STEP_INTERVAL_MS,
    );
    this.currentObstacleSpeed =
      CosmicToggleConstants.BASE_OBSTACLE_SPEED *
      Math.pow(CosmicToggleConstants.DIFFICULTY.SPEED_MULTIPLIER_PER_STEP, speedStep);

    const shrinkStep = Math.floor(
      elapsedMs / CosmicToggleConstants.DIFFICULTY.MAP_SHRINK_INTERVAL_MS,
    );
    const shrinkByTime = shrinkStep * CosmicToggleConstants.DIFFICULTY.MAP_SHRINK_PER_STEP;
    const shrinkClamped = Math.min(shrinkByTime, CosmicToggleConstants.DIFFICULTY.MAP_SHRINK_MAX);
    const maxPaddingByScreen = Math.max(
      CosmicToggleConstants.BASE_VERTICAL_PADDING,
      this.scale.height / 2 - 80,
    );
    this.currentVerticalPadding = Math.min(
      CosmicToggleConstants.BASE_VERTICAL_PADDING + shrinkClamped,
      maxPaddingByScreen,
    );
    this.syncBoundGuides();
  }

  private syncBoundGuides() {
    if (!this.topBoundLine || !this.bottomBoundLine) return;

    const topY = this.currentVerticalPadding;
    const bottomY = this.scale.height - this.currentVerticalPadding;

    this.topBoundLine.setPosition(0, topY);
    this.topBoundLine.setSize(this.scale.width, 3);

    this.bottomBoundLine.setPosition(0, bottomY);
    this.bottomBoundLine.setSize(this.scale.width, 3);
  }

  private toggleDirection() {
    if (this.isGameOver || !this.ship) return;
    this.isMovingUp = !this.isMovingUp;
    this.ship.setAngle(this.isMovingUp ? -22 : 22);
  }

  private scheduleNextWave() {
    if (this.isGameOver) return;

    const obstacleCount = this.pickWaveObstacleCount();
    const yTargets = this.buildWaveYTargets(obstacleCount);
    const inWaveGap = Phaser.Math.Between(
      CosmicToggleConstants.SPAWN.IN_WAVE_GAP_MIN_MS,
      CosmicToggleConstants.SPAWN.IN_WAVE_GAP_MAX_MS,
    );

    yTargets.forEach((targetY, index) => {
      this.time.delayedCall(inWaveGap * index, () => {
        this.spawnObstacle(targetY);
      });
    });

    const nextDelay = Phaser.Math.Between(
      CosmicToggleConstants.SPAWN.WAVE_DELAY_MIN_MS,
      CosmicToggleConstants.SPAWN.WAVE_DELAY_MAX_MS,
    );

    this.spawnTimer = this.time.delayedCall(nextDelay, this.scheduleNextWave, undefined, this);
  }

  private pickWaveObstacleCount() {
    const roll = Math.random();
    if (roll < CosmicToggleConstants.SPAWN.TRIPLE_WAVE_CHANCE) return 3;
    if (
      roll <
      CosmicToggleConstants.SPAWN.TRIPLE_WAVE_CHANCE +
        CosmicToggleConstants.SPAWN.DOUBLE_WAVE_CHANCE
    ) {
      return 2;
    }
    return 1;
  }

  private buildWaveYTargets(count: number) {
    const centerMinY = this.currentVerticalPadding + 90;
    const centerMaxY = this.scale.height - this.currentVerticalPadding - 90;
    const centerY =
      centerMaxY > centerMinY ? Phaser.Math.Between(centerMinY, centerMaxY) : this.scale.height / 2;

    const direction = Math.random() < 0.5 ? -1 : 1;
    const step = Phaser.Math.Between(
      CosmicToggleConstants.SPAWN.FORMATION_STEP_MIN,
      CosmicToggleConstants.SPAWN.FORMATION_STEP_MAX,
    );

    const targets: number[] = [];
    for (let i = 0; i < count; i += 1) {
      const relative = i - (count - 1) / 2;
      targets.push(centerY + relative * step * direction);
    }
    return targets;
  }

  private spawnObstacle(targetY?: number) {
    if (this.isGameOver || !this.obstacles) return;

    const scaleX = Phaser.Math.FloatBetween(
      CosmicToggleConstants.OBSTACLE.SCALE_X_MIN,
      CosmicToggleConstants.OBSTACLE.SCALE_X_MAX,
    );
    const scaleY = Phaser.Math.FloatBetween(
      CosmicToggleConstants.OBSTACLE.SCALE_Y_MIN,
      CosmicToggleConstants.OBSTACLE.SCALE_Y_MAX,
    );
    const halfHeight = (CosmicToggleConstants.OBSTACLE.BASE_HEIGHT * scaleY) / 2;
    const spawnMargin = halfHeight + CosmicToggleConstants.OBSTACLE.SPAWN_VERTICAL_MARGIN;

    const minY = this.currentVerticalPadding + spawnMargin;
    const maxY = this.scale.height - this.currentVerticalPadding - spawnMargin;
    const safeMinY = maxY > minY ? minY : this.scale.height / 2;
    const safeMaxY = maxY > minY ? maxY : this.scale.height / 2;
    const randomY = safeMaxY > safeMinY ? Phaser.Math.Between(safeMinY, safeMaxY) : safeMinY;
    const y = Phaser.Math.Clamp(targetY ?? randomY, safeMinY, safeMaxY);

    const obstacle = this.obstacles.create(
      this.scale.width + CosmicToggleConstants.OBSTACLE.SPAWN_SIDE_OFFSET,
      y,
      "ct-obstacle",
    ) as Phaser.Physics.Arcade.Image | undefined;

    if (!obstacle) return;

    obstacle.setScale(scaleX, scaleY);
    obstacle.setDepth(6);
    obstacle.setVelocityX(-this.currentObstacleSpeed);
    obstacle.setData("passed", false);
    obstacle.setTint(Phaser.Display.Color.RandomRGB().color);
    obstacle.body?.setSize(
      obstacle.displayWidth * CosmicToggleConstants.OBSTACLE.HITBOX_SCALE_X,
      obstacle.displayHeight * CosmicToggleConstants.OBSTACLE.HITBOX_SCALE_Y,
      true,
    );
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
    this.updateDifficulty(this.time.now - this.startedAt);

    if (this.ship) {
      const y = Phaser.Math.Clamp(
        this.ship.y,
        this.currentVerticalPadding + 4,
        gameSize.height - this.currentVerticalPadding - 4,
      );
      this.ship.setPosition(this.shipAnchorX, y);
    }
  }

  private cleanup() {
    this.spawnTimer?.destroy();
    this.spawnTimer = null;
    this.input.off("pointerdown", this.toggleDirection, this);
    this.scale.off("resize", this.resize, this);
    this.game.events.off("external-resize", this.resize, this);
  }
}
