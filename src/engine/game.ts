/**
 * Game rules as pure mutators over a Save draft. Used by the store and by the
 * economy simulation test, so the two can never drift apart.
 */
import { GATES, HUNTER, PLAYER, QUESTS, RANKS, STAMINA } from '../config/balance';
import { GATE_LIST, GATE_MAP, type GateDef } from '../data/gates';
import { getHunter } from '../data/hunters';
import { DAILY_POOL, QUEST_MAP, WEEKLY_POOL, type QuestKind } from '../data/quests';
import type { Save } from '../save/schema';
import type { HunterElement, Rank } from '../types';
import { battleSummary } from './battle/battle';
import type { BattleState } from './battle/types';
import { addPlayerXp, ascensionCost, levelCap, levelUpCost, maxAscension, nextRank, rankIndex } from './progression';
import { mulberry32, type Rng } from './rng';
import { addStamina, currentStamina, spendStamina } from './stamina';

// ------------------------------------------------------------ gates

export function tierUnlocked(save: Save, tier: Rank) {
  return rankIndex(save.player.rank) >= RANKS.indexOf(tier);
}

export function gateUnlocked(save: Save, gate: GateDef) {
  if (!tierUnlocked(save, gate.tier)) return false;
  if (gate.n === 1) return true;
  return !!save.gates[`${gate.tier}-${gate.n - 1}`]?.cleared;
}

/** The furthest gate the player can currently attempt. */
export function frontierGate(save: Save): GateDef | undefined {
  const open = GATE_LIST.filter((g) => gateUnlocked(save, g));
  return open.find((g) => !save.gates[g.id]?.cleared) ?? open[open.length - 1];
}

export interface Rewards {
  gold: number;
  essence: number;
  xp: number;
  crystals: number;
  mats: Partial<Record<HunterElement, number>>;
}

export const gateXp = (gate: GateDef) => Math.round(GATES.xpBase * Math.pow(gate.g + 1, GATES.xpExp));

export function gateRewards(gate: GateDef, opts: { first: boolean; newThree: boolean; red: boolean }, rng: Rng): Rewards {
  const mult = opts.red ? GATES.redGateRewardMult : 1;
  const mats = GATES.bossMatsMin + Math.floor(rng.next() * (GATES.bossMatsMax - GATES.bossMatsMin + 1)) + Math.floor((gate.tierIndex * GATES.bossMatsTierBonus) / 2);
  return {
    gold: Math.round(gate.cost * GATES.goldPerStamina * mult),
    essence: Math.round(gate.cost * GATES.essencePerStamina * mult),
    xp: Math.round(gateXp(gate) * (opts.first ? GATES.firstClearXpMult : 1) * mult),
    crystals:
      (opts.first ? GATES.firstClearCrystals[gate.tier] : 0) + (opts.newThree ? GATES.threeStarCrystals[gate.tier] : 0) + (opts.red ? GATES.redGateCrystals : 0),
    mats: { [gate.element]: mats * mult },
  };
}

export function applyRewards(d: Save, r: Rewards, now: number) {
  d.currency.gold += r.gold;
  d.currency.essence += r.essence;
  d.currency.crystals += r.crystals;
  for (const [el, n] of Object.entries(r.mats)) d.currency.mats[el as HunterElement] += n!;
  const lv = addPlayerXp(d.player.level, d.player.xp, r.xp);
  d.player.level = lv.level;
  d.player.xp = lv.xp;
  if (lv.gained > 0) d.stamina = addStamina(d.stamina, PLAYER.levelUpStamina * lv.gained, now);
  return lv.gained;
}

export function enterGate(d: Save, gateId: string, now: number): { ok: true } | { error: string } {
  const gate = GATE_MAP[gateId];
  if (!gate) return { error: 'Unknown gate' };
  if (!gateUnlocked(d, gate)) return { error: 'Gate is sealed' };
  const st = spendStamina(d.stamina, gate.cost, now);
  if (!st) return { error: 'Not enough stamina' };
  d.stamina = st;
  questEvent(d, 'stamina', gate.cost, now);
  return { ok: true };
}

export interface GateResult {
  win: boolean;
  stars: number;
  rounds: number;
  kos: number;
  first: boolean;
  newThree: boolean;
  rewards: Rewards | null;
  levelUps: number;
  redGateRolled: boolean;
  canBind: boolean;
}

/** Count ultimates used by allies, for quests. */
export function countAllyUltimates(events: { t: string; kind?: string; uid?: string }[]) {
  return events.filter((e) => e.t === 'action' && e.kind === 'ultimate' && e.uid?.startsWith('a')).length;
}

