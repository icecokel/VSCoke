import * as Phaser from "phaser";
import { GameTexts } from "../GameConstants";

export class EndScene extends Phaser.Scene {
  private score: number = 0;
  private gameOverTitle: Phaser.GameObjects.Text | null = null;
  private finalScoreText: Phaser.GameObjects.Text | null = null;
  private restartText: Phaser.GameObjects.Text | null = null;
  private goBackText: Phaser.GameObjects.Text | null = null;
  private gameOverGroup: Phaser.GameObjects.Container | null = null;

  constructor() {
    super({ key: "EndScene" });
  }

  init(data: { score: number }) {
    this.score = data.score || 0;
  }

  create() {
    const { width, height } = this.scale;
    const texts = this.registry.get("texts") as GameTexts;

    // 배경 (투명도 있는 검정)
    const bg = this.add.rectangle(0, 0, width, height, 0x000000, 0.7);

    // 게임 오버 타이틀
    this.gameOverTitle = this.add
      .text(0, -100, texts?.gameOver || "GAME OVER", {
        fontSize: "48px",
        color: "#ff4444",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    // 최종 점수
    this.finalScoreText = this.add
      .text(0, 0, `${texts?.finalScore || "Final Score: "}${this.score}`, {
        fontSize: "32px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    // 다시 시작 버튼
    this.restartText = this.add
      .text(0, 80, texts?.restart || "Restart", {
        fontSize: "24px",
        color: "#4ECDC4",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        // MainScene 재시작
        this.game.events.emit("game:restart");
        this.scene.start("MainScene");
      });

    // 뒤로 가기 버튼 (준비 화면으로)
    this.goBackText = this.add
      .text(0, 140, texts?.goBack || "Go Back", {
        fontSize: "20px",
        color: "#aaaaaa",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        this.game.events.emit("game:goToReady");
      });

    // 컨테이너에 그룹화
    this.gameOverGroup = this.add.container(width / 2, height / 2);
    this.gameOverGroup.add([
      bg,
      this.gameOverTitle,
      this.finalScoreText,
      this.restartText,
      this.goBackText,
    ]);

    // 리사이즈 이벤트 연결
    this.scale.on("resize", this.resize, this);
    this.game.events.on("external-resize", this.resize, this);
  }

  private resize(gameSize: { width: number; height: number }) {
    if (!this.cameras.main) return;

    // 뷰포트 업데이트
    this.cameras.main.setViewport(0, 0, gameSize.width, gameSize.height);

    const { width, height } = this.scale;

    // UI 위치 및 크기 업데이트
    if (this.gameOverGroup) {
      this.gameOverGroup.setPosition(width / 2, height / 2);

      const bg = this.gameOverGroup.list[0] as Phaser.GameObjects.Rectangle;
      if (bg) {
        bg.setSize(width, height);
      }
    }
  }
}
