import * as Phaser from "phaser";
import { ArrowDriftConstants } from "../arrow-drift-constants";

type ScoreItemVariant = (typeof ArrowDriftConstants.ITEM.STAR_VARIANTS)[number];

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
  private readonly trailTailOffsetRatio = 0.44;
  private readonly trailSegmentCount = 3;
  private readonly trailSegmentSpacing = 0.42;
  private angleTween: Phaser.Tweens.Tween | null = null;

  constructor() {
    super({ key: "MainScene" });
  }

  create() {
    this.cameras.main.setBackgroundColor("#0b1120");
    this.score = 0;
    this.isMovingLeft = true;
    this.isGameOver = false;
    this.startedAt = this.time.now;
    this.currentObstacleSpeed = ArrowDriftConstants.BASE_OBSTACLE_SPEED;
    this.currentVerticalPadding = ArrowDriftConstants.BASE_VERTICAL_PADDING;
    this.currentSpeedStep = 0;
    this.createBackground();
    this.createBoundGuides();
    this.updateDifficulty(0);

    this.arrowAnchorY = this.scale.height * 0.75;
    const arrowX = this.scale.width / 2;
    const arrowY = this.arrowAnchorY;
    this.arrow = this.physics.add.image(arrowX, arrowY, "ad-arrow");
    this.arrow.setDepth(5);
    this.arrow.setCollideWorldBounds(false);
    this.arrow.setAngle(this.isMovingLeft ? -125 : -55);
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
    if (this.isGameOver || !this.arrow || !this.obstacles || !this.scoreItems) return;

    const dt = delta / 1000;
    const elapsedMs = this.time.now - this.startedAt;
    this.updateDifficulty(elapsedMs);
    this.playTimeText?.setText(this.formatPlayTime(elapsedMs));

    const diagonalSpeed = ArrowDriftConstants.ARROW_SPEED / Math.sqrt(2);
    const horizontalSpeed = this.isMovingLeft ? -diagonalSpeed : diagonalSpeed;
    const backgroundScrollSpeed = this.currentObstacleSpeed * dt;

    this.arrow.x += horizontalSpeed * dt;
    this.arrow.y = this.arrowAnchorY;
    this.updateTrail(time);

    const width = this.scale.width;
    const padding = this.currentVerticalPadding;

    if (this.farBg) {
      this.farBg.tilePositionY +=
        backgroundScrollSpeed * ArrowDriftConstants.BACKGROUND_SCROLL.FAR_FACTOR;
    }
    if (this.nearBg) {
      this.nearBg.tilePositionY +=
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
      obstacle.setVelocityY(this.currentObstacleSpeed * speedFactor);

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
      const spinSpeedRaw = Number(scoreItem.getData("spinSpeed"));
      const spinSpeed = Number.isFinite(spinSpeedRaw) ? spinSpeedRaw : 0;

      scoreItem.setVelocityY(this.currentObstacleSpeed * speedFactor);
      scoreItem.angle += spinSpeed * dt;

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
      const follow = Math.max(0.08, 0.39 - i * 0.018);
      const lagDistance = 1.15 + i * 0.12;
      const swayAmount = Math.sin(time * 0.016 + i * 0.76) * 0.3 * (1 - i / this.trailNodes.length);
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
    const glowColor = ArrowDriftConstants.ARROW_TRAIL_COLOR;
    this.trailGraphics.fillStyle(glowColor, 0.72);
    this.trailGraphics.fillCircle(this.trailNodes[0].x, this.trailNodes[0].y, 6.6);

    for (let i = 0; i < this.trailNodes.length - 1; i += 1) {
      const a = this.trailNodes[i];
      const b = this.trailNodes[i + 1];
      const t = i / (this.trailNodes.length - 1);
      const width = (1 - t) * 10.5 + 4.8;
      const alpha = (1 - t) * 0.62 + 0.18;
      const jitter = Math.sin(time * 0.017 + i * 0.7) * 0.045;

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
      .rectangle(0, 0, 3, this.scale.height, 0xf43f5e, 0.8)
      .setOrigin(0.5, 0)
      .setDepth(9);

    this.bottomBoundLine = this.add
      .rectangle(this.scale.width, 0, 3, this.scale.height, 0xf43f5e, 0.8)
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
    const baseX = this.arrow ? this.arrow.x + (this.isMovingLeft ? -16 : 16) : 96;
    const baseY = this.arrow ? this.arrow.y - this.arrow.displayHeight * 0.66 : 56;
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
    this.isMovingLeft = !this.isMovingLeft;
    const targetAngle = this.isMovingLeft ? -125 : -55;
    this.angleTween?.stop();
    this.angleTween = this.tweens.add({
      targets: this.arrow,
      angle: targetAngle,
      duration: 140,
      ease: "Sine.InOut",
      onComplete: () => {
        this.angleTween = null;
      },
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
    const spinSpeed = Phaser.Math.FloatBetween(
      ArrowDriftConstants.ITEM.SPIN_SPEED_MIN,
      ArrowDriftConstants.ITEM.SPIN_SPEED_MAX,
    );
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
    scoreItem.setVelocityY(this.currentObstacleSpeed * speedFactor);
    scoreItem.setData("speedFactor", speedFactor);
    scoreItem.setData("spinSpeed", spinSpeed);
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
    const variants = ArrowDriftConstants.ITEM.STAR_VARIANTS;
    if (variants.length === 0) {
      return {
        key: "ad-item-score-gold",
        assetPath: "/images/game/arrow-drift/score-star.svg",
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

  private playScoreItemCollectEffect(originX: number, originY: number) {
    const pulse = this.add.circle(originX, originY, 8, 0xfef08a, 0.86).setDepth(13);
    this.tweens.add({
      targets: pulse,
      scaleX: 3.2,
      scaleY: 3.2,
      alpha: 0,
      duration: 280,
      ease: "Cubic.Out",
      onComplete: () => pulse.destroy(),
    });

    for (let i = 0; i < 8; i += 1) {
      const spark = this.add
        .circle(originX, originY, Phaser.Math.FloatBetween(1.4, 2.8), 0xfef9c3, 0.92)
        .setDepth(13);
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.Between(18, 42);
      this.tweens.add({
        targets: spark,
        x: originX + Math.cos(angle) * distance,
        y: originY + Math.sin(angle) * distance,
        alpha: 0,
        duration: Phaser.Math.Between(220, 420),
        ease: "Sine.Out",
        onComplete: () => spark.destroy(),
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
