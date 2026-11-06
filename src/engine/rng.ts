/** Deterministic PRNG. All engine randomness goes through an Rng. */
export interface Rng {
  next(): number; // [0,1)
  state(): number;
}

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return {
    next() {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    state: () => a,
  };
}

export const randomSeed = () => (Math.random() * 0xffffffff) >>> 0;

export const range = (rng: Rng, min: number, max: number) => min + (max - min) * rng.next();
export const chance = (rng: Rng, p: number) => rng.next() < p;
export function pick<T>(rng: Rng, arr: readonly T[]): T {
  return arr[Math.floor(rng.next() * arr.length)];
}
