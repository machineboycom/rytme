import Phaser from "phaser";
import { colors } from "../theme";

export type State = "intro" | "countdown" | "listening" | "playing" | "finalResult";

export interface DrawGridParams {
  state: State;
  segStart: number;
  segEnd: number;
  visibleEnd: number;
  sequence: boolean[];
  playerTaps: boolean[];
  tapAccuracy: number[];
  lastHighlight: number;
  resultRevealIndex: number;
}

/** Tegner rutenettet med sirkler og sveipe-markøren. */
export class GridRenderer {
  readonly cellSize: number;
  readonly gridX: number;
  readonly gridY: number;
  readonly gridW: number;
  readonly gridH: number;
  private sweepGraphics: Phaser.GameObjects.Graphics;
  private gridGraphics: Phaser.GameObjects.Graphics;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, width: number) {
    this.scene = scene;
    this.cellSize = Math.floor(Math.min(width / 5.5, 56));
    this.gridW = this.cellSize * 4 + 8 * 3;
    this.gridH = this.cellSize * 4 + 8 * 3;
    this.gridX = (width - this.gridW) / 2;
    this.gridY = 48;
    this.sweepGraphics = scene.add.graphics();
    this.gridGraphics = scene.add.graphics();
  }

  drawSweep(totalBeat: number, segStart: number): void {
    const step = this.cellSize + 8;
    const segRow = Math.floor(segStart / 4);
    const segCol = segStart % 4;
    let row: number;
    let col: number;
    if (totalBeat < 4) {
      row = segRow;
      col = segCol + (totalBeat - 4);
    } else {
      const offset = totalBeat - 4;
      row = segRow + Math.floor(offset / 4);
      col = segCol + (offset % 4);
    }
    const sweepX = this.gridX + col * step + this.cellSize / 2;
    const sweepY = this.gridY + row * step + this.cellSize / 2;
    const g = this.sweepGraphics;
    g.clear();
    g.fillStyle(colors.accent, 0.2);
    g.fillCircle(sweepX, sweepY, this.cellSize / 2 + 2);
  }

  drawGrid(params: DrawGridParams): void {
    const g = this.gridGraphics;
    g.clear();
    const s = this.cellSize;
    const gap = 8;

    for (let bar = 0; bar < 4; bar++) {
      for (let beat = 0; beat < 4; beat++) {
        const idx = bar * 4 + beat;

        if (idx >= params.visibleEnd) continue;
        if (params.state === "intro" && idx >= params.resultRevealIndex) continue;

        const x = this.gridX + beat * (s + gap);
        const y = this.gridY + bar * (s + gap);

        const inPreviousSeg = idx < params.segStart;
        const inCurrentSeg = idx >= params.segStart && idx < params.segEnd;

        let color: number;
        let alpha: number;

        if (params.state === "finalResult") {
          if (idx < params.resultRevealIndex) {
            const seq = params.sequence[idx];
            const tap = params.playerTaps[idx];
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
          params.state === "listening" &&
          inCurrentSeg &&
          idx === params.segStart + params.lastHighlight
        ) {
          if (params.sequence[idx]) {
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

        if (params.state !== "finalResult" && params.playerTaps[idx]) {
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
          params.state === "finalResult" &&
          params.playerTaps[idx] &&
          params.sequence[idx]
        ) {
          const offsetMs = params.tapAccuracy[idx];
          const absMs = Math.abs(offsetMs);
          const fill = Math.max(0.1, 1 - 0.9 * (absMs / 100));
          const shift = Phaser.Math.Clamp(offsetMs / 100, -1, 1) * r * 0.6;
          g.fillStyle(colors.white, 0.8);
          g.fillCircle(cx + shift, cy, r * fill);
        }

        if (
          (params.state === "listening" || params.state === "playing") &&
          inCurrentSeg &&
          idx === params.segStart + params.lastHighlight
        ) {
          g.lineStyle(2, colors.white, 0.7);
          g.strokeCircle(cx, cy, r);
        }
      }
    }
  }

  tileCenter(idx: number): { cx: number; cy: number } {
    const bar = Math.floor(idx / 4);
    const beat = idx % 4;
    const s = this.cellSize;
    const gap = 8;
    return {
      cx: this.gridX + beat * (s + gap) + s / 2,
      cy: this.gridY + bar * (s + gap) + s / 2,
    };
  }

  showHitEffect(idx: number): void {
    const { cx, cy } = this.tileCenter(idx);
    const glow = this.scene.add.graphics();
    glow.setPosition(cx, cy);
    glow.fillStyle(colors.accent, 0.8);
    glow.fillCircle(0, 0, this.cellSize / 2 + 4);
    this.scene.tweens.add({
      targets: glow,
      alpha: 0,
      scaleX: 2,
      scaleY: 2,
      duration: 500,
      ease: "Quad.easeOut",
      onComplete: () => glow.destroy(),
    });
  }

  clearSweep(): void {
    this.sweepGraphics.clear();
  }
}
