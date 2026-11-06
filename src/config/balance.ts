/**
 * RIFTBORN balance config — every tunable number lives here.
 * Engines import from this file only; never hardcode numbers elsewhere.
 */
import type { HunterElement, Element, Rank, Rarity } from '../types';

export const RANKS: Rank[] = ['E', 'D', 'C', 'B', 'A', 'S'];

export const PLAYER = {
  startRank: 'E' as Rank,
  maxLevel: 100,
  /** xpToNext = floor(xpBase * level ^ xpExp) */
  xpBase: 100,
  xpExp: 1.6,
  /** level required to attempt the trial that unlocks a rank */
  trialLevel: { D: 10, C: 25, B: 45, A: 70, S: 90 } as Record<Exclude<Rank, 'E'>, number>,
  /** hunter slots per rank (player always fights too) */
  teamSlots: { E: 1, D: 2, C: 3, B: 4, A: 4, S: 4 } as Record<Rank, number>,
  /** bound echo slots per rank */
  echoSlots: { E: 1, D: 1, C: 1, B: 1, A: 2, S: 3 } as Record<Rank, number>,
  maxEchoes: 3,
  /** crystal bonus for each rank-up */
  rankUpCrystals: 480,
  /** stamina granted on each player level up */
  levelUpStamina: 40,
  /** player base stats at level 1, and per-level growth (fraction of base) */
  base: { hp: 1100, atk: 110, def: 70, spd: 102, critRate: 0.1, critDmg: 0.5 },
  growthPerLevel: 0.07,
  /** multiplicative stat bonus per rank above E */
  rankStatBonus: 0.12,
};

export const START = {
  crystals: 3200,
  gold: 5000,
  essence: 600,
  /** starter hunter granted on new save */
  starterHunter: 'r-brann',
};

export const STAMINA = {
  max: 120,
  regenMinutes: 6,
  /** cost per gate tier */
  cost: { E: 6, D: 8, C: 10, B: 13, A: 16, S: 20 } as Record<Rank, number>,
  /** stamina can be overfilled by level-ups up to this cap */
  overflowCap: 999,
};

// ---------------------------------------------------------------- Gacha

export const GACHA = {
  costSingle: 160,
  costTen: 1600,
  baseRates: { SSR: 0.01, SR: 0.08, R: 0.91 } as Record<Rarity, number>,
  /** from this pull number (since last SSR, 1-based) the SSR rate starts increasing */
  softPityStart: 66,
  /** added to SSR rate per pull from softPityStart onwards (pull 66 = base + 1 step) */
  softPityStep: 0.06,
  hardPity: 80,
  featuredChance: 0.5,
  /** a 10-pull guarantees at least this rarity */
  tenPullFloor: 'SR' as Rarity,
  beginner: {
    maxPulls: 20,
    /** first 10-pull contains an SSR */
    guaranteeSsrInFirstTen: true,
  },
  historyCap: 500,
  /** featured banner rotation period */
  rotationDays: 7,
  /** dupes beyond max stars convert into this many crystals */
  overflowDupeCrystals: { R: 20, SR: 80, SSR: 400 } as Record<Rarity, number>,
};

// ---------------------------------------------------------------- Hunters

export const HUNTER = {
  maxStars: 5,
  /** each LB star: +8% to all stats */
  starStatBonus: 0.08,
  passiveStars: [1, 3, 5] as const,
  /** level cap per ascension tier (index = ascension) */
  levelCaps: [20, 30, 40, 50, 60, 70, 80],
  /** per-level growth as fraction of base hp/atk/def */
  growthPerLevel: 0.07,
  /** flat speed every 10 levels */
  spdPer10Levels: 2,
  /** each ascension: +5% hp/atk/def */
  ascensionStatBonus: 0.05,
  /** level-up cost: gold = goldBase*L^exp, essence = essenceBase*L^exp */
  goldBase: 60,
  essenceBase: 12,
  levelCostExp: 1.35,
  /** ascension cost: mats of the hunter's element and gold */
  ascensionMats: [4, 8, 14, 22, 32, 45],
  ascensionGold: [4000, 10000, 22000, 40000, 70000, 110000],
  rarityStatMult: { R: 1, SR: 1.18, SSR: 1.4 } as Record<Rarity, number>,
};

