import { GACHA, HUNTER, PLAYER, RANKS } from '../config/balance';
import { getHunter } from '../data/hunters';
import type { HunterDef, Passive, Rank, StatKey, StatMods, Stats } from '../types';

export interface OwnedHunter {
  level: number;
  stars: number;
  ascension: number;
  obtainedAt: number;
}

export const xpToNext = (level: number) => Math.floor(PLAYER.xpBase * Math.pow(level, PLAYER.xpExp));

export const totalXpForLevel = (level: number) => {
  let t = 0;
  for (let l = 1; l < level; l++) t += xpToNext(l);
  return t;
};

/** Add xp to player; returns new level/xp and how many levels gained. */
export function addPlayerXp(level: number, xp: number, gain: number) {
  let l = level;
  let x = xp + gain;
  let gained = 0;
  while (l < PLAYER.maxLevel && x >= xpToNext(l)) {
    x -= xpToNext(l);
    l++;
    gained++;
  }
  if (l >= PLAYER.maxLevel) x = 0;
  return { level: l, xp: x, gained };
}

export const rankIndex = (r: Rank) => RANKS.indexOf(r);
export const nextRank = (r: Rank): Rank | null => RANKS[rankIndex(r) + 1] ?? null;

export function applyMods(s: Stats, mods: StatMods | undefined): Stats {
  if (!mods) return s;
  const out = { ...s };
  for (const k of Object.keys(mods) as StatKey[]) {
    const v = mods[k]!;
    if (k === 'critRate' || k === 'critDmg') out[k] = out[k] + v;
    else out[k] = out[k] * (1 + v);
  }
  return out;
}

export function playerStats(level: number, rank: Rank): Stats {
  const b = PLAYER.base;
  const g = 1 + PLAYER.growthPerLevel * (level - 1);
  const r = 1 + PLAYER.rankStatBonus * rankIndex(rank);
  return {
    hp: Math.round(b.hp * g * r),
    atk: Math.round(b.atk * g * r),
    def: Math.round(b.def * g * r),
    spd: Math.round(b.spd + Math.floor((level - 1) / 10) * 2 + rankIndex(rank) * 3),
    critRate: b.critRate + rankIndex(rank) * 0.02,
    critDmg: b.critDmg + rankIndex(rank) * 0.05,
  };
}

export const activePassives = (def: HunterDef, stars: number): Passive[] =>
  def.kit.passives.filter((_, i) => stars >= HUNTER.passiveStars[i]);

/** Final hunter stats (level, ascension, limit-break stars, own passives). */
export function hunterStats(id: string, h: Pick<OwnedHunter, 'level' | 'stars' | 'ascension'>): Stats {
  const def = getHunter(id);
  const b = def.base;
  const g = (1 + HUNTER.growthPerLevel * (h.level - 1)) * (1 + HUNTER.ascensionStatBonus * h.ascension);
  const star = 1 + HUNTER.starStatBonus * h.stars;
  let s: Stats = {
    hp: b.hp * g * star,
    atk: b.atk * g * star,
    def: b.def * g * star,
    spd: (b.spd + Math.floor((h.level - 1) / 10) * HUNTER.spdPer10Levels) * star,
    critRate: b.critRate * star,
    critDmg: b.critDmg * star,
  };
  for (const p of activePassives(def, h.stars)) s = applyMods(s, p.stats);
  return roundStats(s);
}

export function roundStats(s: Stats): Stats {
  return {
    hp: Math.round(s.hp),
    atk: Math.round(s.atk),
    def: Math.round(s.def),
    spd: Math.round(s.spd),
    critRate: Math.round(s.critRate * 1000) / 1000,
    critDmg: Math.round(s.critDmg * 1000) / 1000,
  };
}

export const power = (s: Stats) =>
  Math.round(s.hp * 0.08 + s.atk * 1.2 + s.def * 0.8 + s.spd * 2 + s.atk * s.critRate * s.critDmg * 1.5);

export const levelCap = (ascension: number) => HUNTER.levelCaps[Math.min(ascension, HUNTER.levelCaps.length - 1)];
export const maxAscension = () => HUNTER.levelCaps.length - 1;

export function levelUpCost(level: number) {
  const f = Math.pow(level, HUNTER.levelCostExp);
  return { gold: Math.round(HUNTER.goldBase * f), essence: Math.round(HUNTER.essenceBase * f) };
}

export function ascensionCost(ascension: number) {
  return { mats: HUNTER.ascensionMats[ascension], gold: HUNTER.ascensionGold[ascension] };
}

/** Outcome of receiving a hunter (new / limit-break star / overflow crystals). */
export function receiveHunter(owned: OwnedHunter | undefined, id: string, now: number) {
  if (!owned) return { owned: { level: 1, stars: 0, ascension: 0, obtainedAt: now }, kind: 'new' as const, crystals: 0 };
  if (owned.stars < HUNTER.maxStars) return { owned: { ...owned, stars: owned.stars + 1 }, kind: 'star' as const, crystals: 0 };
  return { owned, kind: 'overflow' as const, crystals: GACHA.overflowDupeCrystals[getHunter(id).rarity] };
}
