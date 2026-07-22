export interface LevelData {
  seed: number;
  dateStr: string;
  sequence: boolean[];
}

export class LevelGenerator {
  static generate(seed?: number): LevelData {
    const s = seed ?? dateSeed();
    const rng = mulberry32(s);

    const sequence = new Array(16).fill(false);

    for (let bar = 0; bar < 4; bar++) {
      const count = Math.floor(rng() * 3) + 1;
      const positions = pickN(rng, 4, count);
      for (const pos of positions) {
        sequence[bar * 4 + pos] = true;
      }
    }

    const d = new Date();
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    return { seed: s, dateStr, sequence };
  }
}

function dateSeed(): number {
  const d = new Date();
  // return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  // return Math.random() * 10000;
  // randomize per 10 minutes
  return Math.floor(d.getTime() / (10 * 60 * 1000));
}

function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickN(rng: () => number, max: number, count: number): number[] {
  const pool = Array.from({ length: max }, (_, i) => i);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}
