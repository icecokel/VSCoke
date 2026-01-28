import * as Phaser from "phaser";
import { GameConstants, GameTexts } from "../game-constants";

export class MainScene extends Phaser.Scene {
  // ... (previous properties)

  // 게임 텍스트 (영어 하드코딩됨)
  private texts: GameTexts = {
    score: "Score: ",
    deadline: "DEADLINE",
    start: "START",
    gameOver: "GAME OVER",
    finalScore: "Final Score: ",
    restart: "Restart",
    goBack: "Go Back",
    time: "Time: ",
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
  private currentSpawnInterval: number = GameConstants.INITIAL_SPAWN_INTERVAL;
  private deadlineY: number = 0;

  // 시간 및 난이도
  private startTime: number = 0;
  private timeText: Phaser.GameObjects.Text | null = null;

  // 경고 오버레이
  private warningOverlay: Phaser.GameObjects.Rectangle | null = null;
  private isWarningActive: boolean = false;

  // 파티클 이미터 (색상별 관리)
  private emitters: Map<number, Phaser.GameObjects.Particles.ParticleEmitter> = new Map();

  constructor() {
    super({ key: "MainScene" });
  }

  // PreloadScene으로 이동된 사전 로드

  create() {
    // 색상 로드 (PreloadScene에서 생성됨)
    this.currentColors = this.registry.get("currentColors");
    if (!this.currentColors || this.currentColors.length === 0) {
      // 누락시 대체 (발생하지 않아야 함)
      const colorCount = GameConstants.COLOR_COUNT_BY_COLS[this.COLS] || 5;
      this.currentColors = GameConstants.BLOCK_PALETTE.slice(0, colorCount);
    }

    // 파티클 이미터 초기화 (색상별로 생성)
    this.currentColors.forEach(color => {
      const emitter = this.add.particles(0, 0, "particle", {
        lifespan: 600,
        speed: { min: 150, max: 300 },
        scale: { start: 0.8, end: 0 },
        alpha: { start: 1, end: 0 },
        blendMode: "ADD",
        emitting: false,
        tint: color,
        gravityY: 200,
      });
      this.emitters.set(color, emitter);
    });

    // 다국어 텍스트 로드
    const registryTexts = this.registry.get("texts") as GameTexts;
    if (registryTexts) {
      this.texts = registryTexts;
    }

    this.isGameOver = false;
    this.score = 0;
    this.columns = [[], [], []];
    this.pickedBlock = null;
    this.pickedColIdx = -1;
    this.colBgs = [];

    // 점수 (왼쪽)
    this.scoreText = this.add.text(20, 20, "0", {
      fontSize: "20px",
      color: "#ffffff",
      fontStyle: "bold",
    });

    // 시간 (오른쪽)
    this.timeText = this.add.text(this.scale.width - 20, 20, "00:00", {
      fontSize: "20px",
      color: "#ffffff",
    });
    this.timeText.setOrigin(1, 0); // 오른쪽 정렬

    // 경고 오버레이 (가장 위에 그려지도록 마지막에 추가하거나 depth 조절)
    this.warningOverlay = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0xff0000);
    this.warningOverlay.setOrigin(0, 0);
    this.warningOverlay.setAlpha(0);
    this.warningOverlay.setDepth(100); // UI보다 아래, 게임보다 위? 상황에 따라 조절. 여기선 최상위로 하고 투명도 조절
    this.warningOverlay.setBlendMode(Phaser.BlendModes.ADD);

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
      () => {
        this.updateLayout();
      },
      this,
    );

    // 게임 바로 시작 (약간의 지연 후 실행하여 레이아웃 안정화)
    this.time.delayedCall(100, () => {
      this.startGameLogic();
    });

