import * as Phaser from "phaser";
import { GameConstants } from "../GameConstants";

interface GameTexts {
  score: string;
  deadline: string;
  start: string;
  gameOver: string;
  finalScore: string;
  restart: string;
}

export class MainScene extends Phaser.Scene {
  // ... (previous properties)

  // Game Texts (hardcoded in English)
  private texts: GameTexts = {
    score: "Score: ",
    deadline: "DEADLINE",
    start: "START",
    gameOver: "GAME OVER",
    finalScore: "Final Score: ",
    restart: "Restart",
  };
  private columns: Phaser.GameObjects.Sprite[][] = [[], [], []];
  private pickedBlock: Phaser.GameObjects.Sprite | null = null;
  private pickedColIdx: number = -1;
  private isGameOver: boolean = false;
  private score: number = 0;
  private scoreText: Phaser.GameObjects.Text | null = null;
  private startButton: Phaser.GameObjects.Text | null = null;
  private startButtonBg: Phaser.GameObjects.Rectangle | null = null;
  private isGameRunning: boolean = false;

  // UI 참조
  private colBgs: Phaser.GameObjects.Graphics[] = [];
  private deadlineGraphics: Phaser.GameObjects.Graphics | null = null;
  private deadlineText: Phaser.GameObjects.Text | null = null;
  private gameOverGroup: Phaser.GameObjects.Container | null = null;

  // 게임 오버 UI 참조
  private gameOverTitle: Phaser.GameObjects.Text | null = null;
  private finalScoreText: Phaser.GameObjects.Text | null = null;
  private restartText: Phaser.GameObjects.Text | null = null;

  // 상수 - 기본 크기 (스케일링됨)
  private readonly COLS = 3;
  private readonly BASE_BLOCK_WIDTH = 80;
  private readonly BASE_BLOCK_HEIGHT = 32;
  private readonly BASE_BLOCK_SPACING_X = 20;
  private readonly BASE_BLOCK_SPACING_Y = 4;

  // 실제 현재 크기 (스케일링 적용됨)
  private gameScale: number = 1;

  // 색상 팔레트 (동적 할당)
  private currentColors: number[] = [];

  private spawnTimer: Phaser.Time.TimerEvent | null = null;
  private spawnInterval: number = 3000;
  private deadlineY: number = 0;

  constructor() {
    super({ key: "MainScene" });
  }

  // Preload moved to PreloadScene

