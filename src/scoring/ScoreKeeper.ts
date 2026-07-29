export interface RoundResult {
  missed: number;
  wrong: number;
}

export interface FinalScore {
  correct: number;
  missed: number;
  wrong: number;
  totalHits: number;
  accuracyTotal: number;
  hitScore: number;
  total: number;
  folkFlest: number;
  perfect: boolean;
}

export class ScoreKeeper {
  totalMissed = 0;
  totalWrong = 0;

  scoreRound(seq: boolean[], taps: boolean[], start: number, count: number): RoundResult {
    let missed = 0;
    let wrong = 0;

    for (let i = start; i < start + count; i++) {
      if (seq[i] && !taps[i]) missed++;
      if (!seq[i] && taps[i]) wrong++;
    }

    this.totalMissed += missed;
    this.totalWrong += wrong;

    return { missed, wrong };
  }

  finalScore(seq: boolean[], taps: boolean[], tapAccuracy: number[]): FinalScore {
    const TOTAL_BEATS = 16;

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
          Math.round(100 * (1 - Math.abs(tapAccuracy[i]) / 100)),
        );
      }
    }

    const hitScore = Math.max(
      0,
      correct * 100 - finalWrong * 100 - finalMissed * 50,
    );
    const total = hitScore + accuracyTotal;
    const folkFlest = Math.max(0, totalHits - 1) * 177;
    const perfect = correct === totalHits && finalWrong === 0;

    return {
      correct,
      missed: finalMissed,
      wrong: finalWrong,
      totalHits,
      accuracyTotal,
      hitScore,
      total,
      folkFlest,
      perfect,
    };
  }

  accuracyBonus(offsetMs: number): number {
    return Math.max(0, Math.round(100 * (1 - Math.abs(offsetMs) / 100)));
  }
}
