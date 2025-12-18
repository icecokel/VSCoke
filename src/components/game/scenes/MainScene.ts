import { Scene } from "phaser";

export class MainScene extends Scene {
  private columns: Phaser.GameObjects.Sprite[][] = [[], [], []];
  private pickedBlock: Phaser.GameObjects.Sprite | null = null;
  private pickedColIdx: number = -1;
  private isGameOver: boolean = false;
  private score: number = 0;
  private scoreText: Phaser.GameObjects.Text | null = null;
  private startButton: Phaser.GameObjects.Text | null = null;
  private startButtonBg: Phaser.GameObjects.Rectangle | null = null;
  private isGameRunning: boolean = false;

  // UI References
  private colBgs: Phaser.GameObjects.Image[] = [];
  private deadlineGraphics: Phaser.GameObjects.Graphics | null = null;
  private deadlineText: Phaser.GameObjects.Text | null = null;
  private gameOverGroup: Phaser.GameObjects.Container | null = null;

  // Game Over UI References
  private gameOverTitle: Phaser.GameObjects.Text | null = null;
  private finalScoreText: Phaser.GameObjects.Text | null = null;
  private restartText: Phaser.GameObjects.Text | null = null;

  // Consts - Base Dimensions (Will be scaled)
  private readonly COLS = 3;
  private readonly BASE_BLOCK_WIDTH = 80;
  private readonly BASE_BLOCK_HEIGHT = 32;
  private readonly BASE_BLOCK_SPACING_X = 40;
  private readonly BASE_BLOCK_SPACING_Y = 4;

  // Actual current dimensions (scaled)
  private gameScale: number = 1;

  // Requested Color Palette
  private readonly COLORS = [0x91c6bc, 0x4b9da9, 0xf6f3c2, 0xe37434, 0xff6b6b];

  private spawnTimer: Phaser.Time.TimerEvent | null = null;
  private spawnInterval: number = 3000;
  private deadlineY: number = 0;

  constructor() {
    super({ key: "MainScene" });
  }

  preload() {
    const graphics = this.make.graphics({ x: 0, y: 0 }, false);

    // Block texture
    graphics.fillStyle(0xffffff);
    graphics.fillRoundedRect(0, 0, this.BASE_BLOCK_WIDTH, this.BASE_BLOCK_HEIGHT, 8);
    graphics.generateTexture("block_base", this.BASE_BLOCK_WIDTH, this.BASE_BLOCK_HEIGHT);

    // Background column texture
    graphics.clear();
    graphics.lineStyle(2, 0xffffff, 0.1);
    graphics.strokeRect(0, 0, this.BASE_BLOCK_WIDTH + 4, 600);
    graphics.generateTexture("col_bg", this.BASE_BLOCK_WIDTH + 4, 600);
  }

  create() {
    this.isGameOver = false;
    this.isGameRunning = false;
    this.score = 0;
    this.columns = [[], [], []];
    this.pickedBlock = null;
    this.pickedColIdx = -1;
    this.colBgs = [];

    // Score Board
    this.scoreText = this.add.text(20, 20, "Score: 0", {
      fontSize: "24px",
      color: "#ffffff",
    });

    // Column Backgrounds
    for (let i = 0; i < this.COLS; i++) {
      const colBg = this.add.image(0, 0, "col_bg");
      colBg.setInteractive();
      colBg.on("pointerdown", () => this.handleColumnClick(i));
      this.colBgs.push(colBg);
    }

    // Deadline
    this.deadlineGraphics = this.add.graphics();
    this.deadlineText = this.add
      .text(0, 0, "DEADLINE", {
        fontSize: "14px",
        color: "#ff4444",
      })
      .setOrigin(0.5, 0);

    // Start Button
    this.createStartButton();

    // Initial Layout update
    this.updateLayout();

    // Standard Resize Listener
    this.scale.on("resize", this.resize, this);

    // Event Tunnel Listener
    this.game.events.on(
      "external-resize",
      (_data: { width: number; height: number }) => {
        this.updateLayout();
      },
      this,
    );
  }

  private resize(gameSize: Phaser.Structs.Size) {
    this.cameras.main.setViewport(0, 0, gameSize.width, gameSize.height);
    this.updateLayout();
  }

