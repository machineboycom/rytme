import Phaser from "phaser";
import { audio } from "../audio/LowLatencyAudio";
import { LevelGenerator, type LevelData } from "../levels/LevelGenerator";
import { colors } from "../theme";

const BPM = 100;
const TOTAL_BEATS = 16;
const COUNT_IN = 4;

type State = "countdown" | "listening" | "playing" | "finalResult";

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
  private phaseStartTime = 0;
  private lastHighlight = -1;
  private phaseEndTimer?: Phaser.Time.TimerEvent;
  private countdownTarget: "listen" | "play" = "listen";
  private totalMissed = 0;
  private totalWrong = 0;
  private resultRevealIndex = 0;
  private resultTimer?: Phaser.Time.TimerEvent;

  // private statusText!: Phaser.GameObjects.Text;
  private countdownText!: Phaser.GameObjects.Text;
  private tapLabel!: Phaser.GameObjects.Text;
  private infoText!: Phaser.GameObjects.Text;
  private resultText!: Phaser.GameObjects.Text;
  private retryBtnGraphics!: Phaser.GameObjects.Graphics;
  private retryBtnLabel!: Phaser.GameObjects.Text;
  private btnGraphics!: Phaser.GameObjects.Graphics;
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
    this.cameras.main.setBackgroundColor(colors.bg);

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

    this.infoText = this.add
      .text(width / 2, height - 20, "rytme", {
        fontFamily: "Arial, sans-serif",
        fontSize: "13px",
        color: colors.textMuted,
      })
      .setOrigin(0.5);

    this.resultText = this.add
      .text(this.btnCX, this.btnCY, "", {
        fontFamily: "Arial, sans-serif",
        fontSize: "28px",
        color: colors.textWhite,
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.retryBtnGraphics = this.add.graphics().setAlpha(0);

    this.retryBtnLabel = this.add
      .text(this.btnCX, this.btnCY + 55, "PRØV IGJEN", {
        fontFamily: "Arial, sans-serif",
        fontSize: "18px",
        color: colors.textWhite,
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.startNewGame();
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
    this.totalMissed = 0;
    this.totalWrong = 0;
    this.round = 0;
    this.level = LevelGenerator.generate();
    this.playerTaps = new Array(TOTAL_BEATS).fill(false);
    this.enterCountdown("listen");
  }

  private scheduleCountInBeats(
    start: number,
    target: "listen" | "play",
    count: number,
  ): void {
    for (let i = 0; i < count; i++) {
      const t = start + i * this.b;
      audio.scheduleVoice("rim2", t);
    }
  }

  private scheduleBeats(
    start: number,
    count: number,
    offset: number,
    playSnares = true,
  ): void {
    for (let i = 0; i < count; i++) {
      const t = start + i * this.b;
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
      const count = this.seg.count;
      this.scheduleCountInBeats(start, "listen", count);
      const next = start + count * this.b;
      this.phaseEndTimer = this.time.delayedCall(count * this.b * 1000, () => {
        this.countdownText.setAlpha(0);
        this.enterListening(next);
      });
    } else {
      // this.statusText.setText("Gjør deg klar!");
      const start = this.phaseStartTime + this.seg.count * this.b;
      this.phaseStartTime = start;
      const count = this.seg.count;
      this.scheduleCountInBeats(start, "play", count);
      const next = start + count * this.b;
      this.phaseEndTimer = this.time.delayedCall(count * this.b * 1000, () => {
        this.countdownText.setAlpha(0);
        this.enterPlaying(next);
      });
    }
  }

  private enterListening(start: number): void {
    this.state = "listening";
    this.lastHighlight = -1;
    this.phaseStartTime = start;
    this.renderButton();
    this.scheduleBeats(start, this.seg.count, this.seg.start);

    this.phaseEndTimer = this.time.delayedCall(
      this.seg.count * this.b * 1000,
      () => {
        this.enterCountdown("play");
      },
    );
  }

  private enterPlaying(start: number): void {
    this.state = "playing";
    this.lastHighlight = -1;
    this.phaseStartTime = start;
    // this.statusText.setText("Din tur!");
    this.renderButton();
    this.scheduleBeats(start, this.seg.count, this.seg.start, false);

    this.phaseEndTimer = this.time.delayedCall(
      this.seg.count * this.b * 1000,
      () => {
        this.scoreRound();
      },
    );
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
    // this.statusText.setText("");
    this.renderButton();
    this.drawGrid();

    this.resultTimer = this.time.addEvent({
      delay: 100,
      repeat: TOTAL_BEATS - 1,
      callback: () => {
        this.resultRevealIndex++;
        const revealed = this.resultRevealIndex - 1;
        if (this.level.sequence[revealed] && this.playerTaps[revealed]) {
          this.showHitEffect(revealed);
        }
        this.drawGrid();
        if (this.resultRevealIndex >= TOTAL_BEATS) {
          const score = Math.max(
            0,
            TOTAL_BEATS - this.totalMissed - this.totalWrong,
          );
          if (score === 16) {
            this.resultText.setText(`Perfekt! 16/16`);
          } else {
            this.resultText.setText(
              `${score}/16  (${this.totalMissed} bom, ${this.totalWrong} feil)`,
            );
            audio.scheduleBuzz(audio.currentTime + 0.05);
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
    if (this.state === "countdown") {
      const elapsed = audio.currentTime - this.phaseStartTime;
      const beat = Math.floor(elapsed / this.b);
      const count = this.seg.count;
      if (beat >= 0 && beat < count) {
        if (this.countdownTarget === "play") {
          const num = count - beat;
          this.countdownText.setText(String(num)).setAlpha(1);
        } else {
          this.countdownText.setText("LYTT").setAlpha(1);
        }
      }
      if (beat !== this.lastHighlight) {
        this.lastHighlight = beat;
        this.drawGrid();
      }
    }

    if (this.state === "listening" || this.state === "playing") {
      const elapsed = audio.currentTime - this.phaseStartTime;
      const beat = Math.floor(elapsed / this.b);
      if (beat !== this.lastHighlight) {
        this.lastHighlight = beat;
        if (
          this.state === "listening" &&
          beat >= 0 &&
          beat < this.seg.count &&
          this.level.sequence[this.seg.start + beat]
        ) {
          this.showHitEffect(this.seg.start + beat);
        }
        this.drawGrid();
      }
    }
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
              alpha = 1;
            } else if (!seq && tap) {
              color = colors.error;
              alpha = 0.6;
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
          alpha = 0.3;
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
          color = colors.white;
          alpha = 0.7;
        }

        const cx = x + s / 2;
        const cy = y + s / 2;
        const r = s / 2 - 1;

        g.fillStyle(colors.tileShadow, 1);
        g.fillCircle(cx, cy + 2, r + 2);

        g.fillStyle(color, alpha);
        g.fillCircle(cx, cy, r);

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
        const ry = this.btnCY + 55 - rh / 2;
        const rg = this.retryBtnGraphics;
        rg.clear();
        rg.fillStyle(colors.tileShadow, 1);
        rg.fillRoundedRect(rx, ry + 3, rw, rh, 8);
        rg.fillStyle(colors.accent, 1);
        rg.fillRoundedRect(rx, ry, rw, rh, 8);
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

    const btnColor = this.state === "playing" ? colors.accent : colors.error;
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
    } else {
      this.tapLabel.setText("LYTT");
      this.tapLabel.setColor(colors.textDisabled);
    }
  }
}
