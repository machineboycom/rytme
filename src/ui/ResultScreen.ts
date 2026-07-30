import Phaser from "phaser";
import { colors } from "../theme";

/** Resultatskjerm: poeng-oppsummering, rekordvisning, prøv-igjen-knapp og tile-reveal-animasjon. */
export class ResultScreen {
  readonly btnCX: number;
  readonly btnCY: number;

  resultText: Phaser.GameObjects.Text;
  recordLabel: Phaser.GameObjects.Text;
  recordValue: Phaser.GameObjects.Text;
  recordSuffix: Phaser.GameObjects.Text;
  retryBtnGraphics: Phaser.GameObjects.Graphics;
  retryBtnLabel: Phaser.GameObjects.Text;

  resultRevealIndex = 0;
  resultTimer?: Phaser.Time.TimerEvent;

  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, btnCX: number, btnCY: number) {
    this.scene = scene;
    this.btnCX = btnCX;
    this.btnCY = btnCY;

    this.resultText = scene.add
      .text(btnCX, btnCY - 50, "", {
        fontFamily: "'NRK Sans Variable', Arial, sans-serif",
        fontSize: "18px",
        color: colors.textWhite,
        fontStyle: "normal",
        align: "center",
      })
      .setOrigin(0.5)
      .setAlpha(0);

    const recordStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: "'NRK Sans Variable', Arial, sans-serif",
      fontSize: "18px",
      fontStyle: "normal",
    };
    this.recordLabel = scene.add
      .text(0, 0, "", { ...recordStyle, color: colors.textWhite })
      .setOrigin(0, 0.5)
      .setAlpha(0);
    this.recordValue = scene.add
      .text(0, 0, "", { ...recordStyle, color: "#ffcc00" })
      .setOrigin(0, 0.5)
      .setAlpha(0);
    this.recordSuffix = scene.add
      .text(0, 0, "", { ...recordStyle, color: colors.textWhite })
      .setOrigin(0, 0.5)
      .setAlpha(0);

    this.retryBtnGraphics = scene.add.graphics().setAlpha(0);

    this.retryBtnLabel = scene.add
      .text(btnCX, btnCY + 80, "PRØV IGJEN", {
        fontFamily: "'NRK Sans Variable', Arial, sans-serif",
        fontSize: "18px",
        color: colors.textWhite,
        fontStyle: "normal",
        align: "center",
      })
      .setOrigin(0.5)
      .setAlpha(0);
  }

  showFloatingPoints(
    revealed: number,
    seq: boolean[],
    taps: boolean[],
    tapAccuracy: number[],
    tileCenter: (idx: number) => { cx: number; cy: number },
  ): void {
    const seqHit = seq[revealed];
    const tapHit = taps[revealed];
    let pts = 0;
    let ptsColor: number = colors.white;
    if (seqHit && tapHit) {
      const accBonus = Math.max(
        0,
        Math.round(100 * (1 - Math.abs(tapAccuracy[revealed]) / 100)),
      );
      pts = 100 + accBonus;
      ptsColor = colors.accent;
    } else if (seqHit && !tapHit) {
      pts = -50;
      ptsColor = colors.error;
    } else if (!seqHit && tapHit) {
      pts = -100;
      ptsColor = colors.error;
    }
    if (pts !== 0) {
      const { cx, cy } = tileCenter(revealed);
      const hex = "#" + ptsColor.toString(16).padStart(6, "0");
      const txt = this.scene.add
        .text(cx, cy, `${pts > 0 ? "+" : ""}${pts}`, {
          fontFamily: "'NRK Sans Variable', Arial, sans-serif",
          fontSize: "20px",
          color: hex,
          fontStyle: "normal",
        })
        .setOrigin(0.5)
        .setShadow(1, 1, "#00000082", 0, false, true);
      this.scene.tweens.add({
        targets: txt,
        alpha: 0,
        scaleX: 1.5,
        scaleY: 1.5,
        y: cy - 40,
        duration: 2500,
        ease: "Quad.easeOut",
        onComplete: () => txt.destroy(),
      });
    }
  }

  showResults(
    total: number,
    dateStr: string,
    finalScore: {
      correct: number;
      totalHits: number;
      finalWrong: number;
      missed: number;
      wrong: number;
      accuracyTotal: number;
      total: number;
      folkFlest: number;
      perfect: boolean;
    },
  ): string {
    let recordLine = "";
    const key = `rytme_best_${dateStr}`;
    const prev = localStorage.getItem(key);
    if (prev !== null) {
      const prevBest = Number(prev);
      if (total > prevBest) {
        localStorage.setItem(key, String(total));
        recordLine = `Ny rekord: ${total} poeng`;
      } else {
        recordLine = `Din rekord: ${prevBest} poeng`;
      }
    } else {
      localStorage.setItem(key, String(total));
    }

    let result = finalScore.perfect ? "Bra!" : "";
    result += `\nTreff: ${finalScore.correct}`;
    if (finalScore.missed > 0) result += `\nBom: ${finalScore.missed}`;
    if (finalScore.wrong > 0) result += `\nFeil: ${finalScore.wrong}`;
    result += `\nNøyaktighetsbonus: ${finalScore.accuracyTotal} poeng`;
    result += `\nTotalt: ${finalScore.total} poeng`;
    result += `\n\nFolk flest: ${finalScore.folkFlest} poeng`;
    this.resultText.setText(result);

    const recordY = this.resultText.y + this.resultText.height / 2 + 8;
    if (recordLine) {
      const isNew = recordLine.startsWith("Ny");
      const val = isNew ? String(finalScore.total) : String(Number(prev));
      const prefix = isNew ? "Ny rekord: " : "Din beste: ";
      this.recordLabel.setText(prefix).setPosition(0, recordY).setAlpha(1);
      this.recordValue.setText(val).setAlpha(1);
      this.recordSuffix.setText(" poeng").setAlpha(1);
      const totalW =
        this.recordLabel.width +
        this.recordValue.width +
        this.recordSuffix.width;
      const startX = this.btnCX - totalW / 2;
      this.recordLabel.setPosition(startX, recordY);
      this.recordValue.setPosition(startX + this.recordLabel.width, recordY);
      this.recordSuffix.setPosition(
        startX + this.recordLabel.width + this.recordValue.width,
        recordY,
      );
    } else {
      this.recordLabel.setAlpha(0);
      this.recordValue.setAlpha(0);
      this.recordSuffix.setAlpha(0);
    }

    return recordLine;
  }

  hideAll(): void {
    this.resultText.setAlpha(0);
    this.recordLabel.setAlpha(0);
    this.recordValue.setAlpha(0);
    this.recordSuffix.setAlpha(0);
    this.retryBtnGraphics.setAlpha(0);
    this.retryBtnLabel.setAlpha(0);
  }

  renderRetryBtn(visible: boolean): void {
    if (visible) {
      this.resultText.setAlpha(1);
      this.retryBtnGraphics.setAlpha(1);
      this.retryBtnLabel.setAlpha(1);

      const rw = 160,
        rh = 44;
      const rx = this.btnCX - rw / 2;
      const ry = this.btnCY + 80 - rh / 2;

      this.retryBtnGraphics.clear();
      this.retryBtnGraphics.fillStyle(colors.tileShadow, 1);
      this.retryBtnGraphics.fillRoundedRect(rx, ry + 3, rw, rh, 24);
      this.retryBtnGraphics.fillStyle(colors.accent, 1);
      this.retryBtnGraphics.fillRoundedRect(rx, ry, rw, rh, 24);
    } else {
      this.resultRevealIndex = 0;
      this.resultText.setAlpha(0);
      this.retryBtnGraphics.setAlpha(0);
      this.retryBtnLabel.setAlpha(0);
    }
  }

  stopTimer(): void {
    this.resultTimer?.destroy();
    this.resultTimer = undefined;
  }
}
