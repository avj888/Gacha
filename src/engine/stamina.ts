import { STAMINA } from '../config/balance';

const TICK = STAMINA.regenMinutes * 60_000;

/** Resolve regenerated stamina at `now`. Overfill (above max) never regenerates further. */
export function currentStamina(s: { value: number; updatedAt: number }, now: number) {
  if (s.value >= STAMINA.max) return { value: s.value, updatedAt: now };
  const ticks = Math.floor(Math.max(0, now - s.updatedAt) / TICK);
  const value = Math.min(STAMINA.max, s.value + ticks);
  // keep the partial progress toward the next tick
  const updatedAt = value >= STAMINA.max ? now : s.updatedAt + ticks * TICK;
  return { value, updatedAt };
}

export function msToNextStamina(s: { value: number; updatedAt: number }, now: number) {
  const cur = currentStamina(s, now);
  if (cur.value >= STAMINA.max) return 0;
  return TICK - (now - cur.updatedAt);
}

export function spendStamina(s: { value: number; updatedAt: number }, cost: number, now: number) {
  const cur = currentStamina(s, now);
  if (cur.value < cost) return null;
  const wasFull = cur.value >= STAMINA.max;
  return { value: cur.value - cost, updatedAt: wasFull ? now : cur.updatedAt };
}

export function addStamina(s: { value: number; updatedAt: number }, amount: number, now: number) {
  const cur = currentStamina(s, now);
  return { value: Math.min(STAMINA.overflowCap, cur.value + amount), updatedAt: cur.updatedAt };
}