// ---------------------------------------------------------------- Elements

/** attacker -> defender it beats */
export const ELEMENT_ADVANTAGE: Record<Element, Element[]> = {
  flame: ['frost'],
  frost: ['storm'],
  storm: ['flame'],
  void: ['radiant'],
  radiant: ['void'],
  rift: [],
};

/** spec: +30% on advantage; no penalty on disadvantage (tunable) */
export const ELEMENT_MOD = { advantage: 1.3, disadvantage: 1, neutral: 1 };

export const ELEMENTS: HunterElement[] = ['flame', 'frost', 'storm', 'void', 'radiant'];

// ---------------------------------------------------------------- Battle

export const BATTLE = {
  /** action value = avBase / spd */
  avBase: 10000,
  energyMax: 100,
  energyOnBasic: 20,
  energyOnSkill: 30,
  energyOnHit: 10,
  energyOnKill: 10,
  randMin: 0.95,
  randMax: 1.05,
  defConstant: 100,
  /** echoes act once every N rounds (a round = every living ally acted once) */
  echoEvery: 3,
  threeStarTurnLimit: 15,
  maxTurns: 300,
  timelinePreview: 8,
};

// ---------------------------------------------------------------- Gates

export const GATES = {
  perTier: 10,
  waves: 2,
  /** chance any clear rolls a Red Gate follow-up */
  redGateChance: 0.05,
  redGateRewardMult: 3,
  redGateStatMult: 1.45,
  redGateCrystals: 30,
  /** enemy stat scaling: gate n of a tier is tuned for a player level inside that tier's band
   *  (tier start level -> next trial level), scaled by levelBandUse so frontier gates stay beatable */
  enemyBase: { hp: 440, atk: 58, def: 40, spd: 92, critRate: 0.05, critDmg: 0.5 },
  tierLevels: [1, 10, 25, 45, 70, 90, 100],
  levelBandUse: 0.8,
  /** per expected level, fraction of base (mirrors hunter growth) */
  enemyGrowth: 0.07,
  /** multiplicative bonus per tier (mirrors ascension / limit break / rank growth on the player side) */
  enemyTierBonus: 0.18,
  /** small ramp inside a tier, per gate */
  enemyGateRamp: 0.025,
  /** enemy DEF grows as f^enemyDefExp (keeps the DEF formula from flattening damage late) */
  enemyDefExp: 0.6,
  bossHpMult: 3.2,
  bossAtkMult: 1.25,
  /** rewards: per stamina point spent */
  goldPerStamina: 40,
  essencePerStamina: 8,
  /** player xp per clear = xpBase * (g+1)^xpExp */
  xpBase: 23,
  xpExp: 1.35,
  firstClearXpMult: 2,
  /** sweeps grant full gold/essence/mats but reduced player XP — the Awakened grows by fighting */
  sweepXpMult: 0.5,
  /** crystals for first clear and first 3★, by tier */
  firstClearCrystals: { E: 30, D: 40, C: 50, B: 60, A: 70, S: 80 } as Record<Rank, number>,
  threeStarCrystals: { E: 20, D: 25, C: 30, B: 35, A: 40, S: 50 } as Record<Rank, number>,
  /** ascension materials from the boss */
  bossMatsMin: 1,
  bossMatsMax: 2,
  bossMatsTierBonus: 1, // + floor(tierIndex * this / 2)
};

export const TRIALS = {
  /** trial boss uses the stat block of this global gate index */
  gateIndex: { D: 9, C: 19, B: 29, A: 39, S: 49 } as Record<Exclude<Rank, 'E'>, number>,
  hpMult: 2.0,
  atkMult: 0.85,
};

// ---------------------------------------------------------------- Quests

export const QUESTS = {
  dailyCount: 3,
  /** total for all 3 dailies = 60 */
  dailyCrystals: 20,
  weeklyCrystals: 300,
  dailyGold: 3000,
  weeklyGold: 20000,
  dailyEssence: 150,
  /** weekly reset day (0=Sun, 1=Mon) */
  weeklyResetDay: 1,
};

export const SAVE = {
  key: 'riftborn.save',
  version: 1,
  exportPrefix: 'RIFT1',
  debounceMs: 400,
};
