import { describe, expect, it } from 'vitest';
import { PLAYER, STAMINA } from '../src/config/balance';
import { HUNTERS } from '../src/data/hunters';
import { GATE_LIST } from '../src/data/gates';
import { createBattle } from '../src/engine/battle/battle';
import type { BattleState } from '../src/engine/battle/types';
import * as G from '../src/engine/game';
import { addPlayerXp, hunterStats, receiveHunter, xpToNext } from '../src/engine/progression';
import { mulberry32 } from '../src/engine/rng';
import { currentStamina, spendStamina } from '../src/engine/stamina';
import { buildAllies } from '../src/engine/team';
import { defaultSave } from '../src/save/schema';

const T = Date.UTC(2026, 0, 5, 12);
const won = (): BattleState => ({ ...createBattle({ allies: [], waves: [[]], seed: 1 }).state, outcome: 'win', elapsed: 500 });

describe('roster', () => {
  it('has 36 hunters: 6 SSR, 12 SR, 18 R; every class and element represented', () => {
    expect(HUNTERS).toHaveLength(36);
    expect(HUNTERS.filter((h) => h.rarity === 'SSR')).toHaveLength(6);
    expect(HUNTERS.filter((h) => h.rarity === 'SR')).toHaveLength(12);
    expect(HUNTERS.filter((h) => h.rarity === 'R')).toHaveLength(18);
    for (const c of ['striker', 'assassin', 'ranger', 'mage', 'tank', 'healer']) expect(HUNTERS.filter((h) => h.cls === c)).toHaveLength(6);
    for (const e of ['flame', 'frost', 'storm', 'void', 'radiant']) expect(HUNTERS.filter((h) => h.element === e).length).toBeGreaterThanOrEqual(6);
    expect(new Set(HUNTERS.map((h) => h.id)).size).toBe(36);
    expect(new Set(HUNTERS.map((h) => h.name)).size).toBe(36);
  });
  it('has 60 gates, 10 per tier', () => {
    expect(GATE_LIST).toHaveLength(60);
  });
});

describe('player xp', () => {
  it('xpToNext = floor(100 * level^1.6)', () => {
    expect(xpToNext(1)).toBe(100);
    expect(xpToNext(10)).toBe(Math.floor(100 * Math.pow(10, 1.6)));
  });
  it('levels up through multiple levels and stops at 100', () => {
    expect(addPlayerXp(1, 0, 100 + xpToNext(2)).level).toBe(3);
    expect(addPlayerXp(99, 0, 1e12).level).toBe(PLAYER.maxLevel);
  });
});

describe('limit break', () => {
  it('dupes add stars up to 5, then convert to crystals; each star is +8% stats', () => {
    let o = receiveHunter(undefined, 'r-wren', T).owned;
    const s0 = hunterStats('r-wren', o).spd;
    for (let i = 0; i < 5; i++) o = receiveHunter(o, 'r-wren', T).owned;
    expect(o.stars).toBe(5);
    expect(receiveHunter(o, 'r-wren', T).kind).toBe('overflow');
    expect(hunterStats('r-wren', o).spd).toBe(Math.round(s0 * 1.4));
  });
});

describe('stamina', () => {
  it('regenerates 1 per 6 minutes up to 120', () => {
    const s = { value: 100, updatedAt: T };
    expect(currentStamina(s, T + 6 * 60000 * 5).value).toBe(105);
    expect(currentStamina(s, T + 6 * 60000 * 500).value).toBe(STAMINA.max);
  });
  it('cannot spend more than you have', () => {
    expect(spendStamina({ value: 5, updatedAt: T }, 6, T)).toBeNull();
  });
});

