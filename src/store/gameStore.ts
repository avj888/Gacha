import { create } from 'zustand';
import { GACHA, SAVE } from '../config/balance';
import { canPullBeginner, getBanners, pullOne, pullTen, type PullResult } from '../engine/gacha';
import { receiveHunter } from '../engine/progression';
import { mulberry32, randomSeed } from '../engine/rng';
import { migrate } from '../save/migrations';
import { defaultSave, type Save } from '../save/schema';
import { clearSave, loadSave, writeSave } from '../save/storage';

export interface PullOutcome {
  banner: string;
  results: (PullResult & { kind: 'new' | 'star' | 'overflow'; crystals: number })[];
}

export interface GameStore {
  save: Save;
  lastPull: PullOutcome | null;
  /** apply an immutable update to the save */
  update: (fn: (draft: Save) => void) => void;
  pull: (bannerId: string, count: 1 | 10) => PullOutcome | { error: string };
  clearLastPull: () => void;
  replaceSave: (s: Save) => void;
  resetSave: () => void;
}

const clone = <T,>(v: T): T => (typeof structuredClone === 'function' ? structuredClone(v) : JSON.parse(JSON.stringify(v)));

export const useGame = create<GameStore>((set, get) => ({
  save: loadSave(),
  lastPull: null,

  update: (fn) => {
    const draft = clone(get().save);
    fn(draft);
    draft.lastSeenAt = Date.now();
    set({ save: draft });
  },

  pull: (bannerId, count) => {
    const now = Date.now();
    const s = get().save;
    const banner = getBanners(now).find((b) => b.id === bannerId);
    if (!banner) return { error: 'Unknown banner' };
    const cost = count === 10 ? GACHA.costTen : GACHA.costSingle;
    const bState = s.gacha.banners[bannerId];
    if (banner.kind === 'beginner' && !canPullBeginner(bState, count)) return { error: 'Beginner banner exhausted' };
    if (s.currency.crystals < cost) return { error: 'Not enough Crystals' };

    const rng = mulberry32(randomSeed());
    const out = count === 10 ? pullTen(bState, banner, rng) : (() => {
      const o = pullOne(bState, banner, rng);
      return { results: [o.result], state: o.state };
    })();

    let outcome!: PullOutcome;
    get().update((d) => {
      d.currency.crystals -= cost;
      d.gacha.banners[bannerId] = out.state;
      d.stats.pulls += count;
      const results: PullOutcome['results'] = [];
      for (const r of out.results) {
        const rec = receiveHunter(d.hunters[r.hunterId], r.hunterId, now);
        d.hunters[r.hunterId] = rec.owned;
        d.currency.crystals += rec.crystals;
        results.push({ ...r, kind: rec.kind, crystals: rec.crystals });
        d.gacha.history.unshift({ t: now, banner: bannerId, id: r.hunterId, rarity: r.rarity, pity: r.pityAt });
      }
      d.gacha.history.length = Math.min(d.gacha.history.length, GACHA.historyCap);
      outcome = { banner: bannerId, results };
    });
    set({ lastPull: outcome });
    return outcome;
  },

  clearLastPull: () => set({ lastPull: null }),
  replaceSave: (s) => set({ save: migrate(s as unknown as Record<string, unknown>) }),
  resetSave: () => {
    clearSave();
    set({ save: defaultSave(), lastPull: null });
  },
}));

// ---- persistence: debounced write on every save change, flush on hide/unload
let timer: ReturnType<typeof setTimeout> | null = null;
const flush = () => {
  if (timer) clearTimeout(timer);
  timer = null;
  writeSave(useGame.getState().save);
};
useGame.subscribe((st, prev) => {
  if (st.save === prev.save) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(flush, SAVE.debounceMs);
});
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
}
export const flushSave = flush;
