import * as Phaser from "phaser";
import { PreloadScene } from "./scenes/PreloadScene";
import { MainScene } from "./scenes/MainScene";
import { BlockTowerConstants } from "./BlockTowerConstants";

export const BlockTowerConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: "100%",
  height: "100%",
  parent: "phaser-container",
  backgroundColor: "#1a1a2e",
  physics: {
    default: "matter",
    matter: {
      gravity: { x: 0, y: BlockTowerConstants.PHYSICS.GRAVITY_Y },
      debug: false,
      positionIterations: 10, // 위치 계산 정밀도 (기본 6)
      velocityIterations: 8, // 속도 계산 정밀도 (기본 4)
    },
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [PreloadScene, MainScene],
};
