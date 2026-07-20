import Phaser from "phaser";
import { audio } from "../audio/LowLatencyAudio";
import { LevelGenerator, type LevelData } from "../levels/LevelGenerator";
import { colors } from "../theme";

const BPM = 120;
const BEAT = 60 / BPM;
const TOTAL_BEATS = 16;
const COUNT_IN = 4;
const LISTEN_DURATION = TOTAL_BEATS * BEAT;
const PLAY_DURATION = TOTAL_BEATS * BEAT;

type Mode = "listen" | "play";
type State = "idle" | "countdown" | "listening" | "playing" | "result";

export class GameScene extends Phaser.Scene {
  private state: State = "idle";
  private countdownTarget: Mode = "listen";
  private level!: LevelData;
  private playerTaps: boolean[] = [];
  private phaseStartTime = 0;
  private lastHighlight = -1;
  private phaseEndTimer?: Phaser.Time.TimerEvent;

  private statusText!: Phaser.GameObjects.Text;
  private countdownText!: Phaser.GameObjects.Text;
  private tapLabel!: Phaser.GameObjects.Text;
  private infoText!: Phaser.GameObjects.Text;
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

    this.statusText = this.add
      .text(width / 2, 12, "", {
        fontFamily: "Arial, sans-serif",
        fontSize: "20px",
        color: colors.textWhite,
      })
      .setOrigin(0.5, 0);

