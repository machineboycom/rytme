import Phaser from "phaser";
import { audio } from "../audio/LowLatencyAudio";
import { LevelGenerator, type LevelData } from "../levels/LevelGenerator";
import { colors } from "../theme";
import { GridRenderer, type State } from "../grid/GridRenderer";
import { ScoreKeeper, type FinalScore } from "../scoring/ScoreKeeper";
import { ResultScreen } from "../ui/ResultScreen";

const BPM = 100;
const TOTAL_BEATS = 16;
const COUNT_IN = 4;

const SEGMENTS = [
  { start: 0, count: 4 },
  { start: 4, count: 4 },
  { start: 8, count: 8 },
];

export class GameScene extends Phaser.Scene {
  private state: State = "countdown";
  private round = 0;
  private revealIndex = 0;
  private level!: LevelData;
  private playerTaps: boolean[] = [];
  private tapAccuracy: number[] = [];
  private phaseStartTime = 0;
  private lastHighlight = -1;
  private countdownTarget: "listen" | "play" = "listen";
  private pendingFlashes: number[] = [];

  private countdownText!: Phaser.GameObjects.Text;
  private tapLabel!: Phaser.GameObjects.Text;
  private btnGraphics!: Phaser.GameObjects.Graphics;
  private btnFlashGraphics!: Phaser.GameObjects.Graphics;

  private btnW = 0;
  private btnH = 0;
  private btnCX = 0;
  private btnCY = 0;

  private grid!: GridRenderer;
  private score!: ScoreKeeper;
  private result!: ResultScreen;

  constructor() {
    super({ key: "GameScene" });
  }