  create() {
    // 색상 로드 (PreloadScene에서 생성됨)
    this.currentColors = this.registry.get("currentColors");
    if (!this.currentColors || this.currentColors.length === 0) {
      // Fallback if missing (should not happen)
      const colorCount = GameConstants.COLOR_COUNT_BY_COLS[this.COLS] || 5;
      this.currentColors = GameConstants.BLOCK_PALETTE.slice(0, colorCount);
    }

    this.isGameOver = false;
    this.score = 0;
    this.columns = [[], [], []];
    this.pickedBlock = null;
    this.pickedColIdx = -1;
    this.colBgs = [];

    // 점수판 (안전을 위해 아래로 이동)
    this.scoreText = this.add.text(20, 40, `${this.texts.score}0`, {
      fontSize: "24px",
      color: "#ffffff",
    });

    // 컬럼 배경
    for (let i = 0; i < this.COLS; i++) {
      const colBg = this.add.graphics();
      // 클릭 감지를 위한 인터랙티브 영역 (투명 사각형)
      const hitArea = new Phaser.Geom.Rectangle(0, 0, 100, 1000);
      colBg.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
      colBg.on("pointerdown", () => this.handleColumnClick(i));
      this.colBgs.push(colBg);
    }

    // 데드라인
    this.deadlineGraphics = this.add.graphics();
    this.deadlineText = this.add
      .text(0, 0, this.texts.deadline, {
        fontSize: "14px",
        color: "#ff4444",
      })
      .setOrigin(0.5, 0);

    // 초기 레이아웃 업데이트
    this.updateLayout();

    // 기본 리사이즈 리스너
    this.scale.on("resize", this.resize, this);

    // 이벤트 터널 리스너
    this.game.events.on(
      "external-resize",
      (_data: { width: number; height: number }) => {
        this.updateLayout();
      },
      this,
    );

    // 게임 바로 시작
    this.startGameLogic();
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

    // 점수판 크기 업데이트
    if (this.scoreText) {
      this.scoreText.setFontSize(`${24 * this.gameScale}px`);
    }

    const totalVisualWidth = currentBlockWidth * this.COLS + currentSpacingX * (this.COLS - 1);
    const startX = (screenWidth - totalVisualWidth) / 2 + currentBlockWidth / 2;

    // 컬럼 배경 업데이트 (다시 그리기)
    this.colBgs.forEach((bg, i) => {
      const x = startX + i * (currentBlockWidth + currentSpacingX);

      bg.clear();
      bg.lineStyle(2 * this.gameScale, 0xffffff, 0.1);

      // x를 중심으로 하는 사각형 그리기 (높이는 화면 전체)
      const w = currentBlockWidth + 4 * this.gameScale;
      const h = screenHeight;

      // 위치 초기화 후 월드 좌표에 그리기
      bg.setPosition(0, 0);
      bg.strokeRect(x - w / 2, 0, w, h);

      // 히트 영역 업데이트
      bg.input!.hitArea.setTo(x - w / 2, 0, w, h);
    });

    // 데드라인 업데이트
    this.deadlineY = screenHeight - 100 * this.gameScale; // 데드라인 위치도 스케일링 적용
    // 작은 화면 일관성을 위해 100 * gameScale 사용
    if (this.deadlineGraphics) {
      this.deadlineGraphics.clear();
      this.deadlineGraphics.lineStyle(4 * this.gameScale, 0xff4444, 0.8);
      this.deadlineGraphics.lineBetween(
        startX - currentBlockWidth / 2,
        this.deadlineY,
        startX + totalVisualWidth - currentBlockWidth / 2,
        this.deadlineY,
      );
    }
    // 데드라인 텍스트 업데이트
    if (this.deadlineText) {
      this.deadlineText.setPosition(screenWidth / 2, this.deadlineY + 10 * this.gameScale);
      this.deadlineText.setFontSize(`${14 * this.gameScale}px`);
    }

    // 게임 오버 그룹 업데이트
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

  private startGameLogic() {
    // 초기 블록 생성
    this.spawnRow();
    this.spawnRow();
    this.spawnRow();

    // 스폰 타이머 설정
    this.spawnTimer = this.time.addEvent({
      delay: this.spawnInterval,
      callback: this.spawnRow,
      callbackScope: this,
      loop: true,
    });
  }

  update() {
    // 게임 루프
  }

  private handleColumnClick(colIdx: number) {
    if (this.isGameOver) return;
    // Game starts immediately now, no isGameRunning check needed or assume always true

    // ... logic continues ...
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
      // Use dynamically selected colors
      const color = Phaser.Utils.Array.GetRandom(this.currentColors);
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
      this.scoreText.setText(`${this.texts.score}${this.score}`);
    }
  }

  private gameOver() {
    this.isGameOver = true;
    // this.isGameRunning = false; // Removed as implicit via isGameOver
    if (this.spawnTimer) this.spawnTimer.destroy();

    const screenWidth = this.cameras.main.width;
    const screenHeight = this.cameras.main.height;

    this.gameOverGroup = this.add.container(screenWidth / 2, screenHeight / 2);

    const bg = this.add.rectangle(0, 0, screenWidth, screenHeight, 0x000000, 0.7);

    this.gameOverTitle = this.add
      .text(0, -50, this.texts.gameOver, {
        fontSize: `${48 * this.gameScale}px`,
        color: "#ff4444",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.finalScoreText = this.add
      .text(0, 50, `${this.texts.finalScore}${this.score}`, {
        fontSize: `${32 * this.gameScale}px`,
        color: "#ffffff",
      })
      .setOrigin(0.5);

    this.restartText = this.add
      .text(0, 120, this.texts.restart, {
        fontSize: `${24 * this.gameScale}px`,
        color: "#4ECDC4",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.restartText.on("pointerdown", () => {
      // Restarting main scene directly, OR should go back to Preload?
      // User wants random colors every game?
      // If so, we should go back to PreloadScene or re-run Preload logic.
      // PreloadScene generates colors. So we should start 'PreloadScene'.
      this.scene.start("PreloadScene");
    });

    this.gameOverGroup.add([bg, this.gameOverTitle, this.finalScoreText, this.restartText]);
  }
}
