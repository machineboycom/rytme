import Phaser from "phaser";
import { audio } from "../audio/LowLatencyAudio";
import { LevelGenerator, type LevelData } from "../levels/LevelGenerator";
import { colors } from "../theme";

const BPM = 100;
const TOTAL_BEATS = 16;
const COUNT_IN = 4;

type State = "intro" | "countdown" | "listening" | "playing" | "finalResult";

const SEGMENTS = [
  { start: 0, count: 4 },
  { start: 4, count: 4 },
  { start: 8, count: 8 },
];

export class GameScene extends Phaser.Scene {
  private state: State = "countdown";
  private round = 0;
  private level!: LevelData;
  private playerTaps: boolean[] = [];
  private tapAccuracy: number[] = [];
  private phaseStartTime = 0;
  private lastHighlight = -1;
  private countdownTarget: "listen" | "play" = "listen";
  private pendingFlashes: number[] = [];
  private totalMissed = 0;
  private totalWrong = 0;
  private resultRevealIndex = 0;
  private resultTimer?: Phaser.Time.TimerEvent;

  // private statusText!: Phaser.GameObjects.Text;
  private countdownText!: Phaser.GameObjects.Text;
  private tapLabel!: Phaser.GameObjects.Text;
  private resultText!: Phaser.GameObjects.Text;
  private recordLabel!: Phaser.GameObjects.Text;
  private recordValue!: Phaser.GameObjects.Text;
  private recordSuffix!: Phaser.GameObjects.Text;
  private retryBtnGraphics!: Phaser.GameObjects.Graphics;
  private retryBtnLabel!: Phaser.GameObjects.Text;
  private btnGraphics!: Phaser.GameObjects.Graphics;
  private btnFlashGraphics!: Phaser.GameObjects.Graphics;
  private gridGraphics!: Phaser.GameObjects.Graphics;

  private cellSize = 0;
  private gridX = 0;
  private gridY = 0;
  private btnW = 0;
  private btnH = 0;
  private btnCX = 0;
  private btnCY = 0;

  constructor() {
    super({ key: "GameScene" });
  }

