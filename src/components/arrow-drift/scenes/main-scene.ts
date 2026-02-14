import * as Phaser from "phaser";
import { ArrowDriftConstants } from "../arrow-drift-constants";

export class MainScene extends Phaser.Scene {
  private arrow: Phaser.Physics.Arcade.Image | null = null;
  private trailGraphics: Phaser.GameObjects.Graphics | null = null;
  private trailNodes: Phaser.Math.Vector2[] = [];
  private obstacles: Phaser.Physics.Arcade.Group | null = null;
  private scoreText: Phaser.GameObjects.Text | null = null;
  private playTimeText: Phaser.GameObjects.Text | null = null;
  private speedUpText: Phaser.GameObjects.Text | null = null;
  private spawnTimer: Phaser.Time.TimerEvent | null = null;
  private farBg: Phaser.GameObjects.TileSprite | null = null;
  private nearBg: Phaser.GameObjects.TileSprite | null = null;
  private topBoundLine: Phaser.GameObjects.Rectangle | null = null;
  private bottomBoundLine: Phaser.GameObjects.Rectangle | null = null;
  private arrowAnchorX = 0;
  private score = 0;
  private isMovingUp = true;
  private isGameOver = false;
  private startedAt = 0;
  private currentObstacleSpeed = ArrowDriftConstants.BASE_OBSTACLE_SPEED;
  private currentVerticalPadding = ArrowDriftConstants.BASE_VERTICAL_PADDING;
  private currentSpeedStep = 0;
  private readonly trailAnchorRatio = 0.31;

  constructor() {
    super({ key: "MainScene" });
  }