    // 키보드 입력 추가 (Q, W, E)
    if (this.input.keyboard) {
      this.input.keyboard.on("keydown-Q", () => this.handleColumnClick(0));
      this.input.keyboard.on("keydown-W", () => this.handleColumnClick(1));
      this.input.keyboard.on("keydown-E", () => this.handleColumnClick(2));
    }
  }

  private resize(gameSize: Phaser.Structs.Size) {
    this.cameras.main.setViewport(0, 0, gameSize.width, gameSize.height);
    if (this.warningOverlay) {
      this.warningOverlay.setSize(gameSize.width, gameSize.height);
    }
    this.updateLayout();
  }

  private updateLayout() {
    const screenWidth = this.cameras.main.width;
    const screenHeight = this.cameras.main.height;

    const { SIDE_MARGIN, BLOCK_SPACING } = GameConstants.LAYOUT;

    // 가로 여백을 제외한 사용 가능 너비
    const availableWidth = screenWidth - SIDE_MARGIN * 2;

    // 블록 spacing 합계
    const totalSpacingX = BLOCK_SPACING * (this.COLS - 1);

    // 1. 너비 기준 스케일 계산
    const targetBlockWidth = (availableWidth - totalSpacingX) / this.COLS;
    const scaleX = targetBlockWidth / this.BASE_BLOCK_WIDTH;

    // 2. 높이 기준 스케일 계산
    // 상단 여백(100) + (12줄 * (블록높이32 + 여백4)) + 여유 공간(50)
    // 화면 높이가 이보다 작으면 스케일을 줄여야 함
    const topMargin = 100;
    const bottomPadding = 50;
    const verticalContentHeight =
      GameConstants.MAX_STACK_HEIGHT * (this.BASE_BLOCK_HEIGHT + this.BASE_BLOCK_SPACING_Y);
    const availableHeightForBlocks = screenHeight - topMargin - bottomPadding;

    // 블록들이 들어갈 수 있는 최대 스케일
    const scaleY = availableHeightForBlocks / verticalContentHeight;

    // 더 작은 스케일 적용 (화면 안에 다 들어오도록)
    this.gameScale = Math.min(scaleX, scaleY);

    // 최소/최대 스케일 제한 (선택 사항)
    this.gameScale = Math.min(this.gameScale, 1.5); // 너무 커지지 않게 제한

    // 비율 조정 적용 (컬럼 너비 비율)
    // this.gameScale *= COLUMN_WIDTH_RATIO; // 높이 제한 때문에 너비 비율 조정은 신중해야 함 -> 일단 제거 또는 보정

    const currentBlockWidth = this.BASE_BLOCK_WIDTH * this.gameScale;
    const currentSpacingX = BLOCK_SPACING; // 고정 픽셀? 아니면 이것도 스케일? -> 일단 유지

    // 점수/시간 UI 업데이트
    const uiFontSize = `${20 * Math.min(1, this.gameScale * 1.5)}px`;
    if (this.scoreText) {
      this.scoreText.setFontSize(uiFontSize);
    }
    if (this.timeText) {
      this.timeText.setFontSize(uiFontSize);
      this.timeText.setPosition(screenWidth - 20, 20);
    }

    const totalVisualWidth = currentBlockWidth * this.COLS + currentSpacingX * (this.COLS - 1);
    const startX = (screenWidth - totalVisualWidth) / 2 + currentBlockWidth / 2;

    // 컬럼 배경 업데이트
    this.colBgs.forEach((bg, i) => {
      const x = startX + i * (currentBlockWidth + currentSpacingX);

      bg.clear();
      bg.lineStyle(2, 0xffffff, 0.1);

      const w = currentBlockWidth;
      const h = screenHeight;

      bg.setPosition(0, 0);
      bg.strokeRect(x - w / 2, 0, w, h);
      bg.input!.hitArea.setTo(x - w / 2, 0, w, h);
    });

    // 데드라인 업데이트 (고정된 줄 수 기준)
    const startY = 100;
    const currentBlockHeight = this.BASE_BLOCK_HEIGHT * this.gameScale;
    const currentSpacingY = this.BASE_BLOCK_SPACING_Y * this.gameScale;
    const blockTotalHeight = currentBlockHeight + currentSpacingY;

    // 데드라인은 12번째 블록의 바닥 바로 아래
    this.deadlineY = startY + GameConstants.MAX_STACK_HEIGHT * blockTotalHeight;

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
    // 데드라인 텍스트 업데이트
    if (this.deadlineText) {
      this.deadlineText.setPosition(screenWidth / 2, this.deadlineY + 10);
      this.deadlineText.setFontSize(`${14}px`);
    }

    // 기존 블록들 위치 업데이트
    for (let i = 0; i < this.COLS; i++) {
      // 즉시 위치 갱신 (애니메이션 없이)
      this.updateColumnVisuals(i, false);
    }
  }

  private startGameLogic() {
    // 초기 블록 생성 (스케줄링 없이)
    this.spawnRow(false);
    this.spawnRow(false);
    this.spawnRow(false);

    // 시작 시간 기록
    this.startTime = this.time.now;
    this.currentSpawnInterval = GameConstants.INITIAL_SPAWN_INTERVAL;

    // 첫 스폰 예약 (여기서부터 루프 시작)
    this.scheduleNextSpawn();
  }

  private scheduleNextSpawn() {
    if (this.isGameOver) return;

    this.spawnTimer = this.time.delayedCall(this.currentSpawnInterval, this.spawnRow, [true], this);
  }

  update() {
    if (this.isGameOver) return;

    // 1. 시간 업데이트
    const elapsed = this.time.now - this.startTime;
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    const displaySeconds = seconds % 60;

    const timeString = `${minutes.toString().padStart(2, "0")}:${displaySeconds.toString().padStart(2, "0")}`;
    if (this.timeText) {
      this.timeText.setText(timeString);
    }

    // 2. 난이도 조절 (시간 경과에 따라 스폰 간격 감소)
    // 10초마다 100ms 감소 (예시)
    const rampSteps = Math.floor(elapsed / GameConstants.DIFFICULTY_RAMP_PERIOD);
    const newInterval =
      GameConstants.INITIAL_SPAWN_INTERVAL - rampSteps * GameConstants.DIFFICULTY_RAMP_RATE;
    this.currentSpawnInterval = Math.max(GameConstants.MIN_SPAWN_INTERVAL, newInterval);

    // 3. 위기 경고 효과 (가장 높은 탑 확인)
    this.checkWarningStatus();
  }

  private checkWarningStatus() {
    let minRowsFromDeadline = 999;
    const currentBlockHeight = this.BASE_BLOCK_HEIGHT * this.gameScale;
    const currentSpacingY = this.BASE_BLOCK_SPACING_Y * this.gameScale;
    // 데드라인 Y 위치 (this.deadlineY)
    // 블록 바닥 Y 위치 계산식: startY + (index) * height...
    // 역으로 계산하기보다, 가장 높은 블록의 Y좌표를 찾아서 데드라인과의 거리를 측정

    const startY = 100;

    for (const col of this.columns) {
      if (col.length === 0) continue;

      // 가장 아래(마지막)에 추가된 블록이 화면상 가장 아래에 위치함 (y값이 큼)
      // 하지만 "쌓이는" 구조상, 배열의 앞쪽이나 뒤쪽이 위쪽인지를 확인해야 함.
      // spawnRow에서 unshift(block) 하므로, index 0이 가장 위쪽(y값이 작음), 마지막 index가 가장 아래쪽(y값이 큼)
      // 탑의 높이는 col.length.
      // 데드라인에 닿는 것은 가장 아래쪽 블록의 바닥면... 이 아니라
      // "블록이 데드라인을 넘어가면" 게임오버.
      // 즉, col.length 가 커질수록 위험.
      // 화면에 그려지는 Y좌표: startY + index * (h + space)
      // 가장 아래 블록(index = col.length-1)의 Y + h 가 deadlineY 보다 크면 아웃.

      // 위기 상황: 데드라인에 가까워짐.
      // 즉, (데드라인Y - 가장 아래 블록의 바닥Y) 가 아니라,
      // "앞으로 몇 개 더 쌓이면 죽는가?"
      // 죽는 조건: bottomY > deadlineY
      // bottomY = startY + (col.length) * (h + s)
      // 여유 공간 = deadlineY - bottomY
      // 블록 하나 높이 = h + s
      // 남은 블록 수 = 여유 공간 / (h + s)

      const totalBlockH = currentBlockHeight + currentSpacingY;
      const currentBottomY = startY + col.length * totalBlockH; // 현재 쌓인 높이의 바닥

      const distance = this.deadlineY - currentBottomY;
      const rowsLeft = distance / totalBlockH;

      if (rowsLeft < minRowsFromDeadline) {
        minRowsFromDeadline = rowsLeft;
      }
    }

    // 임계값보다 적게 남았으면 경고
    if (minRowsFromDeadline <= GameConstants.WARNING_THRESHOLD_ROWS) {
      if (!this.isWarningActive) {
        this.isWarningActive = true;
        if (this.warningOverlay) {
          this.tweens.add({
            targets: this.warningOverlay,
            alpha: { from: 0, to: 0.3 },
            duration: 500,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut",
          });
        }
      }
    } else {
      if (this.isWarningActive) {
        this.isWarningActive = false;
        if (this.warningOverlay) {
          this.tweens.killTweensOf(this.warningOverlay);
          this.warningOverlay.setAlpha(0);
        }
      }
    }
  }

  private handleColumnClick(colIdx: number) {
    if (this.isGameOver) return;
    // 이제 게임이 즉시 시작되므로 isGameRunning 확인이 필요 없거나 항상 true로 가정

    // ... 로직 계속 ...
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

  private spawnRow(autoSchedule: boolean = true) {
    if (this.isGameOver) return;

    for (let i = 0; i < this.COLS; i++) {
      // 동적으로 선택된 색상 사용
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

    // 다음 스폰 예약 (Recursive)
    if (autoSchedule) {
      this.scheduleNextSpawn();
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

  private updateColumnVisuals(colIdx: number, animate: boolean = true) {
    const col = this.columns[colIdx];
    const screenWidth = this.cameras.main.width;

    const { BLOCK_SPACING } = GameConstants.LAYOUT;

    const currentBlockWidth = this.BASE_BLOCK_WIDTH * this.gameScale;
    const currentBlockHeight = this.BASE_BLOCK_HEIGHT * this.gameScale;
    const currentSpacingX = BLOCK_SPACING;
    const currentSpacingY = this.BASE_BLOCK_SPACING_Y * this.gameScale;

    const totalVisualWidth = currentBlockWidth * this.COLS + currentSpacingX * (this.COLS - 1);
    const startX = (screenWidth - totalVisualWidth) / 2 + currentBlockWidth / 2;
    const x = startX + colIdx * (currentBlockWidth + currentSpacingX);

    const startY = 100;

    col.forEach((block, index) => {
      const targetY = startY + index * (currentBlockHeight + currentSpacingY);

      if (animate) {
        this.tweens.add({
          targets: block,
          x: x,
          y: targetY,
          scale: this.gameScale,
          duration: 100,
        });
      } else {
        block.x = x;
        block.y = targetY;
        block.setScale(this.gameScale);
      }
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
      const color = last.getData("color");

      // 효과 중심점 계산 (중간 블록 위치)
      const centerX = secondLast.x;
      const centerY = secondLast.y;

      // 1. 카메라 흔들림
      this.cameras.main.shake(150, 0.01);

      // 2. 파티클 폭발
      const emitter = this.emitters.get(color);
      if (emitter) {
        // 각 블록 위치에서 폭발
        removed.forEach(block => {
          emitter.explode(10, block.x, block.y); // 블록당 10개 파티클
        });
      }

      // 3. 점수 텍스트 표시 (+100)
      this.showFloatingText(centerX, centerY - 20, 100);

      // 4. 블록 파괴 애니메이션 (팝 효과)
      removed.forEach(block => {
        // 먼저 살짝 커졌다가
        this.tweens.add({
          targets: block,
          scale: this.gameScale * 1.3,
          duration: 100,
          yoyo: false,
          onComplete: () => {
            // 작아지면서 사라짐
            this.tweens.add({
              targets: block,
              scale: 0,
              alpha: 0,
              duration: 150,
              onComplete: () => block.destroy(),
            });
          },
        });
      });

      this.addScore(100);
    }
  }

  private showFloatingText(x: number, y: number, score: number) {
    const text = this.add
      .text(x, y, `+${score}`, {
        fontSize: `${24 * this.gameScale}px`,
        color: "#ffd700", // 금색
        stroke: "#000000",
        strokeThickness: 3,
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: text,
      y: y - 50,
      alpha: 0,
      duration: 1000,
      ease: "Power2",
      onComplete: () => text.destroy(),
    });
  }

  private addScore(points: number) {
    this.score += points;
    if (this.scoreText) {
      this.scoreText.setText(`${this.score}`);
    }
  }

  private gameOver() {
    this.isGameOver = true;
    if (this.spawnTimer) this.spawnTimer.destroy();

    // EndScene 대신 React로 이벤트 전송
    this.game.events.emit("game:over", { score: this.score });
  }
}
