import { describe, expect, it } from 'vitest';
import { simulate } from './simPlayer';

describe('economy simulation', () => {
  const runs = [11, 22, 33, 44, 55].map((seed) => simulate({ seed, maxSeconds: 48 * 3600, untilRank: 'C', verbose: !!process.env.SIM_VERBOSE }));

  if (process.env.SIM_VERBOSE) {
    for (const r of runs) {
      for (const l of r.log) console.log(`${(l.t / 60).toFixed(1).padStart(6)}m  ${l.msg}`);
      const s = r.save;
      console.log({
        rankAt: Object.fromEntries(Object.entries(r.rankAt).map(([k, v]) => [k, +(v! / 60).toFixed(1)])),
        activeAt: Object.fromEntries(Object.entries(r.activeAt).map(([k, v]) => [k, +(v! / 60).toFixed(1)])),
        minutes: +(r.seconds / 60).toFixed(1), idleMin: +(r.idle / 60).toFixed(1), battles: r.battles, losses: r.losses,
        level: s.player.level, crystals: s.currency.crystals, gold: s.currency.gold, essence: s.currency.essence,
        hunters: Object.keys(s.hunters).length, team: s.team.slots.filter(Boolean).map((id) => `${id}@${s.hunters[id!].level}`),
      });
    }
  }

  it('a fresh free player reaches C-rank in roughly 2 hours of active play (1.25h–2.75h)', () => {
    for (const r of runs) {
      expect(r.activeAt.C).toBeDefined();
      expect(r.activeAt.C!).toBeGreaterThan(1.25 * 3600);
      expect(r.activeAt.C!).toBeLessThan(2.75 * 3600);
    }
  });

  it('stamina waits stay modest: C-rank within a day of real time', () => {
    for (const r of runs) expect(r.rankAt.C!).toBeLessThan(24 * 3600);
  });

  it('D-rank comes first and the economy never goes negative', () => {
    for (const r of runs) {
      expect(r.rankAt.D!).toBeLessThan(r.rankAt.C!);
      expect(r.minCrystals).toBeGreaterThanOrEqual(0);
      expect(r.save.currency.gold).toBeGreaterThanOrEqual(0);
      expect(r.save.currency.essence).toBeGreaterThanOrEqual(0);
    }
  });

});