    this.countdownText = this.add
      .text(width / 2, this.gridY + gridH / 2, "", {
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

    this.renderButton();
    this.enterIdle();
  }

  private enterIdle(): void {
    this.state = "idle";
    this.playerTaps = new Array(TOTAL_BEATS).fill(false);
    this.lastHighlight = -1;
    this.phaseStartTime = 0;
    this.countdownText.setAlpha(0);
    this.statusText.setText("Trykk for å starte");
    this.renderButton();
    this.drawGrid();
  }

  private scheduleBeats(
    start: number,
    count: number,
    snareAt: ((i: number) => boolean) | null,
  ): void {
    for (let i = 0; i < count; i++) {
      const t = start + i * BEAT;
      if (snareAt && snareAt(i)) {
        audio.scheduleSnare(t);
      } else {
        audio.scheduleRim(t, i % 4 === 0);
      }
    }
  }

  private enterCountdown(target: Mode): void {
    this.state = "countdown";
    this.countdownTarget = target;
    this.lastHighlight = -1;

    if (target === "listen") {
      this.level = LevelGenerator.generate();
      this.playerTaps = new Array(TOTAL_BEATS).fill(false);
      this.statusText.setText("LYTT!");
      const start = audio.currentTime + 0.05;
      this.phaseStartTime = start;
      this.scheduleBeats(start, COUNT_IN, null);
      const next = start + COUNT_IN * BEAT;
      this.phaseEndTimer = this.time.delayedCall(COUNT_IN * BEAT * 1000, () => {
        this.countdownText.setAlpha(0);
        this.enterListening(next);
      });
    } else {
      this.playerTaps = new Array(TOTAL_BEATS).fill(false);
      this.statusText.setText("Din tur!");
      const start = this.phaseStartTime + LISTEN_DURATION;
      this.phaseStartTime = start;
      this.scheduleBeats(start, COUNT_IN, null);
      const next = start + COUNT_IN * BEAT;
      this.phaseEndTimer = this.time.delayedCall(COUNT_IN * BEAT * 1000, () => {
        this.countdownText.setAlpha(0);
        this.enterPlaying(next);
      });
    }

    this.renderButton();
    this.drawGrid();
  }

  private enterListening(start: number): void {
    this.state = "listening";
    this.lastHighlight = -1;

    this.phaseStartTime = start;
    this.renderButton();
    this.scheduleBeats(start, TOTAL_BEATS, (i) => this.level.sequence[i]);

    this.phaseEndTimer = this.time.delayedCall(LISTEN_DURATION * 1000, () => {
      this.enterCountdown("play");
    });
  }

  private enterPlaying(start: number): void {
    this.state = "playing";
    this.lastHighlight = -1;

    this.phaseStartTime = start;
    this.renderButton();
    this.scheduleBeats(start, TOTAL_BEATS, null);

    this.phaseEndTimer = this.time.delayedCall(PLAY_DURATION * 1000, () => {
      this.enterResult();
    });
  }

  private enterResult(): void {
    this.state = "result";

    const seq = this.level.sequence;
    const taps = this.playerTaps;
    let missed = 0;
    let wrong = 0;

    for (let i = 0; i < TOTAL_BEATS; i++) {
      if (seq[i] && !taps[i]) missed++;
      if (!seq[i] && taps[i]) wrong++;
    }

    const score = Math.max(0, 16 - missed - wrong);

    if (score === 16) {
      this.statusText.setText(`Perfekt! 16/16`);
    } else if (score >= 10) {
      this.statusText.setText(`${score}/16  (${missed} bom, ${wrong} feil)`);
    } else {
      this.statusText.setText(`${score}/16  (${missed} bom, ${wrong} feil)`);
      audio.scheduleBuzz(audio.currentTime + 0.05);
    }

    this.drawGrid();
    this.renderButton();
  }

  private onTapDown(): void {
    if (this.state === "idle") {
      this.enterCountdown("listen");
      return;
    }

    if (this.state === "result") {
      this.enterIdle();
      return;
    }

    if (this.state === "playing") {
      const elapsed = audio.currentTime - this.phaseStartTime;
      const rawBeat = elapsed / BEAT;
      const beat = Math.round(rawBeat);

      if (beat >= 0 && beat < TOTAL_BEATS && !this.playerTaps[beat]) {
        const diff = Math.abs(rawBeat - beat);
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
    if (this.state === "playing" || this.state === "idle") {
      this.renderButton();
    }
  }

  update(): void {
    if (this.state === "countdown") {
      const elapsed = audio.currentTime - this.phaseStartTime;
      const beat = Math.floor(elapsed / BEAT);
      if (beat >= 0 && beat < COUNT_IN) {
        const num = COUNT_IN - beat;
        this.countdownText.setText(String(num)).setAlpha(1);
      }
      if (beat !== this.lastHighlight) {
        this.lastHighlight = beat;
        this.drawGrid();
      }
    }

    if (this.state === "listening" || this.state === "playing") {
      const elapsed = audio.currentTime - this.phaseStartTime;
      const beat = Math.floor(elapsed / BEAT);
      if (beat !== this.lastHighlight) {
        this.lastHighlight = beat;
        if (this.state === "listening" && beat >= 0 && beat < TOTAL_BEATS && this.level.sequence[beat]) {
          this.showHitEffect(beat);
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
        const x = this.gridX + beat * (s + gap);
        const y = this.gridY + bar * (s + gap);

        let color: number = colors.tile;
        let alpha = 0.5;

        if (this.state === "listening" && idx === this.lastHighlight) {
          if (this.level.sequence[idx]) {
            color = colors.accent;
            alpha = 1;
          } else {
            color = colors.error;
            alpha = 0.5;
          }
        }

        if (this.state === "playing" && this.playerTaps[idx]) {
          color = colors.accent;
          alpha = 1;
        }

        if (this.state === "result") {
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
          idx === this.lastHighlight
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
    const btnColor =
      this.state === "idle" || this.state === "playing"
        ? colors.accent
        : colors.error;
    g.fillStyle(colors.tileShadow, 1);
    g.fillCircle(this.btnCX, this.btnCY + 16, this.btnW / 2);
    g.fillStyle(btnColor, 1);
    g.fillCircle(this.btnCX, this.btnCY, this.btnW / 2);

    if (this.state === "idle") {
      this.tapLabel.setText("START");
      this.tapLabel.setColor(colors.textWhite);
    } else if (this.state === "playing") {
      this.tapLabel.setText("TRYKK");
      this.tapLabel.setColor(colors.textWhite);
    } else if (this.state === "result") {
      this.tapLabel.setText("IGJEN");
      this.tapLabel.setColor(colors.textWhite);
    } else {
      this.tapLabel.setText("...");
      this.tapLabel.setColor(colors.textDisabled);
    }
  }
}