  create() {
    this.cameras.main.setBackgroundColor("#0b1120");
    this.score = 0;
    this.isMovingUp = true;
    this.isGameOver = false;
    this.startedAt = this.time.now;
    this.currentObstacleSpeed = ArrowDriftConstants.BASE_OBSTACLE_SPEED;
    this.currentVerticalPadding = ArrowDriftConstants.BASE_VERTICAL_PADDING;
    this.currentSpeedStep = 0;
    this.createBackground();
    this.createBoundGuides();
    this.updateDifficulty(0);

    this.arrowAnchorX = this.scale.width * 0.25;
    const arrowX = this.arrowAnchorX;
    const arrowY = this.scale.height / 2;
    this.arrow = this.physics.add.image(arrowX, arrowY, "ad-arrow");
    this.arrow.setDepth(5);
    this.arrow.setCollideWorldBounds(false);
    this.arrow.setAngle(-35);
    this.arrow.body?.setSize(
      ArrowDriftConstants.ARROW_HITBOX_WIDTH,
      ArrowDriftConstants.ARROW_HITBOX_HEIGHT,
      true,
    );
    this.initTrail();

    this.obstacles = this.physics.add.group({
      allowGravity: false,
      immovable: true,
    });

    this.physics.add.overlap(this.arrow, this.obstacles, this.handleHitObstacle, undefined, this);

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
    this.speedUpText = this.add
      .text(this.scale.width / 2, 56, "", {
        fontSize: "20px",
        color: "#fda4af",
        fontStyle: "bold",
      })
      .setOrigin(0.5, 0)
      .setDepth(11)
      .setAlpha(0);

    this.input.on("pointerdown", this.toggleDirection, this);
    this.input.keyboard?.on("keydown-SPACE", this.handleSpaceToggle, this);
    this.scale.on("resize", this.resize, this);
    this.game.events.on("external-resize", this.resize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.spawnTimer = this.time.delayedCall(
      ArrowDriftConstants.SPAWN.INITIAL_GRACE_MS,
      this.scheduleNextWave,
      undefined,
      this,
    );
  }

  update(time: number, delta: number) {
    if (this.isGameOver || !this.arrow || !this.obstacles) return;

    const dt = delta / 1000;
    const elapsedMs = this.time.now - this.startedAt;
    this.updateDifficulty(elapsedMs);
    this.playTimeText?.setText(this.formatPlayTime(elapsedMs));

    const diagonalSpeed = ArrowDriftConstants.ARROW_SPEED / Math.sqrt(2);
    const verticalSpeed = this.isMovingUp ? -diagonalSpeed : diagonalSpeed;
    const backgroundScrollSpeed = this.currentObstacleSpeed * dt;

    this.arrow.x = this.arrowAnchorX;
    this.arrow.y += verticalSpeed * dt;
    this.updateTrail(time, dt);

    const height = this.scale.height;
    const padding = this.currentVerticalPadding;

    if (this.farBg) {
      this.farBg.tilePositionX +=
        backgroundScrollSpeed * ArrowDriftConstants.BACKGROUND_SCROLL.FAR_FACTOR;
    }
    if (this.nearBg) {
      this.nearBg.tilePositionX +=
        backgroundScrollSpeed * ArrowDriftConstants.BACKGROUND_SCROLL.NEAR_FACTOR;
    }

    if (this.arrow.y < padding || this.arrow.y > height - padding) {
      this.startGameOver();
      return;
    }

    this.obstacles.children.each(child => {
      const obstacle = child as Phaser.Physics.Arcade.Image;
      if (!obstacle.active) return true;
      obstacle.setVelocityX(-this.currentObstacleSpeed);

      const alreadyPassed = Boolean(obstacle.getData("passed"));
      if (!alreadyPassed && obstacle.x + obstacle.displayWidth / 2 < this.arrow!.x) {
        obstacle.setData("passed", true);
        const gainedScore = ArrowDriftConstants.SCORE_PER_OBSTACLE;
        this.score += gainedScore;
        this.scoreText?.setText(`${this.score}`);
        this.showScoreGain(gainedScore);
      }

      if (obstacle.x < -obstacle.displayWidth) {
        obstacle.destroy();
      }
      return true;
    });
  }

  private initTrail() {
    if (!this.arrow) return;
    this.trailGraphics?.destroy();
    this.trailGraphics = this.add.graphics();
    this.trailGraphics.setDepth(4);
    this.trailNodes = [];

    const startX = this.arrow.x - this.arrow.displayWidth * this.trailAnchorRatio;
    const startY = this.arrow.y;
    const segmentCount = 20;
    const spacing = 8;

    for (let i = 0; i < segmentCount; i += 1) {
      this.trailNodes.push(new Phaser.Math.Vector2(startX - i * spacing, startY));
    }
  }

  private updateTrail(time: number, dt: number) {
    if (!this.arrow || !this.trailGraphics || this.trailNodes.length === 0) return;

    const anchorX = this.arrow.x - this.arrow.displayWidth * this.trailAnchorRatio;
    const anchorY = this.arrow.y;
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
    const glowColor = ArrowDriftConstants.ARROW_TRAIL_COLOR;

    for (let i = 0; i < this.trailNodes.length - 1; i += 1) {
      const a = this.trailNodes[i];
      const b = this.trailNodes[i + 1];
      const t = i / (this.trailNodes.length - 1);
      const width = (1 - t) * 9.6 + 1.8;
      const alpha = (1 - t) * 0.78 + 0.16;
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
      .tileSprite(0, 0, this.scale.width, this.scale.height, "ad-bg-far")
      .setOrigin(0, 0)
      .setDepth(0);

    this.nearBg = this.add
      .tileSprite(0, 0, this.scale.width, this.scale.height, "ad-bg-near")
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
    const speedStep = Math.floor(elapsedMs / ArrowDriftConstants.DIFFICULTY.SPEED_STEP_INTERVAL_MS);
    const nextObstacleSpeed =
      ArrowDriftConstants.BASE_OBSTACLE_SPEED *
      Math.pow(ArrowDriftConstants.DIFFICULTY.SPEED_MULTIPLIER_PER_STEP, speedStep);
    this.currentObstacleSpeed = nextObstacleSpeed;
    if (speedStep > this.currentSpeedStep) {
      this.currentSpeedStep = speedStep;
      this.showSpeedUpNotice(nextObstacleSpeed);
    }

    const shrinkStep = Math.floor(
      elapsedMs / ArrowDriftConstants.DIFFICULTY.MAP_SHRINK_INTERVAL_MS,
    );
    const shrinkByTime = shrinkStep * ArrowDriftConstants.DIFFICULTY.MAP_SHRINK_PER_STEP;
    const shrinkClamped = Math.min(shrinkByTime, ArrowDriftConstants.DIFFICULTY.MAP_SHRINK_MAX);
    const maxPaddingByScreen = Math.max(
      ArrowDriftConstants.BASE_VERTICAL_PADDING,
      this.scale.height / 2 - 80,
    );
    this.currentVerticalPadding = Math.min(
      ArrowDriftConstants.BASE_VERTICAL_PADDING + shrinkClamped,
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

  private showSpeedUpNotice(nextObstacleSpeed: number) {
    if (!this.speedUpText) return;

    const speedRatio = nextObstacleSpeed / ArrowDriftConstants.BASE_OBSTACLE_SPEED;
    this.speedUpText
      .setText(`속도 상승 x${speedRatio.toFixed(2)}`)
      .setPosition(this.scale.width / 2, 56)
      .setScale(0.9)
      .setAlpha(1);

    this.tweens.killTweensOf(this.speedUpText);
    this.tweens.add({
      targets: this.speedUpText,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 220,
      ease: "Back.Out",
    });
    this.tweens.add({
      targets: this.speedUpText,
      y: 36,
      alpha: 0,
      duration: 900,
      delay: 260,
      ease: "Sine.Out",
    });
  }

  private showScoreGain(gainedScore: number) {
    const baseX = this.arrow ? this.arrow.x + this.arrow.displayWidth * 0.66 : 96;
    const baseY = this.arrow ? this.arrow.y - 10 : 56;
    const gainText = this.add
      .text(baseX, baseY, `+${gainedScore}`, {
        fontSize: "20px",
        color: "#fef08a",
        fontStyle: "bold",
        stroke: "#713f12",
        strokeThickness: 3,
      })
      .setOrigin(0.5, 0.5)
      .setDepth(12)
      .setScale(0.78)
      .setAlpha(0);

    this.tweens.add({
      targets: gainText,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 120,
      ease: "Sine.Out",
    });
    this.tweens.add({
      targets: gainText,
      y: baseY - 34,
      alpha: 0,
      duration: 540,
      delay: 120,
      ease: "Cubic.Out",
      onComplete: () => gainText.destroy(),
    });
  }

  private handleSpaceToggle(event: KeyboardEvent) {
    if (event.repeat) return;
    event.preventDefault();
    this.toggleDirection();
  }

  private toggleDirection() {
    if (this.isGameOver || !this.arrow) return;
    this.isMovingUp = !this.isMovingUp;
    this.arrow.setAngle(this.isMovingUp ? -35 : 35);
  }

  private scheduleNextWave() {
    if (this.isGameOver) return;

    const elapsedMs = this.time.now - this.startedAt;
    const obstacleCount = this.pickWaveObstacleCount();
    const yTargets = this.buildWaveYTargets(obstacleCount);
    const inWaveGap = Phaser.Math.Between(
      ArrowDriftConstants.SPAWN.IN_WAVE_GAP_MIN_MS,
      ArrowDriftConstants.SPAWN.IN_WAVE_GAP_MAX_MS,
    );

    yTargets.forEach((targetY, index) => {
      this.time.delayedCall(inWaveGap * index, () => {
        this.spawnObstacle(targetY);
      });
    });

    const rampProgress = Phaser.Math.Clamp(
      elapsedMs / ArrowDriftConstants.SPAWN.WAVE_DELAY_RAMP_MS,
      0,
      1,
    );
    const dynamicMinDelay = Phaser.Math.Linear(
      ArrowDriftConstants.SPAWN.WAVE_DELAY_START_MIN_MS,
      ArrowDriftConstants.SPAWN.WAVE_DELAY_MIN_MS,
      rampProgress,
    );
    const dynamicMaxDelay = Phaser.Math.Linear(
      ArrowDriftConstants.SPAWN.WAVE_DELAY_START_MAX_MS,
      ArrowDriftConstants.SPAWN.WAVE_DELAY_MAX_MS,
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
      elapsedMs / ArrowDriftConstants.SPAWN.MULTI_WAVE_RAMP_MS,
      0,
      1,
    );
    const tripleChance = Phaser.Math.Linear(
      ArrowDriftConstants.SPAWN.TRIPLE_WAVE_CHANCE_START,
      ArrowDriftConstants.SPAWN.TRIPLE_WAVE_CHANCE_END,
      rampProgress,
    );
    const doubleChance = Phaser.Math.Linear(
      ArrowDriftConstants.SPAWN.DOUBLE_WAVE_CHANCE_START,
      ArrowDriftConstants.SPAWN.DOUBLE_WAVE_CHANCE_END,
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
      ArrowDriftConstants.SPAWN.FORMATION_STEP_MIN,
      ArrowDriftConstants.SPAWN.FORMATION_STEP_MAX,
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
      ArrowDriftConstants.OBSTACLE.PRESET_TEXTURE_KEYS,
    );
    const scaleX = Phaser.Math.FloatBetween(
      ArrowDriftConstants.OBSTACLE.SCALE_X_MIN,
      ArrowDriftConstants.OBSTACLE.SCALE_X_MAX,
    );
    const scaleY = Phaser.Math.FloatBetween(
      ArrowDriftConstants.OBSTACLE.SCALE_Y_MIN,
      ArrowDriftConstants.OBSTACLE.SCALE_Y_MAX,
    );

    const obstacle = this.obstacles.create(
      this.scale.width + ArrowDriftConstants.OBSTACLE.SPAWN_SIDE_OFFSET,
      this.scale.height / 2,
      textureKey,
    ) as Phaser.Physics.Arcade.Image | undefined;

    if (!obstacle) return;

    obstacle.setScale(scaleX, scaleY);
    const halfHeight = obstacle.displayHeight / 2;
    const spawnMargin = halfHeight + ArrowDriftConstants.OBSTACLE.SPAWN_VERTICAL_MARGIN;
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
      ArrowDriftConstants.OBSTACLE.HITBOX_CORE_SCALE;
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
    this.input.keyboard?.off("keydown-SPACE", this.handleSpaceToggle, this);

    if (this.arrow) {
      const arrowBody = this.arrow.body as Phaser.Physics.Arcade.Body | null;
      arrowBody?.stop();
      if (arrowBody) arrowBody.enable = false;
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
    if (!this.arrow) {
      onComplete();
      return;
    }

    const originX = this.arrow.x;
    const originY = this.arrow.y;

    this.trailGraphics?.clear();
    this.arrow.setVisible(false);

    const flash = this.add.circle(originX, originY, 14, 0xffffff, 0.95).setDepth(15);
    this.tweens.add({
      targets: flash,
      scaleX: 5.8,
      scaleY: 5.8,
      alpha: 0,
      duration: 520,
      ease: "Cubic.Out",
      onComplete: () => flash.destroy(),
    });

    const blastRing = this.add.circle(originX, originY, 18, 0xffffff, 0).setDepth(14);
    blastRing.setStrokeStyle(3, 0xff9aa6, 0.9);
    this.tweens.add({
      targets: blastRing,
      scaleX: 6.4,
      scaleY: 6.4,
      alpha: 0,
      duration: 780,
      ease: "Quart.Out",
      onComplete: () => blastRing.destroy(),
    });

    const shardCount = 32;
    for (let i = 0; i < shardCount; i += 1) {
      const shard = this.add
        .rectangle(
          originX,
          originY,
          Phaser.Math.Between(7, 16),
          Phaser.Math.Between(3, 6),
          i % 4 === 0 ? 0xffd7dc : ArrowDriftConstants.ARROW_COLOR,
          0.95,
        )
        .setDepth(15);
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.Between(56, 170);
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
        duration: Phaser.Math.Between(520, 860),
        ease: "Cubic.Out",
        onComplete: () => shard.destroy(),
      });
    }

    const sparkCount = 24;
    for (let i = 0; i < sparkCount; i += 1) {
      const spark = this.add
        .circle(
          originX,
          originY,
          Phaser.Math.FloatBetween(1.6, 3.2),
          i % 2 === 0 ? 0xffffff : 0xff9aa6,
          0.9,
        )
        .setDepth(15);
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.Between(52, 148);
      this.tweens.add({
        targets: spark,
        x: originX + Math.cos(angle) * distance,
        y: originY + Math.sin(angle) * distance,
        alpha: 0,
        duration: Phaser.Math.Between(420, 760),
        ease: "Sine.Out",
        onComplete: () => spark.destroy(),
      });
    }

    this.time.delayedCall(900, onComplete);
  }

  private resize(gameSize: { width: number; height: number }) {
    this.cameras.main.setViewport(0, 0, gameSize.width, gameSize.height);
    this.arrowAnchorX = gameSize.width * 0.25;
    this.farBg?.setSize(gameSize.width, gameSize.height);
    this.nearBg?.setSize(gameSize.width, gameSize.height);
    this.playTimeText?.setPosition(gameSize.width - 16, 16);
    this.speedUpText?.setPosition(gameSize.width / 2, this.speedUpText.y);
    this.updateDifficulty(this.time.now - this.startedAt);

    if (this.arrow) {
      const y = Phaser.Math.Clamp(
        this.arrow.y,
        this.currentVerticalPadding + 4,
        gameSize.height - this.currentVerticalPadding - 4,
      );
      this.arrow.setPosition(this.arrowAnchorX, y);
    }
  }

  private cleanup() {
    this.trailGraphics?.destroy();
    this.trailGraphics = null;
    this.trailNodes = [];
    this.playTimeText = null;
    this.speedUpText = null;
    this.spawnTimer?.destroy();
    this.spawnTimer = null;
    this.input.off("pointerdown", this.toggleDirection, this);
    this.input.keyboard?.off("keydown-SPACE", this.handleSpaceToggle, this);
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
