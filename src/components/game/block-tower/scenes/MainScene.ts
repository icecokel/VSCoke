import * as Phaser from "phaser";
import { BlockTowerConstants, BlockType, BlockTowerTexts } from "../BlockTowerConstants";

export class MainScene extends Phaser.Scene {
  // 게임 텍스트
  private texts: BlockTowerTexts = {
    score: "Score: ",
    height: "Height: ",
    gameOver: "GAME OVER",
    finalScore: "Final Score: ",
    restart: "Restart",
    goBack: "Go Back",
    tapToDrop: "Tap to Drop",
  };

  // 게임 상태
  private isGameOver: boolean = false;
  private isGameRunning: boolean = false;
  private score: number = 0;
  private stackedBlocks: number = 0;
  private missCount: number = 0;
  private readonly maxMisses: number = 3; // 3번까지 허용

  // UI 요소
  private scoreText: Phaser.GameObjects.Text | null = null;
  private heightText: Phaser.GameObjects.Text | null = null;
  private livesText: Phaser.GameObjects.Text | null = null;

  // 슈터 관련
  private shooter: Phaser.GameObjects.Container | null = null;
  private shooterDirection: number = 1; // 1: 오른쪽, -1: 왼쪽
  private shooterSpeed: number = BlockTowerConstants.SHOOTER.INITIAL_SPEED;
  private currentBlockType: BlockType = "largeSquare";
  private shooterBlock: Phaser.GameObjects.Sprite | null = null;

  // 착지 영역
  private landingZone: MatterJS.BodyType | null = null;

  // 난이도
  private startTime: number = 0;
  private availableBlockTypes: BlockType[] = BlockTowerConstants.DIFFICULTY.INITIAL_BLOCK_TYPES;

  // 클릭 딜레이
  private canDrop: boolean = true;
  private dropCooldown: number = 500; // 0.5초 딜레이

  // 현재 블록 속성 (장전 시 결정)
  private currentBlockScale: number = 1;
  private currentBlockColor: number = 0xffffff;
  private currentBlockMass: number = 1;

  constructor() {
    super({ key: "MainScene" });
  }

  create() {
    // 다국어 텍스트 로드
    const registryTexts = this.registry.get("texts") as BlockTowerTexts;
    if (registryTexts) {
      this.texts = registryTexts;
    }

    // 상태 초기화
    this.isGameOver = false;
    this.isGameRunning = false;
    this.score = 0;
    this.stackedBlocks = 0;
    this.shooterDirection = 1;
    this.shooterSpeed = BlockTowerConstants.SHOOTER.INITIAL_SPEED;
    this.availableBlockTypes = [...BlockTowerConstants.DIFFICULTY.INITIAL_BLOCK_TYPES];
    this.canDrop = true;
    this.missCount = 0;

    // UI 생성
    this.createUI();

    // 착지 영역 생성
    this.createLandingZone();

    // 슈터 생성
    this.createShooter();

    // 입력 이벤트
    this.input.on("pointerdown", this.handleTap, this);

    // 리사이즈 이벤트
    this.scale.on("resize", this.resize, this);
    this.game.events.on("external-resize", this.resize, this);

    // 게임 시작
    this.time.delayedCall(100, () => {
      this.startGame();
    });
  }

  private createUI() {
    const screenWidth = this.cameras.main.width;

    // 점수 (왼쪽)
    this.scoreText = this.add.text(20, 20, "0", {
      fontSize: "24px",
      color: "#ffffff",
      fontStyle: "bold",
    });

    // 높이 (오른쪽)
    this.heightText = this.add.text(screenWidth - 20, 20, "0m", {
      fontSize: "20px",
      color: "#ffd700",
    });
    this.heightText.setOrigin(1, 0);

    // 라이프 (중앙 상단)
    this.livesText = this.add.text(screenWidth / 2, 20, "❤️".repeat(this.maxMisses), {
      fontSize: "20px",
    });
    this.livesText.setOrigin(0.5, 0);
  }

  private createLandingZone() {
    const screenWidth = this.cameras.main.width;
    const screenHeight = this.cameras.main.height;
    const zoneWidth = screenWidth * BlockTowerConstants.LANDING_ZONE.WIDTH_RATIO;
    const zoneHeight = BlockTowerConstants.LANDING_ZONE.HEIGHT;

    // 착지 영역 시각화
    const graphics = this.add.graphics();
    graphics.fillStyle(0x4a5568, 1);
    graphics.fillRect(
      (screenWidth - zoneWidth) / 2,
      screenHeight - zoneHeight - 20,
      zoneWidth,
      zoneHeight,
    );

    // 물리 바디 생성 (정적)
    this.landingZone = this.matter.add.rectangle(
      screenWidth / 2,
      screenHeight - zoneHeight / 2 - 20,
      zoneWidth,
      zoneHeight,
      { isStatic: true, label: "landingZone" },
    );
  }