describe('gates', () => {
  it('E-1 is open, E-2 opens after clearing E-1, D tier needs D-rank', () => {
    const d = defaultSave(T);
    const [e1, e2] = GATE_LIST;
    expect(G.gateUnlocked(d, e1)).toBe(true);
    expect(G.gateUnlocked(d, e2)).toBe(false);
    G.finishGate(d, 'E-1', won(), { red: false, ultimates: 0 }, mulberry32(1), T);
    expect(G.gateUnlocked(d, e2)).toBe(true);
    expect(G.gateUnlocked(d, GATE_LIST[10])).toBe(false);
  });
  it('first clear pays crystals once; sweep needs 3 stars', () => {
    const d = defaultSave(T);
    const c0 = d.currency.crystals;
    const r1 = G.finishGate(d, 'E-1', won(), { red: false, ultimates: 0 }, mulberry32(1), T);
    expect(r1.first).toBe(true);
    expect(d.currency.crystals).toBeGreaterThan(c0);
    const c1 = d.currency.crystals;
    const r2 = G.finishGate(d, 'E-1', won(), { red: false, ultimates: 0 }, mulberry32(2), T);
    expect(r2.first).toBe(false);
    expect(d.currency.crystals).toBe(c1);
    // won() has 5 rounds and no allies KO'd -> 3 stars
    expect(G.canSweep(d, 'E-1')).toBe(true);
    expect('runs' in G.sweepGate(d, 'E-1', 3, mulberry32(3), T)).toBe(true);
    expect('error' in G.sweepGate(d, 'E-2', 1, mulberry32(3), T)).toBe(true);
  });
  it('red gate pays 3x', () => {
    const gate = GATE_LIST[5];
    const normal = G.gateRewards(gate, { first: false, newThree: false, red: false }, mulberry32(4));
    const red = G.gateRewards(gate, { first: false, newThree: false, red: true }, mulberry32(4));
    expect(red.gold).toBe(normal.gold * 3);
    expect(red.xp).toBe(normal.xp * 3);
  });
  it('a boss can be bound only once', () => {
    const d = defaultSave(T);
    G.finishGate(d, 'E-1', won(), { red: false, ultimates: 0 }, mulberry32(1), T);
    expect(G.bindEcho(d, 'E-1')).toBe(true);
    expect(G.bindEcho(d, 'E-1')).toBe(false);
    expect(d.echoes).toEqual(['E-1']);
    expect(d.team.echoes[0]).toBe('E-1');
  });
});

describe('rank trials', () => {
  it('trial unlocks at the level threshold and ranks up with a new team slot', () => {
    const d = defaultSave(T);
    expect(G.trialAvailable(d)).toBeNull();
    d.player.level = 10;
    expect(G.trialAvailable(d)).toBe('D');
    expect(G.completeTrial(d, false)).toBeNull();
    expect(G.completeTrial(d, true)).toBe('D');
    expect(d.player.rank).toBe('D');
    expect(PLAYER.teamSlots.D).toBe(PLAYER.teamSlots.E + 1);
  });
  it('team builder respects slot count and always includes the player', () => {
    const d = defaultSave(T);
    d.hunters['r-wren'] = { level: 1, stars: 0, ascension: 0, obtainedAt: T };
    d.team.slots = ['r-brann', 'r-wren', null, null];
    expect(buildAllies(d)).toHaveLength(1 + PLAYER.teamSlots.E);
    expect(buildAllies(d)[0].isPlayer).toBe(true);
    expect(buildAllies(d, { solo: true })).toHaveLength(1);
  });
});

describe('quests', () => {
  it('rolls 3 distinct dailies and 1 weekly, tracks progress, claims once', () => {
    const d = defaultSave(T);
    G.ensureQuests(d, T);
    expect(d.quests.daily).toHaveLength(3);
    expect(new Set(d.quests.daily.map((q) => q.id)).size).toBe(3);
    expect(d.quests.weekly).not.toBeNull();
    const q = d.quests.daily[0];
    G.questEvent(d, 'gate_clear', 100, T);
    G.questEvent(d, 'stamina', 1000, T);
    G.questEvent(d, 'level', 100, T);
    G.questEvent(d, 'ult', 100, T);
    G.questEvent(d, 'boss', 100, T);
    G.questEvent(d, 'sweep', 100, T);
    G.questEvent(d, 'summon', 100, T);
    const c0 = d.currency.crystals;
    expect(G.claimQuest(d, q.id, T)).not.toBeNull();
    expect(d.currency.crystals).toBe(c0 + 20);
    expect(G.claimQuest(d, q.id, T)).toBeNull();
  });
  it('dailies reset the next day', () => {
    const d = defaultSave(T);
    G.ensureQuests(d, T);
    const key = d.quests.dailyKey;
    expect(G.ensureQuests(d, T + 3600000)).toBe(false);
    expect(G.ensureQuests(d, T + 86400000)).toBe(true);
    expect(d.quests.dailyKey).not.toBe(key);
  });
});

describe('hunter upgrades', () => {
  it('levels cost gold+essence and stop at the ascension cap', () => {
    const d = defaultSave(T);
    d.currency.gold = 1e9;
    d.currency.essence = 1e9;
    expect(G.levelUpHunter(d, 'r-brann', 999)).toBe(19);
    expect(d.hunters['r-brann'].level).toBe(20);
    expect(G.canAscend(d, 'r-brann')).toBe(false); // no flame cores
    d.currency.mats.flame = 100;
    expect(G.ascendHunter(d, 'r-brann')).toBe(true);
    expect(G.levelUpHunter(d, 'r-brann', 999)).toBe(10);
  });
});