  private updateLayout() {
    const screenWidth = this.cameras.main.width;
    const screenHeight = this.cameras.main.height;

    const contentBaseWidth =
      this.BASE_BLOCK_WIDTH * this.COLS + this.BASE_BLOCK_SPACING_X * (this.COLS - 1);
    const availableWidth = screenWidth - 40;

    this.gameScale = availableWidth / contentBaseWidth;
    if (this.gameScale > 1) this.gameScale = 1;

    const currentBlockWidth = this.BASE_BLOCK_WIDTH * this.gameScale;
    const currentSpacingX = this.BASE_BLOCK_SPACING_X * this.gameScale;

    // Update Score Scale
    if (this.scoreText) {
      this.scoreText.setFontSize(`${24 * this.gameScale}px`);
    }

    const totalVisualWidth = currentBlockWidth * this.COLS + currentSpacingX * (this.COLS - 1);
    const startX = (screenWidth - totalVisualWidth) / 2 + currentBlockWidth / 2;

    this.colBgs.forEach((bg, i) => {
      const x = startX + i * (currentBlockWidth + currentSpacingX);
      bg.setPosition(x, screenHeight / 2);
      bg.setScale(this.gameScale);
    });

    this.deadlineY = screenHeight - 100;
    if (this.deadlineGraphics) {
      this.deadlineGraphics.clear();
      this.deadlineGraphics.lineStyle(4, 0xff4444, 0.8);
      this.deadlineGraphics.lineBetween(
        startX - currentBlockWidth / 2,
        this.deadlineY,
        startX + totalVisualWidth - currentBlockWidth / 2,
        this.deadlineY,
      );
    }
    // Update Deadline Text
    if (this.deadlineText) {
      this.deadlineText.setPosition(screenWidth / 2, this.deadlineY + 10);
      this.deadlineText.setFontSize(`${14 * this.gameScale}px`);
    }

    // Update Start Button
    if (this.startButton && this.startButtonBg) {
      this.startButtonBg.setPosition(screenWidth / 2, screenHeight / 2);
      this.startButtonBg.setSize(200 * this.gameScale, 60 * this.gameScale);

      this.startButton.setPosition(screenWidth / 2, screenHeight / 2);
      this.startButton.setFontSize(`${32 * this.gameScale}px`);
    }

    // Update Game Over Group
    if (this.gameOverGroup) {
      this.gameOverGroup.setPosition(screenWidth / 2, screenHeight / 2);
      const rect = this.gameOverGroup.list[0] as Phaser.GameObjects.Rectangle;
      if (rect) rect.setSize(screenWidth, screenHeight);

      if (this.gameOverTitle) this.gameOverTitle.setFontSize(`${48 * this.gameScale}px`);
      if (this.finalScoreText) this.finalScoreText.setFontSize(`${32 * this.gameScale}px`);
      if (this.restartText) this.restartText.setFontSize(`${24 * this.gameScale}px`);
    }

    for (let i = 0; i < this.COLS; i++) {
      this.updateColumnVisuals(i);
    }
  }

  private createStartButton() {
    const screenWidth = this.cameras.main.width;
    const screenHeight = this.cameras.main.height;

    this.startButtonBg = this.add
      .rectangle(screenWidth / 2, screenHeight / 2, 200, 60, 0x4ecdc4)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.startGame());

