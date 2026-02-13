import * as Phaser from "phaser";
import { CosmicToggleConstants } from "../cosmic-toggle-constants";

export class MainScene extends Phaser.Scene {
  private ship: Phaser.Physics.Arcade.Image | null = null;
  private trailGraphics: Phaser.GameObjects.Graphics | null = null;
  private trailNodes: Phaser.Math.Vector2[] = [];
  private obstacles: Phaser.Physics.Arcade.Group | null = null;
  private scoreText: Phaser.GameObjects.Text | null = null;
  private playTimeText: Phaser.GameObjects.Text | null = null;
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
  private readonly trailAnchorRatio = 0.28;

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
    this.ship = this.physics.add.image(shipX, shipY, "ct-arrow");
    this.ship.setDepth(5);
    this.ship.setCollideWorldBounds(false);
    this.ship.setAngle(-35);
    this.ship.body?.setSize(
      CosmicToggleConstants.SHIP_HITBOX_WIDTH,
      CosmicToggleConstants.SHIP_HITBOX_HEIGHT,
      true,
    );
    this.initTrail();

    this.obstacles = this.physics.add.group({
      allowGravity: false,
      immovable: true,
    });

    this.physics.add.overlap(this.ship, this.obstacles, this.handleHitObstacle, undefined, this);

