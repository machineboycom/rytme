import Phaser from "phaser"

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: "PreloadScene" })
  }

  preload(): void {
    this.load.audio("rim", "audio/rim.wav")
    this.load.audio("snare1", "audio/snare1.wav")
    this.load.audio("snare2", "audio/snare2.wav")
  }

  create(): void {
    this.scene.start("GameScene")
  }
}
