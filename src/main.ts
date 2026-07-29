import Phaser from "phaser";
import { PreloadScene } from "./scenes/PreloadScene";
import { GameScene } from "./scenes/GameScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.CANVAS,
  parent: document.body,
  transparent: true,
  scale: {
    mode: Phaser.Scale.NONE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 400,
    height: 600,
  },
  scene: [PreloadScene, GameScene],
  input: {
    activePointers: 1,
  },
  render: {
    antialias: true,
  },
};

document.getElementById("start-btn")!.addEventListener("click", () => {
  document.getElementById("overlay")!.classList.add("hidden");
  new Audio("/audio/ding.wav").play().catch(() => {});
  setTimeout(() => new Phaser.Game(config), 500);
});
