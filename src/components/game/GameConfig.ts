import * as Phaser from "phaser";
import { MainScene } from "./scenes/MainScene";
import { PreloadScene } from "./scenes/PreloadScene";
import { EndScene } from "./scenes/EndScene";

export const GameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: "100%",
  height: "100%",
  parent: "phaser-container",
  backgroundColor: "#2d2d2d",
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
  scene: [PreloadScene, MainScene, EndScene],
};
