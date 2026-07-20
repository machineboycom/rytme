import Phaser from "phaser";
import { audio } from "../audio/LowLatencyAudio";
import { colors } from "../theme";

export class StartScene extends Phaser.Scene {
  constructor() {
    super({ key: "StartScene" });
  }

  create(): void {
    audio.setContext(
      (this.sound as Phaser.Sound.WebAudioSoundManager).context
    );

    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(colors.bg);

    const logo = this.add
      .text(width / 2, height * 0.35, "RYTME", {
        fontFamily: "Arial, sans-serif",
        fontSize: "64px",
        color: colors.textWhite,
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const btnR = Math.min(120, width * 0.2);
    const btnCX = width / 2;
    const btnCY = height * 0.6;

    const btn = this.add.graphics();
    btn.fillStyle(colors.accent, 1);
    btn.fillCircle(btnCX, btnCY, btnR);

    const label = this.add
      .text(btnCX, btnCY, "START", {
        fontFamily: "Arial, sans-serif",
        fontSize: "28px",
        color: colors.textWhite,
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const hitArea = this.add
      .zone(btnCX, btnCY, btnR * 2, btnR * 2)
      .setInteractive();
    hitArea.on("pointerdown", () => this.startGame());
    this.input.keyboard!.on("keydown-SPACE", () => this.startGame());

    const pulse = this.tweens.add({
      targets: [btn, label],
      alpha: 0.6,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  private startGame(): void {
    this.scene.start("GameScene");
  }
}
