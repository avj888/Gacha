export type HapticName = 'tap' | 'hit' | 'crit' | 'ult' | 'ssr' | 'win' | 'error';

const PATTERNS: Record<HapticName, number | number[]> = {
  tap: 8,
  hit: 12,
  crit: [20, 30, 25],
  ult: [30, 40, 60],
  ssr: [40, 60, 40, 60, 120],
  win: [20, 40, 20],
  error: [50, 30, 50],
};

let enabled = true;
export function setHapticsEnabled(on: boolean) {
  enabled = on;
}

export function haptic(name: HapticName) {
  if (!enabled || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(PATTERNS[name]);
  } catch {
    /* some browsers throw when not triggered by a gesture */
  }
}
