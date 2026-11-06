import { describe, expect, it } from 'vitest';
import { GACHA } from '../src/config/balance';
import {
  effectiveSsrRate,
  mythicShareOfTop,
  emptyBannerState,
  getBanners,
  pullOne,
  pullTen,
  ssrRateAt,
  type BannerState,
  type PullResult,
} from '../src/engine/gacha';
import { mulberry32 } from '../src/engine/rng';

const NOW = Date.UTC(2026, 10, 6);
const [featured, beginner] = getBanners(NOW);

describe('pity curve', () => {
  it('is flat until soft pity, then climbs 6pp per pull, and hits 100% at 80', () => {
    expect(ssrRateAt(1)).toBe(0.01);
    expect(ssrRateAt(65)).toBe(0.01);
    expect(ssrRateAt(66)).toBeCloseTo(0.07, 10);
    expect(ssrRateAt(70)).toBeCloseTo(0.31, 10);
    expect(ssrRateAt(80)).toBe(1);
  });
  it('effective rate is sensible', () => {
    const r = effectiveSsrRate();
    expect(r).toBeGreaterThan(0.01);
    expect(r).toBeLessThan(0.03);
  });
});

describe('1,000,000 pull simulation (featured banner)', () => {
  const N = 1_000_000;
  const rng = mulberry32(0xc0ffee);
  let state: BannerState = emptyBannerState();
  let ssr = 0; // SSR-tier: SSR + Mythic
  let mythic = 0;
  let ssrSinceMythic = 0;
  let maxSsrSinceMythic = 0;
  let featuredSsr = 0;
  let plainSsr = 0;
  let maxPity = 0;
  let guaranteeViolations = 0;
  let tenPullFloorViolations = 0;
  let pendingGuarantee = false;
  let pulls = 0;

  const observe = (r: PullResult) => {
    maxPity = Math.max(maxPity, r.pityAt);
    if (r.rarity === 'MR') {
      ssr++;
      mythic++;
      ssrSinceMythic = 0;
    }
    if (r.rarity === 'SSR') {
      ssr++;
      plainSsr++;
      ssrSinceMythic++;
      maxSsrSinceMythic = Math.max(maxSsrSinceMythic, ssrSinceMythic);
      if (r.hunterId === featured.featuredId) featuredSsr++;
      if (pendingGuarantee && r.hunterId !== featured.featuredId) guaranteeViolations++;
      pendingGuarantee = !!r.lostFiftyFifty;
    }
  };

  // Mix singles and 10-pulls like a real player would.
  while (pulls < N) {
    if (rng.next() < 0.5) {
      const out = pullOne(state, featured, rng);
      state = out.state;
      observe(out.result);
      pulls += 1;
    } else {
      const out = pullTen(state, featured, rng);
      state = out.state;
      out.results.forEach(observe);
      if (!out.results.some((r) => r.rarity !== 'R')) tenPullFloorViolations++;
      pulls += 10;
    }
  }

  it('Mythic share of SSR-tier results matches the analytic rate', () => {
    expect(Math.abs(mythic / ssr - mythicShareOfTop())).toBeLessThan(0.01);
    expect(mythic / pulls).toBeGreaterThan(0.002);
    expect(mythic / pulls).toBeLessThan(0.005);
  });

  it('Mythic spark: never more SSRs in a row without a Mythic than the spark allows', () => {
    expect(maxSsrSinceMythic).toBeLessThanOrEqual(GACHA.mythicSparkAt - 1);
    expect(maxSsrSinceMythic).toBe(GACHA.mythicSparkAt - 1); // the spark is actually exercised
  });

  it('SSR-tier rate (SSR + Mythic) matches the analytic effective rate within tolerance', () => {
    const observed = ssr / pulls;
    const expected = effectiveSsrRate();
    // ±0.05 percentage points (≈4σ at 1M pulls)
    expect(Math.abs(observed - expected)).toBeLessThan(0.0005);
  });

  it('pity never exceeds the hard pity', () => {
    expect(maxPity).toBeLessThanOrEqual(GACHA.hardPity);
    expect(maxPity).toBeGreaterThan(GACHA.softPityStart); // soft pity is actually reached
  });

  it('the 50/50 guarantee always holds', () => {
    expect(guaranteeViolations).toBe(0);
  });

  it('featured share of SSRs converges to 2/3 (50/50 + guarantee)', () => {
    expect(featuredSsr / plainSsr).toBeGreaterThan(0.64);
    expect(featuredSsr / plainSsr).toBeLessThan(0.69);
  });

  it('every 10-pull contains at least one SR or better', () => {
    expect(tenPullFloorViolations).toBe(0);
  });
});

describe('beginner banner', () => {
  it('the first 10-pull always contains an SSR', () => {
    for (let seed = 1; seed <= 5000; seed++) {
      const { results } = pullTen(emptyBannerState(), beginner, mulberry32(seed));
      expect(results.some((r) => r.rarity === 'SSR' || r.rarity === 'MR')).toBe(true);
    }
  });
  it('pulls never mutate the input state', () => {
    const s = emptyBannerState();
    pullTen(s, beginner, mulberry32(9));
    expect(s).toEqual(emptyBannerState());
  });
});