    this.scoreText = this.add.text(16, 16, "0", {
      fontSize: "24px",
      color: "#ffffff",
      fontStyle: "bold",
    });
    this.scoreText.setDepth(10);
    this.playTimeText = this.add
      .text(this.scale.width - 16, 16, "00:00", {
        fontSize: "22px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(1, 0)
      .setDepth(10);

    this.input.on("pointerdown", this.toggleDirection, this);
    this.scale.on("resize", this.resize, this);
    this.game.events.on("external-resize", this.resize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.spawnTimer = this.time.delayedCall(
      CosmicToggleConstants.SPAWN.INITIAL_GRACE_MS,
      this.scheduleNextWave,
      undefined,
      this,
    );
  }

  update(time: number, delta: number) {
    if (this.isGameOver || !this.ship || !this.obstacles) return;

    const dt = delta / 1000;
    const elapsedMs = this.time.now - this.startedAt;
    this.updateDifficulty(elapsedMs);
    this.playTimeText?.setText(this.formatPlayTime(elapsedMs));

    const diagonalSpeed = CosmicToggleConstants.SHIP_SPEED / Math.sqrt(2);
    const verticalSpeed = this.isMovingUp ? -diagonalSpeed : diagonalSpeed;
    const backgroundScrollSpeed = this.currentObstacleSpeed * dt;

    this.ship.x = this.shipAnchorX;
    this.ship.y += verticalSpeed * dt;
    this.updateTrail(time, dt);

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
        this.scoreText?.setText(`${this.score}`);
      }

      if (obstacle.x < -obstacle.displayWidth) {
        obstacle.destroy();
      }
      return true;
    });
  }

  private initTrail() {
    if (!this.ship) return;
    this.trailGraphics?.destroy();
    this.trailGraphics = this.add.graphics();
    this.trailGraphics.setDepth(4);
    this.trailNodes = [];

    const startX = this.ship.x - this.ship.displayWidth * this.trailAnchorRatio;
    const startY = this.ship.y;
    const segmentCount = 20;
    const spacing = 8;

    for (let i = 0; i < segmentCount; i += 1) {
      this.trailNodes.push(new Phaser.Math.Vector2(startX - i * spacing, startY));
    }
  }

  private updateTrail(time: number, dt: number) {
    if (!this.ship || !this.trailGraphics || this.trailNodes.length === 0) return;

    const anchorX = this.ship.x - this.ship.displayWidth * this.trailAnchorRatio;
    const anchorY = this.ship.y;
    const steer = this.isMovingUp ? -1 : 1;
    const sway = Math.sin(time * 0.01) * 4 + Math.sin(time * 0.023) * 2;
    const headFollow = Math.min(1, dt * 16);

    this.trailNodes[0].x = Phaser.Math.Linear(this.trailNodes[0].x, anchorX, headFollow);
    this.trailNodes[0].y = Phaser.Math.Linear(this.trailNodes[0].y, anchorY, headFollow);

    for (let i = 1; i < this.trailNodes.length; i += 1) {
      const prev = this.trailNodes[i - 1];
      const current = this.trailNodes[i];
      const follow = Math.max(0.08, 0.42 - i * 0.015);
      const lagX = prev.x - 7.5;
      const lagY = prev.y + steer * i * 0.18 + sway * (1 - i / this.trailNodes.length) * 0.35;

      current.x = Phaser.Math.Linear(current.x, lagX, follow);
      current.y = Phaser.Math.Linear(current.y, lagY, follow);
    }

    this.drawTrail(time);
  }

  private drawTrail(time: number) {
    if (!this.trailGraphics || this.trailNodes.length < 2) return;

    this.trailGraphics.clear();
    const glowColor = CosmicToggleConstants.ARROW_COLOR;

    for (let i = 0; i < this.trailNodes.length - 1; i += 1) {
      const a = this.trailNodes[i];
      const b = this.trailNodes[i + 1];
      const t = i / (this.trailNodes.length - 1);
      const width = (1 - t) * 9 + 1.4;
      const alpha = (1 - t) * 0.62 + 0.08;
      const jitter = Math.sin(time * 0.015 + i * 0.7) * 0.4;

      this.trailGraphics.lineStyle(width, glowColor, alpha);
      this.trailGraphics.beginPath();
      this.trailGraphics.moveTo(a.x, a.y);
      this.trailGraphics.lineTo(b.x, b.y + jitter);
      this.trailGraphics.strokePath();
    }
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
    this.ship.setAngle(this.isMovingUp ? -35 : 35);
  }

  private scheduleNextWave() {
    if (this.isGameOver) return;

    const elapsedMs = this.time.now - this.startedAt;
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

    const rampProgress = Phaser.Math.Clamp(
      elapsedMs / CosmicToggleConstants.SPAWN.WAVE_DELAY_RAMP_MS,
      0,
      1,
    );
    const dynamicMinDelay = Phaser.Math.Linear(
      CosmicToggleConstants.SPAWN.WAVE_DELAY_START_MIN_MS,
      CosmicToggleConstants.SPAWN.WAVE_DELAY_MIN_MS,
      rampProgress,
    );
    const dynamicMaxDelay = Phaser.Math.Linear(
      CosmicToggleConstants.SPAWN.WAVE_DELAY_START_MAX_MS,
      CosmicToggleConstants.SPAWN.WAVE_DELAY_MAX_MS,
      rampProgress,
    );
    const nextDelay = Phaser.Math.Between(Math.round(dynamicMinDelay), Math.round(dynamicMaxDelay));
    const waveDuration = inWaveGap * Math.max(0, obstacleCount - 1);

    this.spawnTimer = this.time.delayedCall(
      waveDuration + nextDelay,
      this.scheduleNextWave,
      undefined,
      this,
    );
  }

  private pickWaveObstacleCount() {
    const elapsedMs = this.time.now - this.startedAt;
    const rampProgress = Phaser.Math.Clamp(
      elapsedMs / CosmicToggleConstants.SPAWN.MULTI_WAVE_RAMP_MS,
      0,
      1,
    );
    const tripleChance = Phaser.Math.Linear(
      CosmicToggleConstants.SPAWN.TRIPLE_WAVE_CHANCE_START,
      CosmicToggleConstants.SPAWN.TRIPLE_WAVE_CHANCE_END,
      rampProgress,
    );
    const doubleChance = Phaser.Math.Linear(
      CosmicToggleConstants.SPAWN.DOUBLE_WAVE_CHANCE_START,
      CosmicToggleConstants.SPAWN.DOUBLE_WAVE_CHANCE_END,
      rampProgress,
    );
    const roll = Math.random();
    if (roll < tripleChance) return 3;
    if (roll < tripleChance + doubleChance) {
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

    const textureKey = Phaser.Utils.Array.GetRandom(
      CosmicToggleConstants.OBSTACLE.PRESET_TEXTURE_KEYS,
    );
    const scaleX = Phaser.Math.FloatBetween(
      CosmicToggleConstants.OBSTACLE.SCALE_X_MIN,
      CosmicToggleConstants.OBSTACLE.SCALE_X_MAX,
    );
    const scaleY = Phaser.Math.FloatBetween(
      CosmicToggleConstants.OBSTACLE.SCALE_Y_MIN,
      CosmicToggleConstants.OBSTACLE.SCALE_Y_MAX,
    );

    const obstacle = this.obstacles.create(
      this.scale.width + CosmicToggleConstants.OBSTACLE.SPAWN_SIDE_OFFSET,
      this.scale.height / 2,
      textureKey,
    ) as Phaser.Physics.Arcade.Image | undefined;

    if (!obstacle) return;

    obstacle.setScale(scaleX, scaleY);
    const halfHeight = obstacle.displayHeight / 2;
    const spawnMargin = halfHeight + CosmicToggleConstants.OBSTACLE.SPAWN_VERTICAL_MARGIN;
    const minY = this.currentVerticalPadding + spawnMargin;
    const maxY = this.scale.height - this.currentVerticalPadding - spawnMargin;
    const safeMinY = maxY > minY ? minY : this.scale.height / 2;
    const safeMaxY = maxY > minY ? maxY : this.scale.height / 2;
    const randomY = safeMaxY > safeMinY ? Phaser.Math.Between(safeMinY, safeMaxY) : safeMinY;
    const y = Phaser.Math.Clamp(targetY ?? randomY, safeMinY, safeMaxY);
    obstacle.setY(y);

    obstacle.setDepth(6);
    obstacle.setAngle(Phaser.Math.Between(0, 359));
    obstacle.setVelocityX(-this.currentObstacleSpeed);
    obstacle.setData("passed", false);
    const coreHitboxSize =
      Math.min(obstacle.displayWidth, obstacle.displayHeight) *
      CosmicToggleConstants.OBSTACLE.HITBOX_CORE_SCALE;
    obstacle.body?.setSize(coreHitboxSize, coreHitboxSize, true);
  }

  private handleHitObstacle() {
    this.startGameOver();
  }

  private startGameOver() {
    if (this.isGameOver) return;

    this.isGameOver = true;
    this.spawnTimer?.destroy();
    this.spawnTimer = null;
    this.input.off("pointerdown", this.toggleDirection, this);

    if (this.ship) {
      const shipBody = this.ship.body as Phaser.Physics.Arcade.Body | null;
      shipBody?.stop();
      if (shipBody) shipBody.enable = false;
    }

    this.obstacles?.children.each(child => {
      const obstacle = child as Phaser.Physics.Arcade.Image;
      const obstacleBody = obstacle.body as Phaser.Physics.Arcade.Body | null;
      obstacleBody?.stop();
      if (obstacleBody) obstacleBody.enable = false;
      return true;
    });

    this.playArrowExplosion(() => {
      this.scene.start("GameOverScene", { score: this.score });
    });
  }

  private playArrowExplosion(onComplete: () => void) {
    if (!this.ship) {
      onComplete();
      return;
    }

    const originX = this.ship.x;
    const originY = this.ship.y;

    this.trailGraphics?.clear();
    this.ship.setVisible(false);

    const flash = this.add.circle(originX, originY, 8, 0xffffff, 0.95).setDepth(15);
    this.tweens.add({
      targets: flash,
      scaleX: 3.2,
      scaleY: 3.2,
      alpha: 0,
      duration: 220,
      ease: "Cubic.Out",
      onComplete: () => flash.destroy(),
    });

    const blastRing = this.add.circle(originX, originY, 10, 0xffffff, 0).setDepth(14);
    blastRing.setStrokeStyle(3, 0xff9aa6, 0.9);
    this.tweens.add({
      targets: blastRing,
      scaleX: 3.6,
      scaleY: 3.6,
      alpha: 0,
      duration: 280,
      ease: "Quart.Out",
      onComplete: () => blastRing.destroy(),
    });

    const shardCount = 20;
    for (let i = 0; i < shardCount; i += 1) {
      const shard = this.add
        .rectangle(
          originX,
          originY,
          Phaser.Math.Between(5, 12),
          Phaser.Math.Between(2, 4),
          i % 4 === 0 ? 0xffd7dc : CosmicToggleConstants.ARROW_COLOR,
          0.95,
        )
        .setDepth(15);
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.Between(34, 112);
      const targetX = originX + Math.cos(angle) * distance;
      const targetY = originY + Math.sin(angle) * distance;

      shard.setRotation(angle);
      this.tweens.add({
        targets: shard,
        x: targetX,
        y: targetY,
        alpha: 0,
        scaleX: 0.25,
        scaleY: 0.25,
        duration: Phaser.Math.Between(260, 420),
        ease: "Cubic.Out",
        onComplete: () => shard.destroy(),
      });
    }

    const sparkCount = 14;
    for (let i = 0; i < sparkCount; i += 1) {
      const spark = this.add
        .circle(
          originX,
          originY,
          Phaser.Math.FloatBetween(1.2, 2.6),
          i % 2 === 0 ? 0xffffff : 0xff9aa6,
          0.9,
        )
        .setDepth(15);
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.Between(28, 92);
      this.tweens.add({
        targets: spark,
        x: originX + Math.cos(angle) * distance,
        y: originY + Math.sin(angle) * distance,
        alpha: 0,
        duration: Phaser.Math.Between(180, 320),
        ease: "Sine.Out",
        onComplete: () => spark.destroy(),
      });
    }

    this.time.delayedCall(420, onComplete);
  }

  private resize(gameSize: { width: number; height: number }) {
    this.cameras.main.setViewport(0, 0, gameSize.width, gameSize.height);
    this.shipAnchorX = gameSize.width * 0.25;
    this.farBg?.setSize(gameSize.width, gameSize.height);
    this.nearBg?.setSize(gameSize.width, gameSize.height);
    this.playTimeText?.setPosition(gameSize.width - 16, 16);
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
    this.trailGraphics?.destroy();
    this.trailGraphics = null;
    this.trailNodes = [];
    this.playTimeText = null;
    this.spawnTimer?.destroy();
    this.spawnTimer = null;
    this.input.off("pointerdown", this.toggleDirection, this);
    this.scale.off("resize", this.resize, this);
    this.game.events.off("external-resize", this.resize, this);
  }

  private formatPlayTime(elapsedMs: number) {
    const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
}
