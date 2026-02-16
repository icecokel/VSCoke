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
    this.cameras.main.setBackgroundColor("#03172f");

    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    this.add
      .text(centerX, centerY - 32, "SWIM OVER", {
        fontSize: "42px",
        color: "#e0f2fe",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(centerX, centerY + 20, `Score: ${this.score}`, {
        fontSize: "30px",
        color: "#6ee7b7",
      })
      .setOrigin(0.5);

    this.game.events.emit("game:over", { score: this.score });
  }
}