  private createShooter() {
    const screenWidth = this.cameras.main.width;

    // 슈터 컨테이너
    this.shooter = this.add.container(screenWidth / 2, BlockTowerConstants.SHOOTER.Y_POSITION);

    // 초기 블록 생성
    this.spawnNextBlock();
  }

  private spawnNextBlock() {
    if (!this.shooter) return;

    // 이전 블록 제거
    if (this.shooterBlock) {
      this.shooterBlock.destroy();
    }

    // 랜덤 블록 타입 선택
    this.currentBlockType = Phaser.Utils.Array.GetRandom(this.availableBlockTypes);
    const blockInfo = BlockTowerConstants.BLOCKS[this.currentBlockType];

    // 장전 시 랜덤 속성 결정
    this.currentBlockScale = 0.9 + Math.random() * 0.2; // 0.9 ~ 1.1
    this.currentBlockColor = Phaser.Utils.Array.GetRandom(BlockTowerConstants.COLOR_PALETTE);
    this.currentBlockMass = blockInfo.mass * this.currentBlockScale;

    this.shooterBlock = this.add.sprite(0, 0, `block_${this.currentBlockType}`);
    this.shooterBlock.setTint(this.currentBlockColor);
    this.shooterBlock.setScale(this.currentBlockScale);
    this.shooter.add(this.shooterBlock);
  }

  private startGame() {
    this.isGameRunning = true;
    this.startTime = this.time.now;
  }

  update(time: number, delta: number) {
    if (!this.isGameRunning) return;

    if (this.isGameOver) return;

    // 슈터 이동
    this.updateShooter(delta);

    // 난이도 조절
    this.updateDifficulty();

    // 착지 영역 밖으로 떨어진 블록 확인
    this.checkFallenBlocks();
  }

  private updateShooter(delta: number) {
    if (!this.shooter) return;

    const screenWidth = this.cameras.main.width;
    const margin = 50;

    // 위치 업데이트
    this.shooter.x += this.shooterDirection * this.shooterSpeed * (delta / 1000);

    // 경계 처리
    if (this.shooter.x >= screenWidth - margin) {
      this.shooter.x = screenWidth - margin;
      this.shooterDirection = -1;
    } else if (this.shooter.x <= margin) {
      this.shooter.x = margin;
      this.shooterDirection = 1;
    }
  }

  private updateDifficulty() {
    const elapsed = this.time.now - this.startTime;

    // 15초마다 난이도 상승
    if (elapsed > BlockTowerConstants.DIFFICULTY.RAMP_PERIOD * 2) {
      this.availableBlockTypes = BlockTowerConstants.DIFFICULTY.HARD_BLOCK_TYPES;
      this.shooterSpeed = Math.min(
        BlockTowerConstants.SHOOTER.MAX_SPEED,
        BlockTowerConstants.SHOOTER.INITIAL_SPEED + BlockTowerConstants.SHOOTER.SPEED_INCREMENT * 2,
      );
    } else if (elapsed > BlockTowerConstants.DIFFICULTY.RAMP_PERIOD) {
      this.availableBlockTypes = BlockTowerConstants.DIFFICULTY.MID_BLOCK_TYPES;
      this.shooterSpeed = Math.min(
        BlockTowerConstants.SHOOTER.MAX_SPEED,
        BlockTowerConstants.SHOOTER.INITIAL_SPEED + BlockTowerConstants.SHOOTER.SPEED_INCREMENT,
      );
    }
  }

  private handleTap() {
    if (this.isGameOver || !this.isGameRunning || !this.shooter || !this.canDrop) return;

    this.dropBlock();

    // 클릭 딜레이 적용
    this.canDrop = false;
    this.time.delayedCall(this.dropCooldown, () => {
      this.canDrop = true;
    });
  }

