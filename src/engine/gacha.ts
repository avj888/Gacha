import { GACHA } from '../config/balance';
import { byRarity } from '../data/hunters';
import type { Rarity } from '../types';
import { pick, type Rng } from './rng';

export type BannerKind = 'featured' | 'beginner';

export interface BannerState {
  /** pulls since the last SSR on this banner */
  pity: number;
  /** pulls since the last SR-or-better */
  srPity: number;
  /** next SSR is guaranteed to be the featured hunter (lost the previous 50/50) */
  guaranteedFeatured: boolean;
  totalPulls: number;
  /** SSR-tier results since the last Mythic (spark counter) */
  mrPity: number;
}

export interface BannerDef {
  id: string;
  kind: BannerKind;
  name: string;
  featuredId?: string;
  pool: Record<Rarity, string[]>;
}

export interface PullResult {
  hunterId: string;
  rarity: Rarity;
  /** pity count at which this pull happened (1-based) */
  pityAt: number;
  featured?: boolean;
  lostFiftyFifty?: boolean;
}

export const emptyBannerState = (): BannerState => ({ pity: 0, srPity: 0, guaranteedFeatured: false, totalPulls: 0, mrPity: 0 });

/** SSR probability for the n-th pull since the last SSR (1-based). */
export function ssrRateAt(n: number): number {
  if (n >= GACHA.hardPity) return 1;
  if (n >= GACHA.softPityStart) {
    return Math.min(1, GACHA.baseRates.SSR + GACHA.softPityStep * (n - GACHA.softPityStart + 1));
  }
  return GACHA.baseRates.SSR;
}

/** Long-run fraction of SSR-tier results that are Mythic (share per SSR + spark). */
export function mythicShareOfTop(): number {
  const p = GACHA.mythicShare;
  const k = GACHA.mythicSparkAt;
  let e = 0;
  for (let i = 1; i < k; i++) e += i * p * Math.pow(1 - p, i - 1);
  e += k * Math.pow(1 - p, k - 1);
  return 1 / e;
}

/** Exact long-run SSR-tier rate (SSR + Mythic) given the pity curve: 1 / E[pulls per SSR-tier]. */
export function effectiveSsrRate(): number {
  let survive = 1;
  let expected = 0;
  for (let n = 1; n <= GACHA.hardPity; n++) {
    const p = ssrRateAt(n);
    expected += n * survive * p;
    survive *= 1 - p;
  }
  return 1 / expected;
}

/** Rolls the base tier (R / SR / SSR). Mythic is decided afterwards as an SSR upgrade. */
export function rollRarity(pityAt: number, rng: Rng, floor?: Rarity): Rarity {
  if (floor === 'SSR' || floor === 'MR') return 'SSR';
  const pSsr = ssrRateAt(pityAt);
  const r = rng.next();
  if (r < pSsr) return 'SSR';
  if (floor === 'SR') return 'SR';
  const pSr = Math.min(GACHA.baseRates.SR, 1 - pSsr);
  if (r < pSsr + pSr) return 'SR';
  return 'R';
}

/** One pull. Returns the result and the new state (inputs are not mutated). */
export function pullOne(state: BannerState, banner: BannerDef, rng: Rng, floor?: Rarity): { result: PullResult; state: BannerState } {
  const pityAt = state.pity + 1;
  const rarity = rollRarity(pityAt, rng, floor);
  const next: BannerState = { ...state, totalPulls: state.totalPulls + 1 };
  let result: PullResult;

  if (rarity === 'SSR') {
    next.pity = 0;
    next.srPity = 0;
    const mrPool = banner.pool.MR ?? [];
    const mythic = mrPool.length > 0 && (state.mrPity + 1 >= GACHA.mythicSparkAt || rng.next() < GACHA.mythicShare);
    if (mythic) {
      next.mrPity = 0;
      // a Mythic does not consume the featured 50/50 or its guarantee
      return { result: { hunterId: pick(rng, mrPool), rarity: 'MR', pityAt }, state: next };
    }
    next.mrPity = state.mrPity + 1;
    if (banner.kind === 'featured' && banner.featuredId) {
      const off = banner.pool.SSR.filter((id) => id !== banner.featuredId);
      const winFeatured = state.guaranteedFeatured || off.length === 0 || rng.next() < GACHA.featuredChance;
      if (winFeatured) {
        next.guaranteedFeatured = false;
        result = { hunterId: banner.featuredId, rarity, pityAt, featured: true };
      } else {
        next.guaranteedFeatured = true;
        result = { hunterId: pick(rng, off), rarity, pityAt, featured: false, lostFiftyFifty: true };
      }
    } else {
      result = { hunterId: pick(rng, banner.pool.SSR), rarity, pityAt };
    }
  } else {
    next.pity = pityAt;
    next.srPity = rarity === 'SR' ? 0 : state.srPity + 1;
    result = { hunterId: pick(rng, banner.pool[rarity]), rarity, pityAt };
  }
  return { result, state: next };
}

/** Ten pulls with the SR floor (and beginner SSR guarantee). */
export function pullTen(state: BannerState, banner: BannerDef, rng: Rng): { results: PullResult[]; state: BannerState } {
  const results: PullResult[] = [];
  let s = state;
  const firstBeginnerTen = banner.kind === 'beginner' && GACHA.beginner.guaranteeSsrInFirstTen && state.totalPulls === 0;
  for (let i = 0; i < 10; i++) {
    let floor: Rarity | undefined;
    if (i === 9) {
      const hasSsr = results.some((r) => r.rarity === 'SSR' || r.rarity === 'MR');
      const hasSr = results.some((r) => r.rarity !== 'R');
      if (firstBeginnerTen && !hasSsr) floor = 'SSR';
      else if (!hasSr) floor = GACHA.tenPullFloor;
    }
    const out = pullOne(s, banner, rng, floor);
    results.push(out.result);
    s = out.state;
  }
  return { results, state: s };
}

export function canPullBeginner(state: BannerState, count: 1 | 10) {
  return state.totalPulls + count <= GACHA.beginner.maxPulls;
}

// ---------------------------------------------------------------- banners

const DAY = 86400000;
/** Monday 2024-01-01 00:00 UTC — rotation epoch */
const EPOCH = Date.UTC(2024, 0, 1);

const fullPool = (): Record<Rarity, string[]> => ({
  MR: byRarity('MR').map((h) => h.id),
  SSR: byRarity('SSR').map((h) => h.id),
  SR: byRarity('SR').map((h) => h.id),
  R: byRarity('R').map((h) => h.id),
});

export function featuredIdFor(now: number): string {
  const ssr = byRarity('SSR');
  const period = Math.floor((now - EPOCH) / (GACHA.rotationDays * DAY));
  return ssr[((period % ssr.length) + ssr.length) % ssr.length].id;
}

export function rotationEndsAt(now: number): number {
  const len = GACHA.rotationDays * DAY;
  return EPOCH + (Math.floor((now - EPOCH) / len) + 1) * len;
}

export function getBanners(now: number): BannerDef[] {
  return [
    { id: 'featured', kind: 'featured', name: 'Rift Surge', featuredId: featuredIdFor(now), pool: fullPool() },
    { id: 'beginner', kind: 'beginner', name: 'First Awakening', pool: fullPool() },
  ];
}