  create(): void {
    audio.setScene(this);
    const { width, height } = this.scale;

    this.cellSize = Math.floor(Math.min(width / 5.5, 56));
    const gridW = this.cellSize * 4 + 8 * 3;
    const gridH = this.cellSize * 4 + 8 * 3;
    this.gridX = (width - gridW) / 2;
    this.gridY = 48;

    this.gridGraphics = this.add.graphics();

    this.btnW = Math.min(200, width * 0.5);
    this.btnH = Math.min(200, this.btnW);
    this.btnCX = width / 2;
    this.btnCY = this.gridY + gridH + 60 + this.btnH / 2;

    this.btnGraphics = this.add.graphics();
    this.btnFlashGraphics = this.add.graphics();

    this.input.on("pointerdown", () => this.onTapDown());
    this.input.on("pointerup", () => this.onTapUp());
    this.input.keyboard!.on("keydown-SPACE", () => this.onTapDown());

    this.tapLabel = this.add
      .text(this.btnCX, this.btnCY, "TRYKK", {
        fontFamily: "Arial, sans-serif",
        fontSize: "40px",
        color: colors.textWhite,
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    // this.statusText = this.add
    //   .text(width / 2, 12, "", {
    //     fontFamily: "Arial, sans-serif",
    //     fontSize: "20px",
    //     color: colors.textWhite,
    //   })
    //   .setOrigin(0.5, 0);

    this.countdownText = this.add
      .text(width / 2, this.gridY + gridH / 1.5, "", {
        fontFamily: "Arial, sans-serif",
        fontSize: "72px",
        color: colors.textWhite,
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.resultText = this.add
      .text(this.btnCX, this.btnCY - 50, "", {
        fontFamily: "Arial, sans-serif",
        fontSize: "18px",
        color: colors.textWhite,
        fontStyle: "bold",
        align: "center",
      })
      .setOrigin(0.5)
      .setAlpha(0);

    const recordStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: "Arial, sans-serif",
      fontSize: "18px",
      fontStyle: "normal",
    };
    this.recordLabel = this.add
      .text(0, 0, "", { ...recordStyle, color: colors.textWhite })
      .setOrigin(0, 0.5)
      .setAlpha(0);
    this.recordValue = this.add
      .text(0, 0, "", { ...recordStyle, color: "#ffcc00" })
      .setOrigin(0, 0.5)
      .setAlpha(0);
    this.recordSuffix = this.add
      .text(0, 0, "", { ...recordStyle, color: colors.textWhite })
      .setOrigin(0, 0.5)
      .setAlpha(0);

    this.retryBtnGraphics = this.add.graphics().setAlpha(0);

    this.retryBtnLabel = this.add
      .text(this.btnCX, this.btnCY + 80, "PRØV IGJEN", {
        fontFamily: "Arial, sans-serif",
        fontSize: "18px",
        color: colors.textWhite,
        fontStyle: "bold",
        align: "center",
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.startIntro();
  }

  private get seg(): { start: number; count: number } {
    return SEGMENTS[this.round];
  }

  private get segEnd(): number {
    return this.seg.start + this.seg.count;
  }

  private get visibleEnd(): number {
    return this.segEnd;
  }

  private get b(): number {
    return 60 / (this.round >= 1 ? BPM * 2 : BPM);
  }

  private startNewGame(): void {
    this.resultTimer?.destroy();
    this.recordLabel.setAlpha(0);
    this.recordValue.setAlpha(0);
    this.recordSuffix.setAlpha(0);
    this.totalMissed = 0;
    this.totalWrong = 0;
    this.round = 0;
    this.level = LevelGenerator.generate();
    this.playerTaps = new Array(TOTAL_BEATS).fill(false);
    this.tapAccuracy = new Array(TOTAL_BEATS).fill(-1);
    this.enterCountdown("listen");
  }

  private startIntro(): void {
    this.state = "intro";
    this.resultRevealIndex = 0;
    this.renderButton();
    this.drawGrid();
    this.time.addEvent({
      delay: 100,
      repeat: 3,
      callback: () => {
        this.resultRevealIndex++;
        this.drawGrid();
        if (this.resultRevealIndex >= 4) {
          this.startNewGame();
        }
      },
    });
  }

  private scheduleCountInBeats(
    start: number,
    target: "listen" | "play",
    count: number,
  ): void {
    for (let i = 0; i < count; i++) {
      const t = start + i * this.b;
      this.scheduleButtonFlash(t);
      audio.scheduleVoice("rim2", t);
    }
  }

  private scheduleButtonFlash(when: number): void {
    this.pendingFlashes.push(when);
  }

  private triggerFlash(): void {
    const g = this.btnFlashGraphics;
    g.clear();
    g.setAlpha(1);
    g.lineStyle(2, colors.white, 0.8);
    g.strokeCircle(this.btnCX, this.btnCY, this.btnW / 2);
    this.tweens.add({
      targets: g,
      alpha: 0,
      duration: this.b * 500,
      ease: "Quad.easeOut",
      onComplete: () => g.clear(),
    });
  }

  private scheduleBeats(
    start: number,
    count: number,
    offset: number,
    playSnares = true,
  ): void {
    for (let i = 0; i < count; i++) {
      const t = start + i * this.b;
      this.scheduleButtonFlash(t);
      const seqIdx = offset + i;
      if (playSnares && this.level.sequence[seqIdx]) {
        audio.scheduleSnare(t);
      } else {
        audio.scheduleRim(t, i % 4 === 0);
      }
    }
  }

  private enterCountdown(target: "listen" | "play"): void {
    this.state = "countdown";
    this.countdownTarget = target;
    this.lastHighlight = -1;
    this.renderButton();
    this.drawGrid();

    if (target === "listen") {
      // this.statusText.setText("LYTT!");
      const start = audio.currentTime + 0.05;
      this.phaseStartTime = start;
      const count = COUNT_IN;
      this.scheduleCountInBeats(start, "listen", count);
    } else {
      // this.statusText.setText("Gjør deg klar!");
      const start = this.phaseStartTime + this.seg.count * this.b;
      this.phaseStartTime = start;
      this.scheduleCountInBeats(start, "play", COUNT_IN);
    }
  }

  private enterListening(start: number): void {
    this.state = "listening";
    this.lastHighlight = -1;
    this.phaseStartTime = start;
    this.renderButton();
    this.scheduleBeats(start, this.seg.count, this.seg.start);
  }

  private enterPlaying(start: number): void {
    this.state = "playing";
    this.lastHighlight = -1;
    this.phaseStartTime = start;
    this.renderButton();
    this.scheduleBeats(start, this.seg.count, this.seg.start, false);
  }

  private scoreRound(): void {
    const seq = this.level.sequence;
    const taps = this.playerTaps;
    const { start, count } = this.seg;
    let missed = 0;
    let wrong = 0;

    for (let i = start; i < start + count; i++) {
      if (seq[i] && !taps[i]) missed++;
      if (!seq[i] && taps[i]) wrong++;
    }

    this.totalMissed += missed;
    this.totalWrong += wrong;

    if (this.round < SEGMENTS.length - 1) {
      this.round++;
      this.enterCountdown("listen");
      return;
    }

    this.state = "finalResult";
    this.resultRevealIndex = 0;
    this.renderButton();
    this.drawGrid();

    this.resultTimer = this.time.addEvent({
      delay: 150,
      repeat: TOTAL_BEATS - 1,
      callback: () => {
        this.resultRevealIndex++;
        const revealed = this.resultRevealIndex - 1;
        if (this.level.sequence[revealed] && this.playerTaps[revealed]) {
          this.showHitEffect(revealed);
        }
        this.drawGrid();

        const seqHit = this.level.sequence[revealed];
        const tapHit = this.playerTaps[revealed];
        let pts = 0;
        let ptsColor: number = colors.white;
        if (seqHit && tapHit) {
          const accBonus = Math.max(
            0,
            Math.round(100 * (1 - Math.abs(this.tapAccuracy[revealed]) / 100)),
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
          const { cx, cy } = this.tileCenter(revealed);
          const hex = "#" + ptsColor.toString(16).padStart(6, "0");
          const txt = this.add
            .text(cx, cy, `${pts > 0 ? "+" : ""}${pts}`, {
              fontFamily: "Arial, sans-serif",
              fontSize: "20px",
              color: hex,
              fontStyle: "normal",
            })
            .setOrigin(0.5)
            .setShadow(1, 1, "#00000082", 0, false, true);
          this.tweens.add({
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

        if (this.resultRevealIndex >= TOTAL_BEATS) {
          let correct = 0;
          let finalMissed = 0;
          let finalWrong = 0;
          let totalHits = 0;
          for (let i = 0; i < TOTAL_BEATS; i++) {
            if (seq[i]) totalHits++;
            if (seq[i] && taps[i]) correct++;
            if (seq[i] && !taps[i]) finalMissed++;
            if (!seq[i] && taps[i]) finalWrong++;
          }
          let accuracyTotal = 0;
          for (let i = 0; i < TOTAL_BEATS; i++) {
            if (seq[i] && taps[i]) {
              accuracyTotal += Math.max(
                0,
                Math.round(100 * (1 - Math.abs(this.tapAccuracy[i]) / 100)),
              );
            }
          }
          const hitScore = Math.max(
            0,
            correct * 100 - finalWrong * 100 - finalMissed * 50,
          );
          const total = hitScore + accuracyTotal;
          const folkFlest = Math.max(0, totalHits - 1) * 177;

          let recordLine = "";
          const key = `rytme_best_${this.level.dateStr}`;
          const prev = localStorage.getItem(key);
          if (prev !== null) {
            const prevBest = Number(prev);
            if (total > prevBest) {
              localStorage.setItem(key, String(total));
              recordLine = `\nNy rekord: ${total} poeng`;
            } else {
              recordLine = `\nDin rekord: ${prevBest} poeng`;
            }
          } else {
            localStorage.setItem(key, String(total));
          }

          let result = correct === totalHits ? "Perfekt!" : "";
          result += `\nTreff: ${correct}`;
          if (finalMissed > 0) result += `\nBom: ${finalMissed}`;
          if (finalWrong > 0) result += `\nFeil: ${finalWrong}`;
          result += `\nNøyaktighetsbonus: ${accuracyTotal} poeng`;
          result += `\nTotalt: ${total} poeng`;
          result += `\n\nFolk flest: ${folkFlest} poeng`;
          this.resultText.setText(result);

          const recordY = this.btnCY + 25;
          if (recordLine) {
            const prefix = recordLine.includes("Ny") ? "Ny rekord: " : "Din rekord: ";
            const val = String(
              recordLine.includes("Ny") ? total : Number(prev),
            );
            this.recordLabel.setText(prefix).setPosition(0, recordY).setAlpha(1);
            this.recordValue.setText(val).setAlpha(1);
            this.recordSuffix.setText(" poeng").setAlpha(1);
            const totalW =
              this.recordLabel.width +
              this.recordValue.width +
              this.recordSuffix.width;
            const startX = this.btnCX - totalW / 2;
            this.recordLabel.setPosition(startX, recordY);
            this.recordValue.setPosition(
              startX + this.recordLabel.width,
              recordY,
            );
            this.recordSuffix.setPosition(
              startX + this.recordLabel.width + this.recordValue.width,
              recordY,
            );
          } else {
            this.recordLabel.setAlpha(0);
            this.recordValue.setAlpha(0);
            this.recordSuffix.setAlpha(0);
          }
          this.renderButton();
        }
      },
    });
  }

  private onTapDown(): void {
    if (this.state === "finalResult") {
      if (this.resultRevealIndex >= TOTAL_BEATS) {
        this.startNewGame();
      }
      return;
    }

    if (this.state === "playing") {
      const elapsed = audio.currentTime - this.phaseStartTime;
      const rawBeat = elapsed / this.b;
      const beat = Math.round(rawBeat) + this.seg.start;

      if (
        beat >= this.seg.start &&
        beat < this.segEnd &&
        !this.playerTaps[beat]
      ) {
        const diff = Math.abs(rawBeat - Math.round(rawBeat));
        if (diff < 0.35) {
          this.playerTaps[beat] = true;
          this.tapAccuracy[beat] =
            (rawBeat - Math.round(rawBeat)) * this.b * 1000;
          console.log(this.tapAccuracy[beat]);
          audio.playSnareNow();
          if (this.level.sequence[beat]) {
            this.showHitEffect(beat);
          }
        }
      }

      this.renderButton();
      this.drawGrid();
    }
  }

  private tileCenter(idx: number): { cx: number; cy: number } {
    const bar = Math.floor(idx / 4);
    const beat = idx % 4;
    const s = this.cellSize;
    const gap = 8;
    return {
      cx: this.gridX + beat * (s + gap) + s / 2,
      cy: this.gridY + bar * (s + gap) + s / 2,
    };
  }

  private showHitEffect(idx: number): void {
    const { cx, cy } = this.tileCenter(idx);
    const glow = this.add.graphics();
    glow.setPosition(cx, cy);
    glow.fillStyle(colors.accent, 0.8);
    glow.fillCircle(0, 0, this.cellSize / 2 + 4);
    this.tweens.add({
      targets: glow,
      alpha: 0,
      scaleX: 2,
      scaleY: 2,
      duration: 500,
      ease: "Quad.easeOut",
      onComplete: () => glow.destroy(),
    });
  }

  private onTapUp(): void {
    if (this.state === "playing") {
      this.renderButton();
    }
  }

  update(): void {
    const now = audio.currentTime;

    if (this.state === "countdown") {
      const elapsed = now - this.phaseStartTime;
      const beat = Math.floor(elapsed / this.b);
      const count = COUNT_IN;
      if (beat >= 0 && beat < count) {
        if (this.countdownTarget === "play") {
          this.countdownText.setText(String(count - beat)).setAlpha(1);
        } else {
          this.countdownText.setText("LYTT").setAlpha(1);
        }
      }
      if (beat !== this.lastHighlight) {
        this.lastHighlight = beat;
        this.drawGrid();
      }

      if (this.countdownTarget === "play") {
        if (elapsed >= (count - 1) * this.b) {
          this.countdownText.setAlpha(0);
          this.enterPlaying(this.phaseStartTime + count * this.b);
        }
      } else if (elapsed >= count * this.b) {
        this.countdownText.setAlpha(0);
        this.enterListening(this.phaseStartTime + count * this.b);
      }
    } else if (this.state === "listening") {
      const elapsed = now - this.phaseStartTime;
      const beat = Math.floor(elapsed / this.b);
      if (beat !== this.lastHighlight) {
        this.lastHighlight = beat;
        if (
          beat >= 0 &&
          beat < this.seg.count &&
          this.level.sequence[this.seg.start + beat]
        ) {
          this.showHitEffect(this.seg.start + beat);
        }
        this.drawGrid();
      }
      if (elapsed >= this.seg.count * this.b) {
        this.enterCountdown("play");
      }
    } else if (this.state === "playing") {
      const elapsed = now - this.phaseStartTime;
      const beat = Math.floor(elapsed / this.b);
      if (beat !== this.lastHighlight) {
        this.lastHighlight = beat;
        this.drawGrid();
      }
      if (elapsed >= this.seg.count * this.b) {
        this.scoreRound();
      }
    }

    this.processFlashes(now);
  }

  private processFlashes(now: number): void {
    if (this.pendingFlashes.length === 0) return;
    let flashed = false;
    for (const when of this.pendingFlashes) {
      if (now >= when) {
        if (!flashed) {
          this.triggerFlash();
          flashed = true;
        }
      }
    }
    this.pendingFlashes = this.pendingFlashes.filter((w) => now < w);
  }

  private drawGrid(): void {
    const g = this.gridGraphics;
    g.clear();
    const s = this.cellSize;
    const gap = 8;

    for (let bar = 0; bar < 4; bar++) {
      for (let beat = 0; beat < 4; beat++) {
        const idx = bar * 4 + beat;

        if (idx >= this.visibleEnd) {
          continue;
        }

        if (this.state === "intro" && idx >= this.resultRevealIndex) {
          continue;
        }

        const x = this.gridX + beat * (s + gap);
        const y = this.gridY + bar * (s + gap);

        const inPreviousSeg = idx < this.seg.start;
        const inCurrentSeg = idx >= this.seg.start && idx < this.segEnd;

        let color: number;
        let alpha: number;

        if (this.state === "finalResult") {
          if (idx < this.resultRevealIndex) {
            const seq = this.level.sequence[idx];
            const tap = this.playerTaps[idx];
            if (seq && tap) {
              color = colors.accent;
              alpha = 1;
            } else if (seq && !tap) {
              color = colors.error;
              alpha = 0.6;
            } else if (!seq && tap) {
              color = colors.error;
              alpha = 1;
            } else {
              color = colors.tile;
              alpha = 0.4;
            }
          } else {
            color = colors.tile;
            alpha = 0.3;
          }
        } else if (inPreviousSeg) {
          color = colors.tile;
          alpha = 0.5;
        } else if (
          this.state === "listening" &&
          inCurrentSeg &&
          idx === this.seg.start + this.lastHighlight
        ) {
          if (this.level.sequence[idx]) {
            color = colors.accent;
            alpha = 1;
          } else {
            color = colors.error;
            alpha = 0.5;
          }
        } else {
          color = colors.tile;
          alpha = 0.5;
        }

        if (this.state !== "finalResult" && this.playerTaps[idx]) {
          color = colors.accent;
          alpha = 1;
        }

        const cx = x + s / 2;
        const cy = y + s / 2;
        const r = s / 2 - 1;

        g.fillStyle(colors.tileShadow, 1);
        g.fillCircle(cx, cy + 2, r + 2);

        g.fillStyle(color, alpha);
        g.fillCircle(cx, cy, r);

        if (
          this.state === "finalResult" &&
          this.playerTaps[idx] &&
          this.level.sequence[idx]
        ) {
          const offsetMs = this.tapAccuracy[idx];
          const absMs = Math.abs(offsetMs);
          const fill = Math.max(0.1, 1 - 0.9 * (absMs / 100));
          const shift = Phaser.Math.Clamp(offsetMs / 100, -1, 1) * r * 0.6;
          g.fillStyle(colors.white, 0.8);
          g.fillCircle(cx + shift, cy, r * fill);
        }

        if (
          (this.state === "listening" || this.state === "playing") &&
          inCurrentSeg &&
          idx === this.seg.start + this.lastHighlight
        ) {
          g.lineStyle(2, colors.white, 0.7);
          g.strokeCircle(cx, cy, r);
        }
      }
    }
  }

  private renderButton(): void {
    const g = this.btnGraphics;
    g.clear();

    if (this.state === "finalResult") {
      this.tapLabel.setText("");
      if (this.resultRevealIndex >= TOTAL_BEATS) {
        this.resultText.setAlpha(1);
        this.retryBtnGraphics.setAlpha(1);
        this.retryBtnLabel.setAlpha(1);

        const rw = 160,
          rh = 44;
        const rx = this.btnCX - rw / 2;
        const ry = this.btnCY + 80 - rh / 2;
        const rg = this.retryBtnGraphics;
        rg.clear();
        rg.fillStyle(colors.tileShadow, 1);
        rg.fillRoundedRect(rx, ry + 3, rw, rh, 24);
        rg.fillStyle(colors.accent, 1);
        rg.fillRoundedRect(rx, ry, rw, rh, 24);
      } else {
        this.resultText.setAlpha(0);
        this.retryBtnGraphics.setAlpha(0);
        this.retryBtnLabel.setAlpha(0);
      }
      return;
    }

    this.resultText.setAlpha(0);
    this.retryBtnGraphics.setAlpha(0);
    this.retryBtnLabel.setAlpha(0);

    const btnColor = this.state === "playing" ? colors.accent : colors.disabled;
    g.fillStyle(colors.tileShadow, 1);
    g.fillCircle(this.btnCX, this.btnCY + 16, this.btnW / 2);
    g.fillStyle(btnColor, 1);
    g.fillCircle(this.btnCX, this.btnCY, this.btnW / 2);

    if (this.state === "playing") {
      this.tapLabel.setText("TRYKK");
      this.tapLabel.setColor(colors.textWhite);
    } else if (this.state === "countdown" && this.countdownTarget === "play") {
      this.tapLabel.setText("KLAR?");
      this.tapLabel.setColor(colors.textWhite);
    } else if (this.state === "countdown") {
      this.tapLabel.setText("LYTT");
      this.tapLabel.setColor(colors.textWhite);
    } else {
      this.tapLabel.setText("");
      this.tapLabel.setColor(colors.textDisabled);
    }
  }
}
