import * as Phaser from "phaser";
import { ArrowDriftConstants } from "../arrow-drift-constants";

type ScoreItemVariant = (typeof ArrowDriftConstants.ITEM.FISH_VARIANTS)[number];

export class MainScene extends Phaser.Scene {
  private arrow: Phaser.Physics.Arcade.Image | null = null;
  private trailGraphics: Phaser.GameObjects.Graphics | null = null;
  private trailNodes: Phaser.Math.Vector2[] = [];
  private obstacles: Phaser.Physics.Arcade.Group | null = null;
  private scoreItems: Phaser.Physics.Arcade.Group | null = null;
  private scoreText: Phaser.GameObjects.Text | null = null;
  private playTimeText: Phaser.GameObjects.Text | null = null;
  private speedUpText: Phaser.GameObjects.Text | null = null;
  private spawnTimer: Phaser.Time.TimerEvent | null = null;
  private farBg: Phaser.GameObjects.TileSprite | null = null;
  private nearBg: Phaser.GameObjects.TileSprite | null = null;
  private topBoundLine: Phaser.GameObjects.Rectangle | null = null;
  private bottomBoundLine: Phaser.GameObjects.Rectangle | null = null;
  private arrowAnchorY = 0;
  private score = 0;
  private isMovingLeft = true;
  private isGameOver = false;
  private startedAt = 0;
  private currentObstacleSpeed = ArrowDriftConstants.BASE_OBSTACLE_SPEED;
  private currentVerticalPadding = ArrowDriftConstants.BASE_VERTICAL_PADDING;
  private currentSpeedStep = 0;
  private currentHorizontalSpeed = 0;
  private swimWaveSeed = 0;
  private swimKickUntil = 0;
  private readonly trailTailOffsetRatio = 0.52;
  private readonly trailSegmentCount = 5;
  private readonly trailSegmentSpacing = 0.7;
  private angleTween: Phaser.Tweens.Tween | null = null;

  constructor() {
    super({ key: "MainScene" });
  }