export function finishGate(d: Save, gateId: string, state: BattleState, opts: { red: boolean; ultimates: number }, rng: Rng, now: number): GateResult {
  const gate = GATE_MAP[gateId];
  const sum = battleSummary(state);
  questEvent(d, 'ult', opts.ultimates, now);
  if (!sum.win) return { ...sum, first: false, newThree: false, rewards: null, levelUps: 0, redGateRolled: false, canBind: false };
  const prev = d.gates[gateId] ?? { cleared: false, bestStars: 0, bound: false };
  const first = !prev.cleared && !opts.red;
  const newThree = !opts.red && sum.stars === 3 && prev.bestStars < 3;
  const rewards = gateRewards(gate, { first, newThree, red: opts.red }, rng);
  const levelUps = applyRewards(d, rewards, now);
  d.gates[gateId] = { cleared: true, bestStars: opts.red ? prev.bestStars : Math.max(prev.bestStars, sum.stars), bound: prev.bound };
  d.stats.gatesCleared += 1;
  if (opts.red) {
    d.stats.redGatesCleared += 1;
    questEvent(d, 'red_gate', 1, now);
  }
  questEvent(d, 'gate_clear', 1, now);
  questEvent(d, 'boss', 1, now);
  if (sum.stars === 3) questEvent(d, 'three_star', 1, now);
  const redGateRolled = !opts.red && rng.next() < GATES.redGateChance;
  const canBind = !d.gates[gateId].bound && d.echoes.length < 999;
  return { ...sum, first, newThree, rewards, levelUps, redGateRolled, canBind };
}

export function canSweep(save: Save, gateId: string) {
  return (save.gates[gateId]?.bestStars ?? 0) >= 3;
}

export function sweepGate(d: Save, gateId: string, times: number, rng: Rng, now: number): { error: string } | { rewards: Rewards; levelUps: number; runs: number } {
  const gate = GATE_MAP[gateId];
  if (!canSweep(d, gateId)) return { error: '3★ clear required to sweep' };
  const total: Rewards = { gold: 0, essence: 0, xp: 0, crystals: 0, mats: {} };
  let levelUps = 0;
  let runs = 0;
  for (let i = 0; i < times; i++) {
    const st = spendStamina(d.stamina, gate.cost, now);
    if (!st) break;
    d.stamina = st;
    const r = gateRewards(gate, { first: false, newThree: false, red: false }, rng);
    r.xp = Math.round(r.xp * GATES.sweepXpMult);
    levelUps += applyRewards(d, r, now);
    total.gold += r.gold;
    total.essence += r.essence;
    total.xp += r.xp;
    for (const [el, n] of Object.entries(r.mats)) total.mats[el as HunterElement] = (total.mats[el as HunterElement] ?? 0) + n!;
    runs++;
    d.stats.gatesCleared += 1;
    questEvent(d, 'stamina', gate.cost, now);
    questEvent(d, 'gate_clear', 1, now);
    questEvent(d, 'boss', 1, now);
    questEvent(d, 'sweep', 1, now);
  }
  if (!runs) return { error: 'Not enough stamina' };
  return { rewards: total, levelUps, runs };
}

// ------------------------------------------------------------ echoes

export function bindEcho(d: Save, gateId: string): boolean {
  const g = d.gates[gateId];
  if (!g?.cleared || g.bound) return false;
  g.bound = true;
  if (!d.echoes.includes(gateId)) d.echoes.push(gateId);
  // auto-equip into a free unlocked slot
  const slots = PLAYER.echoSlots[d.player.rank];
  for (let i = 0; i < slots; i++) {
    if (!d.team.echoes[i]) {
      d.team.echoes[i] = gateId;
      break;
    }
  }
  return true;
}

// ------------------------------------------------------------ hunters

export function levelUpHunter(d: Save, id: string, levels: number): number {
  const h = d.hunters[id];
  if (!h) return 0;
  let done = 0;
  while (done < levels && h.level < levelCap(h.ascension)) {
    const c = levelUpCost(h.level);
    if (d.currency.gold < c.gold || d.currency.essence < c.essence) break;
    d.currency.gold -= c.gold;
    d.currency.essence -= c.essence;
    h.level++;
    done++;
  }
  if (done) questEvent(d, 'level', done, Date.now());
  return done;
}

/** How many levels can be afforded right now (up to the cap). */
export function affordableLevels(save: Save, id: string, max = 999) {
  const h = save.hunters[id];
  if (!h) return { levels: 0, gold: 0, essence: 0 };
  let gold = 0;
  let essence = 0;
  let levels = 0;
  let L = h.level;
  while (levels < max && L < levelCap(h.ascension)) {
    const c = levelUpCost(L);
    if (gold + c.gold > save.currency.gold || essence + c.essence > save.currency.essence) break;
    gold += c.gold;
    essence += c.essence;
    L++;
    levels++;
  }
  return { levels, gold, essence };
}

export function canAscend(save: Save, id: string) {
  const h = save.hunters[id];
  if (!h || h.ascension >= maxAscension() || h.level < levelCap(h.ascension)) return false;
  const c = ascensionCost(h.ascension);
  const el = getHunter(id).element;
  return save.currency.mats[el] >= c.mats && save.currency.gold >= c.gold;
}