  private dropBlock() {
    if (!this.shooter || !this.shooterBlock) return;

    const dropX = this.shooter.x;
    const dropY = this.shooter.y;

    // 물리 블록 생성 (장전 시 결정된 속성 사용)
    const block = this.matter.add.sprite(
      dropX,
      dropY,
      `block_${this.currentBlockType}`,
      undefined,
      {
        mass: this.currentBlockMass,
        friction: BlockTowerConstants.PHYSICS.FRICTION,
        restitution: BlockTowerConstants.PHYSICS.RESTITUTION,
        label: "block",
      },
    );

    // 장전 시 결정된 색상과 스케일 적용
    block.setTint(this.currentBlockColor);
    block.setScale(this.currentBlockScale);

    this.matter.body.scale(
      block.body as MatterJS.BodyType,
      this.currentBlockScale,
      this.currentBlockScale,
    );

    // 충돌 이벤트
    block.setOnCollide((data: Phaser.Types.Physics.Matter.MatterCollisionData) => {
      this.handleBlockCollision(block, data);
    });

    // 다음 블록 생성
    this.spawnNextBlock();
  }

  private handleBlockCollision(
    block: Phaser.Physics.Matter.Sprite,
    data: Phaser.Types.Physics.Matter.MatterCollisionData,
  ) {
    const otherBody = data.bodyA.label === "block" ? data.bodyB : data.bodyA;

    // 착지 영역 또는 다른 블록과 충돌
    if (otherBody.label === "landingZone" || otherBody.label === "block") {
      // 첫 충돌 시에만 점수 추가 (이미 쌓인 블록은 제외)
      if (!block.getData("landed")) {
        block.setData("landed", true);
        this.stackedBlocks++;

        // 점수 계산
        const screenWidth = this.cameras.main.width;
        const centerX = screenWidth / 2;
        const distance = Math.abs(block.x - centerX);

        if (distance <= BlockTowerConstants.SCORE.PERFECT_THRESHOLD) {
          this.addScore(BlockTowerConstants.SCORE.PERFECT);
          this.showFloatingText(block.x, block.y - 30, "PERFECT!", "#ffd700");
        } else {
          this.addScore(BlockTowerConstants.SCORE.LAND);
        }

        // 높이 보너스 (5층마다)
        if (this.stackedBlocks % 5 === 0) {
          this.addScore(BlockTowerConstants.SCORE.HEIGHT_BONUS);
          this.showFloatingText(block.x, block.y - 50, "HEIGHT BONUS!", "#00ff00");
        }

        // 높이 업데이트
        this.updateHeight();
      }
    }
  }

  private checkFallenBlocks() {
    const screenWidth = this.cameras.main.width;
    const screenHeight = this.cameras.main.height;
    const threshold = screenHeight + BlockTowerConstants.GAME_OVER.FALL_THRESHOLD;

    // 떨어진 블록 확인
    this.matter.world.getAllBodies().forEach(body => {
      if (body.label === "block" && body.position.y > threshold) {
        // 블록 제거 (중복 처리 방지)
        body.label = "fallen";

        // 미스 카운트 증가
        this.missCount++;
        this.updateLives();
        this.showFloatingText(screenWidth / 2, screenHeight / 2, "❤️ -1", "#ff4444");

        // 3번 초과 시 게임오버
        if (this.missCount >= this.maxMisses) {
          this.gameOver();
        }
      }
    });
  }

  private updateLives() {
    if (this.livesText) {
      const remaining = this.maxMisses - this.missCount;
      this.livesText.setText("❤️".repeat(remaining) + "🩶".repeat(this.missCount));
    }
  }

  private addScore(points: number) {
    this.score += points;
    if (this.scoreText) {
      this.scoreText.setText(`${this.score}`);
    }
  }

  private updateHeight() {
    if (this.heightText) {
      // 쌓인 블록 수를 높이로 표시
      this.heightText.setText(`${this.stackedBlocks}m`);
    }
  }

  private showFloatingText(x: number, y: number, text: string, color: string) {
    const floatingText = this.add
      .text(x, y, text, {
        fontSize: "20px",
        color: color,
        stroke: "#000000",
        strokeThickness: 3,
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: floatingText,
      y: y - 50,
      alpha: 0,
      duration: 1000,
      ease: "Power2",
      onComplete: () => floatingText.destroy(),
    });
  }

  private resize(gameSize: { width: number; height: number }) {
    this.cameras.main.setViewport(0, 0, gameSize.width, gameSize.height);

    // UI 위치 업데이트
    if (this.heightText) {
      this.heightText.setPosition(gameSize.width - 20, 20);
    }
  }

  private gameOver() {
    if (this.isGameOver) return;
    this.isGameOver = true;

    // React로 이벤트 전송
    this.game.events.emit("game:over", { score: this.score });
  }
}