  create() {
    this.cameras.main.setBackgroundColor("#03172f");
    this.score = 0;
    this.isMovingLeft = true;
    this.isGameOver = false;
    this.startedAt = this.time.now;
    this.currentObstacleSpeed = ArrowDriftConstants.BASE_OBSTACLE_SPEED;
    this.currentVerticalPadding = ArrowDriftConstants.BASE_VERTICAL_PADDING;
    this.currentSpeedStep = 0;
    this.swimWaveSeed = Phaser.Math.FloatBetween(0, Math.PI * 2);
    this.swimKickUntil = 0;
    this.createBackground();
    this.createBoundGuides();
    this.updateDifficulty(0);

    this.arrowAnchorY = this.scale.height * 0.75;
    const arrowX = this.scale.width / 2;
    const arrowY = this.arrowAnchorY;
    this.arrow = this.physics.add.image(arrowX, arrowY, "ad-fish");
    this.arrow.setDepth(5);
    this.arrow.setCollideWorldBounds(false);
    this.arrow.setAngle(this.isMovingLeft ? -132 : -48);
    this.arrow.body?.setSize(
      ArrowDriftConstants.ARROW_HITBOX_WIDTH,
      ArrowDriftConstants.ARROW_HITBOX_HEIGHT,
      true,
    );
    const diagonalSpeed = ArrowDriftConstants.ARROW_SPEED / Math.sqrt(2);
    this.currentHorizontalSpeed = this.isMovingLeft ? -diagonalSpeed : diagonalSpeed;
    this.initTrail();

    this.obstacles = this.physics.add.group({
      allowGravity: false,
      immovable: true,
    });
    this.scoreItems = this.physics.add.group({
      allowGravity: false,
      immovable: true,
    });

    this.physics.add.overlap(this.arrow, this.obstacles, this.handleHitObstacle, undefined, this);
    this.physics.add.overlap(
      this.arrow,
      this.scoreItems,
      this.handleCollectScoreItem,
      undefined,
      this,
    );

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
        color: "#7dd3fc",
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
    if (this.isGameOver || !this.arrow || !this.obstacles || !this.scoreItems) return;

    const dt = delta / 1000;
    const elapsedMs = this.time.now - this.startedAt;
    this.updateDifficulty(elapsedMs);
    this.playTimeText?.setText(this.formatPlayTime(elapsedMs));

    const diagonalSpeed = ArrowDriftConstants.ARROW_SPEED / Math.sqrt(2);
    const targetHorizontalSpeed = this.isMovingLeft ? -diagonalSpeed : diagonalSpeed;
    const swimKickMultiplier = this.time.now < this.swimKickUntil ? 1.18 : 1;
    const steerLerp = Phaser.Math.Clamp(dt * 9.2, 0.06, 0.24);
    this.currentHorizontalSpeed = Phaser.Math.Linear(
      this.currentHorizontalSpeed,
      targetHorizontalSpeed * swimKickMultiplier,
      steerLerp,
    );
    const backgroundScrollSpeed = this.currentObstacleSpeed * dt;

    const swimBodyWave = Math.sin(time * 0.009 + this.swimWaveSeed) * 6.8;
    const swimTailWave = Math.sin(time * 0.024 + this.swimWaveSeed * 1.7) * 2.2;
    this.arrow.x += this.currentHorizontalSpeed * dt;
    this.arrow.y = this.arrowAnchorY + swimBodyWave + swimTailWave;
    const bodyScaleWave = Math.sin(time * 0.022 + this.swimWaveSeed);
    this.arrow.setScale(1 + bodyScaleWave * 0.03, 1 - bodyScaleWave * 0.026);

    if (!this.angleTween) {
      const baseAngle = this.isMovingLeft ? -132 : -48;
      const wobbleAngle = Math.sin(time * 0.02 + this.swimWaveSeed * 0.65) * 4.2;
      this.arrow.setAngle(baseAngle + wobbleAngle);
    }
    this.updateTrail(time);

    const width = this.scale.width;
    const padding = this.currentVerticalPadding;

    if (this.farBg) {
      this.farBg.tilePositionY -=
        backgroundScrollSpeed * ArrowDriftConstants.BACKGROUND_SCROLL.FAR_FACTOR;
    }
    if (this.nearBg) {
      this.nearBg.tilePositionY -=
        backgroundScrollSpeed * ArrowDriftConstants.BACKGROUND_SCROLL.NEAR_FACTOR;
    }

    if (this.arrow.x < padding || this.arrow.x > width - padding) {
      this.startGameOver();
      return;
    }

    this.obstacles.children.each(child => {
      const obstacle = child as Phaser.Physics.Arcade.Image;
      if (!obstacle.active) return true;
      const speedFactorRaw = Number(obstacle.getData("speedFactor"));
      const speedFactor = Number.isFinite(speedFactorRaw) ? speedFactorRaw : 1;
      const driftPhaseRaw = Number(obstacle.getData("driftPhase"));
      const driftPhase = Number.isFinite(driftPhaseRaw) ? driftPhaseRaw : 0;
      const driftStrengthRaw = Number(obstacle.getData("driftStrength"));
      const driftStrength = Number.isFinite(driftStrengthRaw) ? driftStrengthRaw : 0;
      const spinSpeedRaw = Number(obstacle.getData("spinSpeed"));
      const spinSpeed = Number.isFinite(spinSpeedRaw) ? spinSpeedRaw : 0;
      obstacle.setVelocityY(this.currentObstacleSpeed * speedFactor);
      obstacle.angle += spinSpeed * dt;

      const driftX = Math.sin(time * 0.0052 + driftPhase) * driftStrength;
      const halfWidth = obstacle.displayWidth / 2;
      const minX = this.currentVerticalPadding + halfWidth;
      const maxX = this.scale.width - this.currentVerticalPadding - halfWidth;
      if (maxX > minX) {
        obstacle.x = Phaser.Math.Clamp(obstacle.x + driftX * dt, minX, maxX);
      }

      const alreadyPassed = Boolean(obstacle.getData("passed"));
      if (!alreadyPassed && obstacle.y - obstacle.displayHeight / 2 > this.arrow!.y) {
        obstacle.setData("passed", true);
        const gainedScore = ArrowDriftConstants.SCORE_PER_OBSTACLE;
        this.score += gainedScore;
        this.scoreText?.setText(`${this.score}`);
        this.showScoreGain(gainedScore);
      }

      if (obstacle.y > this.scale.height + obstacle.displayHeight) {
        obstacle.destroy();
      }
      return true;
    });

    this.scoreItems.children.each(child => {
      const scoreItem = child as Phaser.Physics.Arcade.Image;
      if (!scoreItem.active) return true;

      const speedFactorRaw = Number(scoreItem.getData("speedFactor"));
      const speedFactor = Number.isFinite(speedFactorRaw) ? speedFactorRaw : 1;
      const swimPhaseRaw = Number(scoreItem.getData("swimPhase"));
      const swimPhase = Number.isFinite(swimPhaseRaw) ? swimPhaseRaw : 0;

      scoreItem.setVelocityY(this.currentObstacleSpeed * speedFactor);
      scoreItem.setAngle(Math.sin(time * 0.013 + swimPhase) * 13);
      scoreItem.setScale(
        scoreItem.scaleX,
        1 + Math.sin(time * 0.02 + swimPhase + Math.PI / 4) * 0.06,
      );

      if (scoreItem.y > this.scale.height + scoreItem.displayHeight) {
        scoreItem.destroy();
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

    const tail = this.getArrowTailPosition();
    const forward = this.getArrowForwardVector();
    for (let i = 0; i < this.trailSegmentCount; i += 1) {
      this.trailNodes.push(
        new Phaser.Math.Vector2(
          tail.x - forward.x * i * this.trailSegmentSpacing,
          tail.y - forward.y * i * this.trailSegmentSpacing,
        ),
      );
    }
  }

  private updateTrail(time: number) {
    if (!this.arrow || !this.trailGraphics || this.trailNodes.length === 0) return;

    const tail = this.getArrowTailPosition();
    const forward = this.getArrowForwardVector();
    const perpendicular = new Phaser.Math.Vector2(-forward.y, forward.x);

    // Pin the first trail node to the arrow tail to avoid visual separation.
    this.trailNodes[0].x = tail.x;
    this.trailNodes[0].y = tail.y;

    for (let i = 1; i < this.trailNodes.length; i += 1) {
      const prev = this.trailNodes[i - 1];
      const current = this.trailNodes[i];
      const kickFactor = this.time.now < this.swimKickUntil ? 1.2 : 1;
      const follow = Math.max(0.08, 0.34 - i * 0.024);
      const lagDistance = (1.9 + i * 0.42) * kickFactor;
      const swayAmount =
        Math.sin(time * 0.02 + i * 0.9 + this.swimWaveSeed) *
        0.52 *
        (1 - i / this.trailNodes.length);
      const targetX = prev.x - forward.x * lagDistance + perpendicular.x * swayAmount;
      const targetY = prev.y - forward.y * lagDistance + perpendicular.y * swayAmount;

      current.x = Phaser.Math.Linear(current.x, targetX, follow);
      current.y = Phaser.Math.Linear(current.y, targetY, follow);
    }

    this.drawTrail(time);
  }

  private getArrowForwardVector() {
    if (!this.arrow) return new Phaser.Math.Vector2(1, 0);
    const angleRad = Phaser.Math.DegToRad(this.arrow.angle);
    return new Phaser.Math.Vector2(Math.cos(angleRad), Math.sin(angleRad));
  }

  private getArrowTailPosition() {
    if (!this.arrow) return new Phaser.Math.Vector2(0, 0);
    const forward = this.getArrowForwardVector();
    const offset = this.arrow.displayWidth * this.trailTailOffsetRatio;
    return new Phaser.Math.Vector2(
      this.arrow.x - forward.x * offset,
      this.arrow.y - forward.y * offset,
    );
  }

  private drawTrail(time: number) {
    if (!this.trailGraphics || this.trailNodes.length < 2) return;

    this.trailGraphics.clear();
    const wakeColor = ArrowDriftConstants.FISH_WAKE_COLOR;
    this.trailGraphics.fillStyle(wakeColor, 0.26);
    this.trailGraphics.fillCircle(this.trailNodes[0].x, this.trailNodes[0].y, 4.8);

    for (let i = 0; i < this.trailNodes.length - 1; i += 1) {
      const a = this.trailNodes[i];
      const b = this.trailNodes[i + 1];
      const t = i / (this.trailNodes.length - 1);
      const width = (1 - t) * 6.8 + 2.6;
      const alpha = (1 - t) * 0.34 + 0.12;
      const jitterX = Math.cos(time * 0.014 + i * 0.8) * 0.22;
      const jitterY = Math.sin(time * 0.018 + i * 0.7) * 0.3;

      this.trailGraphics.lineStyle(width, wakeColor, alpha);
      this.trailGraphics.beginPath();
      this.trailGraphics.moveTo(a.x, a.y);
      this.trailGraphics.lineTo(b.x + jitterX, b.y + jitterY);
      this.trailGraphics.strokePath();

      const bubbleRadius = (1 - t) * 2.2 + 1;
      const bubbleAlpha = (1 - t) * 0.2 + 0.08;
      this.trailGraphics.fillStyle(0xe0f2fe, bubbleAlpha);
      this.trailGraphics.fillCircle(
        b.x + Math.sin(time * 0.01 + i * 0.9),
        b.y + Math.cos(time * 0.01 + i * 0.6),
        bubbleRadius,
      );
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
      .rectangle(0, 0, 3, this.scale.height, 0x38bdf8, 0.6)
      .setOrigin(0.5, 0)
      .setDepth(9);

    this.bottomBoundLine = this.add
      .rectangle(this.scale.width, 0, 3, this.scale.height, 0x38bdf8, 0.6)
      .setOrigin(0.5, 0)
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
      this.scale.width / 2 - 80,
    );
    this.currentVerticalPadding = Math.min(
      ArrowDriftConstants.BASE_VERTICAL_PADDING + shrinkClamped,
      maxPaddingByScreen,
    );
    this.syncBoundGuides();
  }

  private syncBoundGuides() {
    if (!this.topBoundLine || !this.bottomBoundLine) return;

    const leftX = this.currentVerticalPadding;
    const rightX = this.scale.width - this.currentVerticalPadding;

    this.topBoundLine.setPosition(leftX, 0);
    this.topBoundLine.setSize(3, this.scale.height);

    this.bottomBoundLine.setPosition(rightX, 0);
    this.bottomBoundLine.setSize(3, this.scale.height);
  }

  private showSpeedUpNotice(nextObstacleSpeed: number) {
    if (!this.speedUpText) return;

    const speedRatio = nextObstacleSpeed / ArrowDriftConstants.BASE_OBSTACLE_SPEED;
    this.speedUpText
      .setText(`해류 가속 x${speedRatio.toFixed(2)}`)
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
    const baseX = this.arrow ? this.arrow.x + (this.isMovingLeft ? -16 : 16) : 96;
    const baseY = this.arrow ? this.arrow.y - this.arrow.displayHeight * 0.66 : 56;
    const gainText = this.add
      .text(baseX, baseY, `+${gainedScore}`, {
        fontSize: "20px",
        color: "#bae6fd",
        fontStyle: "bold",
        stroke: "#0c4a6e",
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
    this.isMovingLeft = !this.isMovingLeft;
    const targetAngle = this.isMovingLeft ? -132 : -48;
    this.swimKickUntil = this.time.now + 260;
    this.angleTween?.stop();
    this.angleTween = this.tweens.add({
      targets: this.arrow,
      angle: targetAngle,
      duration: 210,
      ease: "Sine.Out",
      onComplete: () => {
        this.angleTween = null;
      },
    });
    this.tweens.add({
      targets: this.arrow,
      scaleX: 1.08,
      scaleY: 0.9,
      duration: 120,
      yoyo: true,
      ease: "Sine.Out",
    });
  }

  private scheduleNextWave() {
    if (this.isGameOver) return;

    const elapsedMs = this.time.now - this.startedAt;
    const obstacleCount = this.pickWaveObstacleCount();
    const xTargets = this.buildWaveXTargets(obstacleCount);
    const inWaveGap = Phaser.Math.Between(
      ArrowDriftConstants.SPAWN.IN_WAVE_GAP_MIN_MS,
      ArrowDriftConstants.SPAWN.IN_WAVE_GAP_MAX_MS,
    );

    xTargets.forEach((targetX, index) => {
      this.time.delayedCall(inWaveGap * index, () => {
        this.spawnObstacle(targetX);
      });
    });

    const itemSpawnChance = this.calculateItemSpawnChance(elapsedMs);
    if (Math.random() < itemSpawnChance) {
      const maxWaveIndex = Math.max(0, obstacleCount - 1);
      const itemDelay =
        inWaveGap * Phaser.Math.Between(0, maxWaveIndex) + Phaser.Math.Between(40, 220);
      this.time.delayedCall(itemDelay, () => {
        this.spawnScoreItem();
      });
    }

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

  private buildWaveXTargets(count: number) {
    const centerMinX = this.currentVerticalPadding + 90;
    const centerMaxX = this.scale.width - this.currentVerticalPadding - 90;
    const centerX =
      centerMaxX > centerMinX ? Phaser.Math.Between(centerMinX, centerMaxX) : this.scale.width / 2;

    const direction = Math.random() < 0.5 ? -1 : 1;
    const step = Phaser.Math.Between(
      ArrowDriftConstants.SPAWN.FORMATION_STEP_MIN,
      ArrowDriftConstants.SPAWN.FORMATION_STEP_MAX,
    );

    const targets: number[] = [];
    for (let i = 0; i < count; i += 1) {
      const relative = i - (count - 1) / 2;
      targets.push(centerX + relative * step * direction);
    }
    return targets;
  }

  private calculateItemSpawnChance(elapsedMs: number) {
    const progress = Phaser.Math.Clamp(
      elapsedMs / ArrowDriftConstants.SPAWN.ITEM_CHANCE_RAMP_MS,
      0,
      1,
    );
    return Phaser.Math.Linear(
      ArrowDriftConstants.SPAWN.ITEM_CHANCE_START,
      ArrowDriftConstants.SPAWN.ITEM_CHANCE_END,
      progress,
    );
  }

  private spawnObstacle(targetX?: number) {
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
    const speedFactor = Phaser.Math.FloatBetween(
      ArrowDriftConstants.OBSTACLE.SPEED_FACTOR_MIN,
      ArrowDriftConstants.OBSTACLE.SPEED_FACTOR_MAX,
    );
    const driftStrength = Phaser.Math.FloatBetween(16, 34);
    const spinSpeed = Phaser.Math.FloatBetween(-34, 34);

    const obstacle = this.obstacles.create(
      this.scale.width / 2,
      -ArrowDriftConstants.OBSTACLE.SPAWN_SIDE_OFFSET,
      textureKey,
    ) as Phaser.Physics.Arcade.Image | undefined;

    if (!obstacle) return;

    obstacle.setScale(scaleX, scaleY);
    const halfWidth = obstacle.displayWidth / 2;
    const spawnMargin = halfWidth + ArrowDriftConstants.OBSTACLE.SPAWN_VERTICAL_MARGIN;
    const minX = this.currentVerticalPadding + spawnMargin;
    const maxX = this.scale.width - this.currentVerticalPadding - spawnMargin;
    const safeMinX = maxX > minX ? minX : this.scale.width / 2;
    const safeMaxX = maxX > minX ? maxX : this.scale.width / 2;
    const randomX = safeMaxX > safeMinX ? Phaser.Math.Between(safeMinX, safeMaxX) : safeMinX;
    const x = Phaser.Math.Clamp(targetX ?? randomX, safeMinX, safeMaxX);
    obstacle.setX(x);

    obstacle.setDepth(6);
    obstacle.setAngle(Phaser.Math.Between(0, 359));
    obstacle.setVelocityY(this.currentObstacleSpeed * speedFactor);
    obstacle.setData("speedFactor", speedFactor);
    obstacle.setData("driftPhase", Phaser.Math.FloatBetween(0, Math.PI * 2));
    obstacle.setData("driftStrength", driftStrength);
    obstacle.setData("spinSpeed", spinSpeed);
    obstacle.setData("passed", false);
    const coreHitboxSize =
      Math.min(obstacle.displayWidth, obstacle.displayHeight) *
      ArrowDriftConstants.OBSTACLE.HITBOX_CORE_SCALE;
    obstacle.body?.setSize(coreHitboxSize, coreHitboxSize, true);
  }

  private spawnScoreItem(targetX?: number) {
    if (this.isGameOver || !this.scoreItems) return;
    const variant = this.pickScoreItemVariant();

    const scale = Phaser.Math.FloatBetween(
      ArrowDriftConstants.ITEM.SCALE_MIN,
      ArrowDriftConstants.ITEM.SCALE_MAX,
    );
    const speedFactor = Phaser.Math.FloatBetween(
      ArrowDriftConstants.ITEM.SPEED_FACTOR_MIN,
      ArrowDriftConstants.ITEM.SPEED_FACTOR_MAX,
    );
    const swimPhase = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const scoreItem = this.scoreItems.create(
      this.scale.width / 2,
      -ArrowDriftConstants.ITEM.SPAWN_SIDE_OFFSET,
      variant.key,
    ) as Phaser.Physics.Arcade.Image | undefined;

    if (!scoreItem) return;

    scoreItem.setScale(scale);
    const halfWidth = scoreItem.displayWidth / 2;
    const spawnMargin = halfWidth + ArrowDriftConstants.ITEM.SPAWN_VERTICAL_MARGIN;
    const minX = this.currentVerticalPadding + spawnMargin;
    const maxX = this.scale.width - this.currentVerticalPadding - spawnMargin;
    const safeMinX = maxX > minX ? minX : this.scale.width / 2;
    const safeMaxX = maxX > minX ? maxX : this.scale.width / 2;
    const randomX = safeMaxX > safeMinX ? Phaser.Math.Between(safeMinX, safeMaxX) : safeMinX;
    scoreItem.setX(Phaser.Math.Clamp(targetX ?? randomX, safeMinX, safeMaxX));

    scoreItem.setDepth(7);
    scoreItem.setFlipX(Math.random() < 0.5);
    scoreItem.setVelocityY(this.currentObstacleSpeed * speedFactor);
    scoreItem.setData("speedFactor", speedFactor);
    scoreItem.setData("swimPhase", swimPhase);
    scoreItem.setData("gainedScore", variant.score);
    scoreItem.setData("collected", false);
    const coreHitboxSize =
      Math.min(scoreItem.displayWidth, scoreItem.displayHeight) *
      ArrowDriftConstants.ITEM.HITBOX_CORE_SCALE;
    scoreItem.body?.setSize(coreHitboxSize, coreHitboxSize, true);
  }

  private handleHitObstacle() {
    this.startGameOver();
  }

  private handleCollectScoreItem(
    _arrowObj:
      | Phaser.Types.Physics.Arcade.GameObjectWithBody
      | Phaser.Physics.Arcade.Body
      | Phaser.Physics.Arcade.StaticBody
      | Phaser.Tilemaps.Tile,
    scoreItemObj:
      | Phaser.Types.Physics.Arcade.GameObjectWithBody
      | Phaser.Physics.Arcade.Body
      | Phaser.Physics.Arcade.StaticBody
      | Phaser.Tilemaps.Tile,
  ) {
    if (
      !(
        scoreItemObj instanceof Phaser.Physics.Arcade.Image ||
        scoreItemObj instanceof Phaser.Physics.Arcade.Sprite
      )
    ) {
      return;
    }
    const scoreItem = scoreItemObj as Phaser.Physics.Arcade.Image | Phaser.Physics.Arcade.Sprite;
    if (!scoreItem.active) return;
    if (Boolean(scoreItem.getData("collected"))) return;

    scoreItem.setData("collected", true);
    scoreItem.disableBody(true, true);

    const gainedScoreRaw = Number(scoreItem.getData("gainedScore"));
    const gainedScore = Number.isFinite(gainedScoreRaw)
      ? gainedScoreRaw
      : ArrowDriftConstants.ITEM.DEFAULT_SCORE;
    this.score += gainedScore;
    this.scoreText?.setText(`${this.score}`);
    this.showScoreGain(gainedScore);
    this.playScoreItemCollectEffect(scoreItem.x, scoreItem.y);
  }

  private pickScoreItemVariant(): ScoreItemVariant {
    const variants = ArrowDriftConstants.ITEM.FISH_VARIANTS;
    if (variants.length === 0) {
      return {
        key: "ad-item-fish-gold",
        assetPath: "/images/game/arrow-drift/score-fish-gold.svg",
        score: ArrowDriftConstants.ITEM.DEFAULT_SCORE,
        weight: 1,
      };
    }

    const totalWeight = variants.reduce((sum, variant) => sum + Math.max(0, variant.weight), 0);
    if (totalWeight <= 0) {
      return Phaser.Utils.Array.GetRandom(variants);
    }

    let roll = Phaser.Math.FloatBetween(0, totalWeight);
    for (const variant of variants) {
      roll -= Math.max(0, variant.weight);
      if (roll <= 0) return variant;
    }
    return variants[variants.length - 1];
  }

  private startGameOver() {
    if (this.isGameOver) return;

    this.isGameOver = true;
    this.angleTween?.stop();
    this.angleTween = null;
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

    this.scoreItems?.children.each(child => {
      const scoreItem = child as Phaser.Physics.Arcade.Image;
      const scoreItemBody = scoreItem.body as Phaser.Physics.Arcade.Body | null;
      scoreItemBody?.stop();
      if (scoreItemBody) scoreItemBody.enable = false;
      return true;
    });

    this.playFishImpactEffect(() => {
      this.scene.start("GameOverScene", { score: this.score });
    });
  }

  private playFishImpactEffect(onComplete: () => void) {
    if (!this.arrow) {
      onComplete();
      return;
    }

    const originX = this.arrow.x;
    const originY = this.arrow.y;

    this.trailGraphics?.clear();
    this.arrow.setVisible(false);

    const flash = this.add.circle(originX, originY, 12, 0xe0f2fe, 0.8).setDepth(15);
    this.tweens.add({
      targets: flash,
      scaleX: 4.4,
      scaleY: 4.4,
      alpha: 0,
      duration: 420,
      ease: "Cubic.Out",
      onComplete: () => flash.destroy(),
    });

    const outerRipple = this.add.circle(originX, originY, 16, 0xffffff, 0).setDepth(14);
    outerRipple.setStrokeStyle(3, 0x7dd3fc, 0.76);
    this.tweens.add({
      targets: outerRipple,
      scaleX: 5.8,
      scaleY: 5.8,
      alpha: 0,
      duration: 760,
      ease: "Quart.Out",
      onComplete: () => outerRipple.destroy(),
    });

    const innerRipple = this.add.circle(originX, originY, 10, 0xffffff, 0).setDepth(14);
    innerRipple.setStrokeStyle(2, ArrowDriftConstants.FISH_COLOR, 0.58);
    this.tweens.add({
      targets: innerRipple,
      scaleX: 4.1,
      scaleY: 4.1,
      alpha: 0,
      duration: 620,
      ease: "Sine.Out",
      onComplete: () => innerRipple.destroy(),
    });

    const bubbleCount = 38;
    for (let i = 0; i < bubbleCount; i += 1) {
      const bubble = this.add
        .circle(
          originX,
          originY,
          Phaser.Math.FloatBetween(1.4, 3.4),
          i % 3 === 0 ? 0xe0f2fe : 0x7dd3fc,
          0.92,
        )
        .setDepth(15);
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.Between(26, 132);
      this.tweens.add({
        targets: bubble,
        x: originX + Math.cos(angle) * distance,
        y: originY + Math.sin(angle) * distance - Phaser.Math.Between(8, 42),
        alpha: 0,
        scaleX: Phaser.Math.FloatBetween(0.7, 1.4),
        scaleY: Phaser.Math.FloatBetween(0.7, 1.4),
        duration: Phaser.Math.Between(380, 760),
        ease: "Sine.Out",
        onComplete: () => bubble.destroy(),
      });
    }

    this.time.delayedCall(760, onComplete);
  }

  private playScoreItemCollectEffect(originX: number, originY: number) {
    const pulse = this.add.circle(originX, originY, 8, 0x5eead4, 0.82).setDepth(13);
    this.tweens.add({
      targets: pulse,
      scaleX: 3.4,
      scaleY: 3.4,
      alpha: 0,
      duration: 300,
      ease: "Cubic.Out",
      onComplete: () => pulse.destroy(),
    });

    for (let i = 0; i < 10; i += 1) {
      const bubble = this.add
        .circle(originX, originY, Phaser.Math.FloatBetween(1.2, 2.8), 0xe0f2fe, 0.92)
        .setDepth(13);
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.Between(20, 46);
      this.tweens.add({
        targets: bubble,
        x: originX + Math.cos(angle) * distance,
        y: originY + Math.sin(angle) * distance - Phaser.Math.Between(4, 16),
        alpha: 0,
        duration: Phaser.Math.Between(220, 460),
        ease: "Sine.Out",
        onComplete: () => bubble.destroy(),
      });
    }
  }

  private resize(gameSize: { width: number; height: number }) {
    this.cameras.main.setViewport(0, 0, gameSize.width, gameSize.height);
    this.arrowAnchorY = gameSize.height * 0.75;
    this.farBg?.setSize(gameSize.width, gameSize.height);
    this.nearBg?.setSize(gameSize.width, gameSize.height);
    this.playTimeText?.setPosition(gameSize.width - 16, 16);
    this.speedUpText?.setPosition(gameSize.width / 2, this.speedUpText.y);
    this.updateDifficulty(this.time.now - this.startedAt);

    if (this.arrow) {
      const x = Phaser.Math.Clamp(
        this.arrow.x,
        this.currentVerticalPadding + 4,
        gameSize.width - this.currentVerticalPadding - 4,
      );
      this.arrow.setPosition(x, this.arrowAnchorY);
    }
  }

  private cleanup() {
    this.trailGraphics?.destroy();
    this.trailGraphics = null;
    this.trailNodes = [];
    this.playTimeText = null;
    this.speedUpText = null;
    this.scoreItems = null;
    this.angleTween?.stop();
    this.angleTween = null;
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