  create(): void {
    audio.setScene(this);
    const { width, height } = this.scale;

    this.btnW = Math.min(200, width * 0.5);
    this.btnH = Math.min(200, this.btnW);
    this.btnCX = width / 2;

    this.grid = new GridRenderer(this, width);
    this.score = new ScoreKeeper();
    this.result = new ResultScreen(
      this,
      this.btnCX,
      this.grid.gridY + this.grid.gridH + 60 + this.btnH / 2,
    );

    this.btnCY = this.grid.gridY + this.grid.gridH + 60 + this.btnH / 2;

    this.btnGraphics = this.add.graphics();
    this.btnFlashGraphics = this.add.graphics();

    this.input.on("pointerdown", () => this.onTapDown());
    this.input.on("pointerup", () => this.onTapUp());
    this.input.keyboard!.on("keydown-SPACE", () => this.onTapDown());

    this.tapLabel = this.add
      .text(this.btnCX, this.btnCY, "TRYKK", {
        fontFamily: "'NRK Sans Variable', Arial, sans-serif",
        fontSize: "40px",
        color: colors.textWhite,
        fontStyle: "normal",
      })
      .setOrigin(0.5);

    this.countdownText = this.add
      .text(width / 2, this.grid.gridY + this.grid.gridH / 1.5, "", {
        fontFamily: "'NRK Sans Variable', Arial, sans-serif",
        fontSize: "72px",
        color: colors.textWhite,
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
    this.result.stopTimer();
    this.result.hideAll();
    this.score.totalMissed = 0;
    this.score.totalWrong = 0;
    this.round = 0;
    this.level = LevelGenerator.generate();
    this.playerTaps = new Array(TOTAL_BEATS).fill(false);
    this.tapAccuracy = new Array(TOTAL_BEATS).fill(-1);
    this.enterCountdown("listen");
  }

  private startIntro(): void {
    this.state = "intro";
    this.revealIndex = 0;
    this.renderButton();
    this.grid.drawGrid(this.drawParams());
    this.time.addEvent({
      delay: 100,
      repeat: 3,
      callback: () => {
        this.revealIndex++;
        this.grid.drawGrid(this.drawParams());
        if (this.revealIndex >= 4) {
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
      audio.scheduleVoice("rim", t);
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
        audio.scheduleBuzz(t);
      }
    }
  }

  private enterCountdown(target: "listen" | "play"): void {
    this.state = "countdown";
    this.countdownTarget = target;
    this.lastHighlight = -1;
    this.grid.clearSweep();
    this.renderButton();
    this.grid.drawGrid(this.drawParams());

    if (target === "listen") {
      const start = audio.currentTime + 0.05;
      this.phaseStartTime = start;
      this.scheduleCountInBeats(start, "listen", COUNT_IN);
    } else {
      const start = this.phaseStartTime + this.seg.count * this.b;
      this.phaseStartTime = start;
      this.scheduleCountInBeats(start, "play", COUNT_IN);
    }
  }

  private enterListening(start: number): void {
    this.state = "listening";
    this.lastHighlight = -1;
    this.phaseStartTime = start;
    this.grid.clearSweep();
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

  private drawParams() {
    return {
      state: this.state,
      segStart: this.seg.start,
      segEnd: this.segEnd,
      visibleEnd: this.visibleEnd,
      sequence: this.level?.sequence ?? [],
      playerTaps: this.playerTaps,
      tapAccuracy: this.tapAccuracy,
      lastHighlight: this.lastHighlight,
      resultRevealIndex: this.revealIndex,
    };
  }

  private scoreRound(): void {
    const seq = this.level.sequence;
    const taps = this.playerTaps;
    const { start, count } = this.seg;

    this.score.scoreRound(seq, taps, start, count);

    if (this.round < SEGMENTS.length - 1) {
      this.round++;
      this.enterCountdown("listen");
      return;
    }

    this.state = "finalResult";
    this.revealIndex = 0;
    this.grid.clearSweep();
    this.renderButton();
    this.grid.drawGrid(this.drawParams());

    this.time.addEvent({
      delay: 150,
      repeat: TOTAL_BEATS - 1,
      callback: () => {
        this.revealIndex++;
        const revealed = this.revealIndex - 1;
        if (seq[revealed] && taps[revealed]) {
          this.grid.showHitEffect(revealed);
        }
        this.grid.drawGrid(this.drawParams());

        this.result.showFloatingPoints(
          revealed,
          seq,
          taps,
          this.tapAccuracy,
          (idx) => this.grid.tileCenter(idx),
        );

        if (this.revealIndex >= TOTAL_BEATS) {
          const final = this.score.finalScore(seq, taps, this.tapAccuracy);
          this.result.showResults(final.total, this.level.dateStr, {
            correct: final.correct,
            totalHits: final.totalHits,
            finalWrong: final.wrong,
            missed: final.missed,
            wrong: final.wrong,
            accuracyTotal: final.accuracyTotal,
            total: final.total,
            folkFlest: final.folkFlest,
            perfect: final.perfect,
          });
          this.grid.drawGrid(this.drawParams());
          this.renderButton();
        }
      },
    });
  }

  private onTapDown(): void {
    if (this.state === "finalResult") {
      if (this.revealIndex >= TOTAL_BEATS) {
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
        this.playerTaps[beat] = true;
        this.tapAccuracy[beat] =
          (rawBeat - Math.round(rawBeat)) * this.b * 1000;
        console.log(this.tapAccuracy[beat]);
        audio.playSnareNow();
        if (this.level.sequence[beat]) {
          this.grid.showHitEffect(beat);
        }
      }

      this.renderButton();
      this.grid.drawGrid(this.drawParams());
    }
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
        this.grid.drawGrid(this.drawParams());
      }

      {
        const b = elapsed / this.b;
        this.grid.drawSweep(b, this.seg.start);
        if (this.countdownTarget === "play") {
          if (elapsed >= (count - 1) * this.b) {
            this.countdownText.setAlpha(0);
            this.enterPlaying(this.phaseStartTime + count * this.b);
          }
        } else if (elapsed >= count * this.b) {
          this.countdownText.setAlpha(0);
          this.enterListening(this.phaseStartTime + count * this.b);
        }
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
          this.grid.showHitEffect(this.seg.start + beat);
        }
        this.grid.drawGrid(this.drawParams());
      }
      this.grid.drawSweep(elapsed / this.b + COUNT_IN, this.seg.start);
      if (elapsed >= this.seg.count * this.b) {
        this.enterCountdown("play");
      }
    } else if (this.state === "playing") {
      const elapsed = now - this.phaseStartTime;
      const beat = Math.floor(elapsed / this.b);
      if (beat !== this.lastHighlight) {
        this.lastHighlight = beat;
        this.grid.drawGrid(this.drawParams());
      }
      this.grid.drawSweep(elapsed / this.b + COUNT_IN, this.seg.start);
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

  private renderButton(): void {
    const g = this.btnGraphics;
    g.clear();

    if (this.state === "finalResult") {
      this.tapLabel.setText("");
      if (this.revealIndex >= TOTAL_BEATS) {
        this.result.renderRetryBtn(true);
      } else {
        this.result.renderRetryBtn(false);
      }
      return;
    }

    this.result.renderRetryBtn(false);

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
