import Phaser from "phaser"

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: "PreloadScene" })
  }

  preload(): void {
    this.load.audio("rim", "audio/rim.wav")
    this.load.audio("rim2", "audio/rim2.wav")
    this.load.audio("snare1", "audio/snare1.wav")
    this.load.audio("snare2", "audio/snare2.wav")
    this.load.audio("en", "audio/en.wav")
    this.load.audio("two", "audio/two.wav")
    this.load.audio("tre", "audio/tre.wav")
    this.load.audio("dintur", "audio/dintur.wav")
    this.load.audio("klar", "audio/klar.wav")
    this.load.audio("flink", "audio/flink.wav")
  }

  create(): void {
    this.scene.start("GameScene")
  }
}
