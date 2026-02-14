import * as Phaser from "phaser";
import { GameOverScene } from "./scenes/game-over-scene";
import { MainScene } from "./scenes/main-scene";
import { PreloadScene } from "./scenes/preload-scene";

export const ArrowDriftGameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: "100%",
  height: "100%",
  parent: "arrow-drift-phaser-container",
  backgroundColor: "#020617",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [PreloadScene, MainScene, GameOverScene],
};