export function ascendHunter(d: Save, id: string): boolean {
  if (!canAscend(d, id)) return false;
  const h = d.hunters[id];
  const c = ascensionCost(h.ascension);
  d.currency.mats[getHunter(id).element] -= c.mats;
  d.currency.gold -= c.gold;
  h.ascension++;
  return true;
}

// ------------------------------------------------------------ rank trials

export function trialAvailable(save: Save): Rank | null {
  const nr = nextRank(save.player.rank);
  if (!nr) return null;
  return save.player.level >= PLAYER.trialLevel[nr as keyof typeof PLAYER.trialLevel] ? nr : null;
}

export function completeTrial(d: Save, won: boolean): Rank | null {
  const nr = trialAvailable(d);
  if (!nr || !won) return null;
  d.player.rank = nr;
  d.currency.crystals += PLAYER.rankUpCrystals;
  return nr;
}

// ------------------------------------------------------------ quests

const pad = (n: number) => String(n).padStart(2, '0');
export const dayKey = (now: number) => {
  const d = new Date(now);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
export const weekKey = (now: number) => {
  const d = new Date(now);
  const diff = (d.getDay() - QUESTS.weeklyResetDay + 7) % 7;
  d.setDate(d.getDate() - diff);
  return dayKey(d.getTime());
};
const keySeed = (k: string) => [...k].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261) >>> 0;

export function nextDailyReset(now: number) {
  const d = new Date(now);
  d.setHours(24, 0, 0, 0);
  return d.getTime();
}
export function nextWeeklyReset(now: number) {
  const d = new Date(now);
  const diff = (QUESTS.weeklyResetDay - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Roll new dailies/weekly when the day/week changed. Returns true if anything reset. */
export function ensureQuests(d: Save, now: number): boolean {
  let changed = false;
  const dk = dayKey(now);
  if (d.quests.dailyKey !== dk) {
    const rng = mulberry32(keySeed(dk) ^ d.seed);
    const kinds = new Set<QuestKind>();
    const picks: string[] = [];
    const pool = [...DAILY_POOL];
    while (picks.length < QUESTS.dailyCount && pool.length) {
      const q = pool.splice(Math.floor(rng.next() * pool.length), 1)[0];
      if (kinds.has(q.kind)) continue;
      kinds.add(q.kind);
      picks.push(q.id);
    }
    d.quests.dailyKey = dk;
    d.quests.daily = picks.map((id) => ({ id, progress: 0, claimed: false }));
    changed = true;
  }
  const wk = weekKey(now);
  if (d.quests.weeklyKey !== wk) {
    const rng = mulberry32(keySeed(wk) ^ d.seed);
    d.quests.weeklyKey = wk;
    d.quests.weekly = { id: WEEKLY_POOL[Math.floor(rng.next() * WEEKLY_POOL.length)].id, progress: 0, claimed: false };
    changed = true;
  }
  return changed;
}

export function questEvent(d: Save, kind: QuestKind, amount: number, now: number) {
  if (amount <= 0) return;
  ensureQuests(d, now);
  for (const q of [...d.quests.daily, ...(d.quests.weekly ? [d.quests.weekly] : [])]) {
    const def = QUEST_MAP[q.id];
    if (def?.kind === kind && !q.claimed) q.progress = Math.min(def.target, q.progress + amount);
  }
}

export function claimQuest(d: Save, id: string, now: number): { crystals: number; gold: number; essence: number } | null {
  ensureQuests(d, now);
  const isWeekly = d.quests.weekly?.id === id;
  const q = isWeekly ? d.quests.weekly! : d.quests.daily.find((x) => x.id === id);
  const def = QUEST_MAP[id];
  if (!q || !def || q.claimed || q.progress < def.target) return null;
  q.claimed = true;
  const r = isWeekly
    ? { crystals: QUESTS.weeklyCrystals, gold: QUESTS.weeklyGold, essence: 0 }
    : { crystals: QUESTS.dailyCrystals, gold: QUESTS.dailyGold, essence: QUESTS.dailyEssence };
  d.currency.crystals += r.crystals;
  d.currency.gold += r.gold;
  d.currency.essence += r.essence;
  return r;
}

export const questsClaimable = (save: Save) =>
  [...save.quests.daily, ...(save.quests.weekly ? [save.quests.weekly] : [])].filter((q) => !q.claimed && q.progress >= (QUEST_MAP[q.id]?.target ?? Infinity)).length;

// ------------------------------------------------------------ misc

export const staminaNow = (save: Save, now: number) => currentStamina(save.stamina, now).value;
export const STAMINA_MAX = STAMINA.max;
export const HUNTER_MAX_STARS = HUNTER.maxStars;
