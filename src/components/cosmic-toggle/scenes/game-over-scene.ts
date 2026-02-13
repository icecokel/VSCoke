import * as Phaser from "phaser";

interface GameOverSceneData {
  score?: number;
}

export class GameOverScene extends Phaser.Scene {
  private score = 0;

  constructor() {
    super({ key: "GameOverScene" });
  }

  init(data: GameOverSceneData) {
    this.score = data.score ?? 0;
  }

  create() {
    this.cameras.main.setBackgroundColor("#020617");

    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    this.add
      .text(centerX, centerY - 32, "GAME OVER", {
        fontSize: "42px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(centerX, centerY + 20, `Score: ${this.score}`, {
        fontSize: "30px",
        color: "#67e8f9",
      })
      .setOrigin(0.5);

    this.game.events.emit("game:over", { score: this.score });
  }
}
