import * as Phaser from "phaser";
import { BlockTowerConstants, BlockType, BlockTowerTexts } from "../block-tower-constants";

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
  private shotCount: number = 0;
  private readonly maxMisses: number = 3; // 3번까지 허용
  private highestBlockY: number = 0; // 가장 높이 쌓인 블록의 Y좌표

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
  private currentBlockWeights: { type: BlockType; weight: number }[] =
    BlockTowerConstants.DIFFICULTY.INITIAL_WEIGHTS;

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
    this.highestBlockY = this.cameras.main.height; // 초기값: 화면 바닥
    this.shooterDirection = 1;
    this.shooterSpeed = BlockTowerConstants.SHOOTER.INITIAL_SPEED;
    this.shooterSpeed = BlockTowerConstants.SHOOTER.INITIAL_SPEED;
    this.currentBlockWeights = BlockTowerConstants.DIFFICULTY.INITIAL_WEIGHTS;
    this.canDrop = true;
    this.missCount = 0;
    this.shotCount = 0;

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

    // UI 고정 (텍스트는 유지)
    if (this.scoreText) this.scoreText.setScrollFactor(0);
    if (this.heightText) this.heightText.setScrollFactor(0);
    if (this.livesText) this.livesText.setScrollFactor(0);

    // 바닥과 슈터는 물리 연산과 위치 동기화를 위해 ScrollFactor 대신 직접 좌표 제어
    // graphics.setScrollFactor(0); // 제거
  }

  private createShooter() {
    const screenWidth = this.cameras.main.width;

    // 슈터 컨테이너
    this.shooter = this.add.container(screenWidth / 2, BlockTowerConstants.SHOOTER.Y_POSITION);
    // this.shooter.setScrollFactor(0); // 제거: 물리 위치와 시각 위치 일치를 위해 직접 제어

    // 초기 블록 생성
    this.spawnNextBlock();
  }

  private spawnNextBlock() {
    if (!this.shooter) return;

    // 이전 블록 제거
    if (this.shooterBlock) {
      this.shooterBlock.destroy();
    }

    // 가중치 기반 랜덤 블록 선택
    const totalWeight = this.currentBlockWeights.reduce((sum, item) => sum + item.weight, 0);
    const randomValue = Math.random() * totalWeight;

    let accumulatedWeight = 0;
    for (const item of this.currentBlockWeights) {
      accumulatedWeight += item.weight;
      if (randomValue <= accumulatedWeight) {
        this.currentBlockType = item.type;
        break;
      }
    }
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

    // 1. 카메라 스크롤 (가장 높은 블록 추적)
    this.updateCameraScroll();

    // 2. 슈터 위치 동기화 (카메라 이동에 따라, 바닥은 고정)
    this.updateShooterPosition();
  }

  private updateShooterPosition() {
    if (!this.shooter) return;

    const scrollY = this.cameras.main.scrollY;

    // 슈터 위치 업데이트: 화면 상단 고정
    this.shooter.y = scrollY + BlockTowerConstants.SHOOTER.Y_POSITION;
  }

  private updateCameraScroll() {
    const screenHeight = this.cameras.main.height;

    // 가장 높은 블록이 화면 중앙보다 위로 올라가면 카메라 이동
    // highestBlockY는 월드 좌표계 기준이므로 작을수록 높음
    // 목표: highestBlockY가 화면 중앙에 오도록 함

    // 현재 가장 높은 블록 찾기
    let minBodyY = screenHeight; // 초기화

    this.matter.world.getAllBodies().forEach(body => {
      const gameObject = (
        body as MatterJS.BodyType & { gameObject?: Phaser.GameObjects.GameObject }
      ).gameObject;

      if (body.label === "block" && gameObject && gameObject.getData("landed")) {
        // 이미 떨어진 블록 제외
        if (body.position.y < minBodyY) {
          minBodyY = body.position.y;
        }
      }
    });

    // 아직 블록이 없거나 바닥 근처면 바닥 기준
    if (minBodyY === screenHeight) {
      if (this.landingZone) {
        minBodyY = this.landingZone.position.y - BlockTowerConstants.LANDING_ZONE.HEIGHT;
      }
    }

    this.highestBlockY = minBodyY;

    // 목표 스크롤 Y값 계산: (가장 높은 블록 위치) - (화면 절반 높이)
    // 블록이 높이 쌓일수록 Y값이 작아지므로, 카메라도 위로 올라가야 함 (Y값이 작아짐)
    const targetScrollY = this.highestBlockY - screenHeight / 2;

    // 바닥보다 아래(스크롤 > 0)로는 내려가지 않도록 제한 (Initial state)
    // 사실 기본 scrollY는 0이고 위로 올라가려면 음수가 되어야 함.
    // 하지만 Phaser 카메라는 scrollY 값만큼 월드 좌표를 빼서 렌더링함.
    // 월드 좌표는 (0,0)에서 시작해 아래로 증가. 카메라는 이걸 그대로 비춤.
    // 탑이 쌓이면 Y값은 0을 향해, 그리고 음수로 갈 수도 있음 (만약 0 위로 뚫고 가면).
    // 아니면 카메라는 계속 아래에 있고 싶어하는데 블록은 위(작은 Y)로 감.
    // 카메라가 위(작은 Y)를 비추려면 scrollY도 작아져야 함.

    // 하지만! 보통 이런 게임은 월드 좌표계가 고정되어 있고 카메라가 움직임.
    // 초기 바닥 위치가 화면 하단 근처임. (Start Y approx 800)
    // 블록 쌓이면 Y: 700, 600, ...
    // 화면 중앙에 맞추려면: 카메라의 중심(centerY)이 블록의 Y와 일치해야 함.
    // camera.scrollY + screenHeight/2 = highestBlockY
    // => targetScrollY = highestBlockY - screenHeight/2

    // 초기 상태: highestBlockY = 800, screenH = 900 -> target = 800 - 450 = 350
    // => scrollY가 양수? -> 카메라가 (0, 350)을 TopLeft로 비춤 -> 350~1250 영역이 보임
    // 이건 카메라가 아래로 내려간 것임.

    // 아! Phaser 좌표계는 Y가 아래로 증가함.
    // 바닥은 Y가 큼. 천장은 Y가 작음.
    // 블록이 쌓일수록 Y좌표는 작아짐.
    // 카메라가 위로 올라가려면(작은 Y좌표를 보려면) scrollY가 줄어들어야 함.

    // 현재 뷰: scrollY=0 (0 ~ screenHeight 보임)
    // 만약 highestBlockY가 300이고 화면 높이가 800이면,
    // 현재 화면(0~800)에 300이 포함되므로 잘 보임.

    // 만약 highestBlockY가 -100이면? (화면 위로 넘어감)
    // 화면에 보이려면 카메라도 위로 가야 함 -> scrollY가 -값이어야 함.
    // targetScrollY = highestBlockY - (screenHeight / 2)
    // -100 - 400 = -500.
    // scrollY = -500이면 (-500 ~ 300) 영역을 비춤. -100이 중앙임. 맞음.

    // 단, 바닥이 들리지 않게 하한선 설정 필요
    // 초기에는 scrollY가 0이어야 함.
    // targetScrollY가 0보다 크면(카메라가 아래로 내려가려 하면) 0으로 고정?
    // 아니면 그냥 놔둘지? -> 바닥은 고정되어 있으니 카메라가 아래로 가면 바닥 아래 공간이 보임.
    // 따라서 Math.min(..., 0)으로 상한선을 둬야 함 (최대 0).

    const limitedTargetScrollY = Math.min(targetScrollY, 0);

    // 부드러운 이동 (Lerp)
    this.cameras.main.scrollY += (limitedTargetScrollY - this.cameras.main.scrollY) * 0.05;
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
    // 샷 횟수에 따른 난이도 상승
    if (this.shotCount >= BlockTowerConstants.DIFFICULTY.SHOT_THRESHOLDS.HARD) {
      this.currentBlockWeights = BlockTowerConstants.DIFFICULTY.HARD_WEIGHTS;
      this.shooterSpeed = Math.min(
        BlockTowerConstants.SHOOTER.MAX_SPEED,
        BlockTowerConstants.SHOOTER.INITIAL_SPEED + BlockTowerConstants.SHOOTER.SPEED_INCREMENT * 2,
      );
    } else if (this.shotCount >= BlockTowerConstants.DIFFICULTY.SHOT_THRESHOLDS.MID) {
      this.currentBlockWeights = BlockTowerConstants.DIFFICULTY.MID_WEIGHTS;
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

    // 물리 바디 옵션
    const bodyOptions: Phaser.Types.Physics.Matter.MatterBodyConfig = {
      mass: this.currentBlockMass,
      friction: BlockTowerConstants.PHYSICS.FRICTION,
      restitution: BlockTowerConstants.PHYSICS.RESTITUTION,
      label: "block",
    };

    // 삼각형인 경우 모양(Vertices) 정의
    if (this.currentBlockType.includes("triangle")) {
      const blockInfo = BlockTowerConstants.BLOCKS[this.currentBlockType];
      const w = blockInfo.width;
      const h = blockInfo.height;
      let verts;

      if (this.currentBlockType === "triangle1") {
        // 좌하단 직각 (|__)
        // Matter.js는 Vertices를 시계 방향으로 정의해야 함
        // (0, 0) -> (w, h) -> (0, h)
        verts = [
          { x: 0, y: 0 },
          { x: w, y: h },
          { x: 0, y: h },
        ];
      } else {
        // 역방향 (__|)
        // (w, 0) -> (w, h) -> (0, h)
        verts = [
          { x: w, y: 0 },
          { x: w, y: h },
          { x: 0, y: h },
        ];
      }

      bodyOptions.shape = {
        type: "fromVertices",
        verts: verts,
      };
    }

    // 물리 블록 생성 (장전 시 결정된 속성 사용)
    const block = this.matter.add.sprite(
      dropX,
      dropY,
      `block_${this.currentBlockType}`,
      undefined,
      bodyOptions,
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
    this.shotCount++;
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

    // 1. 메모리 최적화: 화면 높이의 1.2배 밖으로 나가면 제거
    const deleteThreshold = this.cameras.main.scrollY + screenHeight * 1.2;

    // 안전지대 X 범위 계산 (착지 영역 너비 + 여유값)
    const landingZoneWidth = screenWidth * BlockTowerConstants.LANDING_ZONE.WIDTH_RATIO;
    const safeZoneMargin = 60; // 좌우 여유값
    const centerX = screenWidth / 2;
    const safeMinX = centerX - landingZoneWidth / 2 - safeZoneMargin;
    const safeMaxX = centerX + landingZoneWidth / 2 + safeZoneMargin;

    // 떨어진 블록 확인
    this.matter.world.getAllBodies().forEach(body => {
      // 블록이 아니거나 이미 처리된 경우 스킵
      if (body.label !== "block") return;

      // 제거 임계값을 넘었는지 확인
      if (body.position.y > deleteThreshold) {
        const gameObject = (
          body as MatterJS.BodyType & { gameObject?: Phaser.GameObjects.GameObject }
        ).gameObject;

        if (gameObject && gameObject instanceof Phaser.GameObjects.GameObject) {
          const isLanded = gameObject.getData("landed");
          const x = body.position.x;

          // 판정 로직
          // 1. 정상 블록: 이미 안착했고(landed) && 안전지대(X) 안에 있음
          //    -> 타워의 하단부로서 스크롤 아웃된 것. 페널티 없이 제거.
          const isSafe = isLanded && x >= safeMinX && x <= safeMaxX;

          if (isSafe) {
            // 조용히 제거 (메모리 해제)
            gameObject.destroy();
          } else {
            // 실패: 안착하지 못했거나(허공), 안착했더라도 밀려 떨어짐(범위 밖)
            // 중복 처리 방지
            body.label = "fallen";

            this.missCount++;
            this.updateLives();
            this.showFloatingText(screenWidth / 2, screenHeight / 2, "❤️ -1", "#ff4444");

            // 블록 제거
            gameObject.destroy();

            // 3번 초과 시 게임오버
            if (this.missCount >= this.maxMisses) {
              this.gameOver();
            }
          }
        } else {
          // 게임 오브젝트가 없는 물리 바디만 남은 경우 (예외 처리)
          this.matter.world.remove(body);
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