    this.startButton = this.add
      .text(screenWidth / 2, screenHeight / 2, "START", {
        fontSize: "32px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.startButtonBg.setName("startBtnBg");
    this.startButton.setName("startBtnText");
  }

  private startGame() {
    if (this.isGameRunning) return;

    this.isGameRunning = true;

    if (this.startButtonBg) this.startButtonBg.destroy();
    if (this.startButton) this.startButton.destroy();
    this.startButton = null;
    this.startButtonBg = null;

    // Initial blocks
    this.spawnRow();
    this.spawnRow();
    this.spawnRow();

    // Spawn timer
    this.spawnTimer = this.time.addEvent({
      delay: this.spawnInterval,
      callback: this.spawnRow,
      callbackScope: this,
      loop: true,
    });
  }

  update() {
    // Game loop
  }

  private handleColumnClick(colIdx: number) {
    if (this.isGameOver || !this.isGameRunning) return;

    const col = this.columns[colIdx];

    if (this.pickedBlock === null) {
      if (col.length > 0) {
        this.pickedBlock = col.pop()!;
        this.pickedColIdx = colIdx;

        this.tweens.add({
          targets: this.pickedBlock,
          y: this.pickedBlock.y + 20,
          scale: this.gameScale * 1.1,
          duration: 100,
        });
      }
    } else {
      if (colIdx === this.pickedColIdx) {
        col.push(this.pickedBlock);
        this.updateColumnVisuals(colIdx);
        this.pickedBlock.setScale(this.gameScale);
        this.pickedBlock = null;
        this.pickedColIdx = -1;
      } else {
        col.push(this.pickedBlock);
        this.updateColumnVisuals(colIdx);
        this.pickedBlock.setScale(this.gameScale);
        this.pickedBlock = null;
        this.pickedColIdx = -1;

        this.checkMatch(colIdx);
        this.checkGameOver(colIdx);
      }
    }
  }

  private spawnRow() {
    if (this.isGameOver) return;

    for (let i = 0; i < this.COLS; i++) {
      const color = Phaser.Utils.Array.GetRandom(this.COLORS);
      const block = this.add.sprite(0, 0, "block_base");
      block.setTint(color);
      block.setData("color", color);
      block.setScale(this.gameScale);

      this.columns[i].unshift(block);
      this.checkGameOver(i);
    }

    for (let i = 0; i < this.COLS; i++) {
      this.updateColumnVisuals(i);
    }
  }

  private checkGameOver(colIdx: number) {
    const col = this.columns[colIdx];
    if (col.length === 0) return;

    const currentBlockHeight = this.BASE_BLOCK_HEIGHT * this.gameScale;
    const currentSpacingY = this.BASE_BLOCK_SPACING_Y * this.gameScale;

    const startY = 100;
    const bottomY =
      startY + (col.length - 1) * (currentBlockHeight + currentSpacingY) + currentBlockHeight;

    if (bottomY > this.deadlineY) {
      this.gameOver();
    }
  }

  private updateColumnVisuals(colIdx: number) {
    const col = this.columns[colIdx];
    const screenWidth = this.cameras.main.width;

    const currentBlockWidth = this.BASE_BLOCK_WIDTH * this.gameScale;
    const currentBlockHeight = this.BASE_BLOCK_HEIGHT * this.gameScale;
    const currentSpacingX = this.BASE_BLOCK_SPACING_X * this.gameScale;
    const currentSpacingY = this.BASE_BLOCK_SPACING_Y * this.gameScale;

    const totalVisualWidth = currentBlockWidth * this.COLS + currentSpacingX * (this.COLS - 1);
    const startX = (screenWidth - totalVisualWidth) / 2 + currentBlockWidth / 2;
    const x = startX + colIdx * (currentBlockWidth + currentSpacingX);

    const startY = 100;

    col.forEach((block, index) => {
      const targetY = startY + index * (currentBlockHeight + currentSpacingY);

      this.tweens.add({
        targets: block,
        x: x,
        y: targetY,
        scale: this.gameScale,
        duration: 100,
      });
    });
  }

  private checkMatch(colIdx: number) {
    const col = this.columns[colIdx];
    if (col.length < 3) return;

    const last = col[col.length - 1];
    const secondLast = col[col.length - 2];
    const thirdLast = col[col.length - 3];

    if (
      last.getData("color") === secondLast.getData("color") &&
      secondLast.getData("color") === thirdLast.getData("color")
    ) {
      const removed = col.splice(col.length - 3, 3);

      removed.forEach(block => {
        this.tweens.add({
          targets: block,
          scale: 0,
          alpha: 0,
          duration: 200,
          onComplete: () => block.destroy(),
        });
      });

      this.addScore(100);
    }
  }

  private addScore(points: number) {
    this.score += points;
    if (this.scoreText) {
      this.scoreText.setText(`Score: ${this.score}`);
    }
  }

  private gameOver() {
    this.isGameOver = true;
    this.isGameRunning = false;
    if (this.spawnTimer) this.spawnTimer.destroy();

    const screenWidth = this.cameras.main.width;
    const screenHeight = this.cameras.main.height;

    this.gameOverGroup = this.add.container(screenWidth / 2, screenHeight / 2);

    const bg = this.add.rectangle(0, 0, screenWidth, screenHeight, 0x000000, 0.7);

    this.gameOverTitle = this.add
      .text(0, -50, "GAME OVER", {
        fontSize: `${48 * this.gameScale}px`,
        color: "#ff4444",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.finalScoreText = this.add
      .text(0, 50, `Final Score: ${this.score}`, {
        fontSize: `${32 * this.gameScale}px`,
        color: "#ffffff",
      })
      .setOrigin(0.5);

    this.restartText = this.add
      .text(0, 120, "CLICK TO RESTART", {
        fontSize: `${24 * this.gameScale}px`,
        color: "#4ECDC4",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.restartText.on("pointerdown", () => {
      this.scene.restart();
    });

    this.gameOverGroup.add([bg, this.gameOverTitle, this.finalScoreText, this.restartText]);
  }
}
