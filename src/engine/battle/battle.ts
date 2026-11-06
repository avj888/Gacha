import { BATTLE } from '../../config/balance';
import type { Ability, BuffStat, Effect, TargetKind } from '../../types';
import { mulberry32, type Rng } from '../rng';
import { computeDamage, elementMod } from './damage';
import type { AbilityKind, BattleAction, BattleEvent, BattleSetup, BattleState, Side, Status, Unit, UnitSetup } from './types';

/** action value that equals one "turn" (round) — a 100-SPD unit acts once per round */
export const ROUND_AV = BATTLE.avBase / 100;

const clone = (s: BattleState): BattleState => ({
  ...s,
  units: s.units.map((u) => ({ ...u, statuses: u.statuses.map((x) => ({ ...x })) })),
  pendingWaves: s.pendingWaves,
});

// ------------------------------------------------------------ stats

export function effStat(u: Unit, stat: BuffStat | 'critDmg'): number {
  const base = u.stats[stat];
  if (stat === 'critDmg') return base;
  let add = 0;
  for (const st of u.statuses) {
    if ((st.kind === 'buff' || st.kind === 'debuff') && st.stat === stat) add += st.kind === 'buff' ? st.amount : -st.amount;
  }
  if (stat === 'critRate') return Math.max(0, Math.min(1, base + add));
  return base * Math.max(0.3, 1 + add);
}

const avFor = (u: Unit) => BATTLE.avBase / Math.max(1, effStat(u, 'spd'));

export const roundOf = (elapsed: number) => Math.max(1, Math.ceil(elapsed / ROUND_AV - 1e-9));
export const currentRound = (s: BattleState) => roundOf(s.elapsed);

// ------------------------------------------------------------ setup

function makeUnit(setup: UnitSetup, side: Side, uid: string, isEcho = false): Unit {
  const u: Unit = {
    ...setup,
    uid,
    side,
    isEcho,
    hp: setup.stats.hp,
    maxHp: setup.stats.hp,
    shield: 0,
    shieldTurns: 0,
    energy: Math.min(BATTLE.energyMax, setup.startEnergy ?? 0),
    cd: 0,
    av: 0,
    statuses: [],
    alive: true,
  };
  u.av = avFor(u);
  return u;
}

export function createBattle(setup: BattleSetup): { state: BattleState; events: BattleEvent[] } {
  const allies = setup.allies.map((a, i) => makeUnit(a, 'ally', `a${i}`));
  const echoes = (setup.echoes ?? []).map((e, i) => makeUnit(e, 'ally', `x${i}`, true));
  const [first, ...rest] = setup.waves;
  const enemies = first.map((e, i) => makeUnit(e, 'enemy', `e${i}`));
  let state: BattleState = {
    units: [...allies, ...echoes, ...enemies],
    pendingWaves: rest,
    wave: 1,
    totalWaves: setup.waves.length,
    elapsed: 0,
    nextEchoRound: BATTLE.echoEvery,
    active: null,
    outcome: null,
    rng: setup.seed >>> 0,
    actions: 0,
    allyUlts: 0,
    uidCounter: enemies.length,
  };
  const events: BattleEvent[] = [{ t: 'wave', wave: 1 }];
  state = advance(state, events);
  return { state, events };
}

// ------------------------------------------------------------ queries

export const living = (s: BattleState, side: Side) => s.units.filter((u) => u.alive && u.side === side && !u.isEcho);
export const unitById = (s: BattleState, uid: string) => s.units.find((u) => u.uid === uid);
const opp = (side: Side): Side => (side === 'ally' ? 'enemy' : 'ally');
const has = (u: Unit, kind: Status['kind']) => u.statuses.some((x) => x.kind === kind);
const isDebuffed = (u: Unit) => u.statuses.some((x) => x.kind === 'debuff' || x.kind === 'dot' || x.kind === 'stun');

export function abilityOf(u: Unit, kind: AbilityKind): Ability {
  return u.kit[kind];
}

export function canUse(u: Unit, kind: AbilityKind): boolean {
  if (kind === 'basic') return true;
  if (kind === 'skill') return u.cd <= 0;
  return u.energy >= BATTLE.energyMax;
}

/** Targets an ally may pick for a single-target attack (taunt respected). */
export function validTargets(s: BattleState, attacker: Unit): Unit[] {
  const foes = living(s, opp(attacker.side));
  const taunters = foes.filter((f) => has(f, 'taunt'));
  return taunters.length ? taunters : foes;
}

/** Predict the next `n` actors from the current timeline (ignores future speed changes). */
export function previewOrder(s: BattleState, n = BATTLE.timelinePreview): string[] {
  const sim = s.units.filter((u) => u.alive && !u.isEcho).map((u) => ({ uid: u.uid, av: u.av, step: avFor(u), side: u.side }));
  const out: string[] = [];
  if (s.active) {
    out.push(s.active);
    const a = sim.find((x) => x.uid === s.active);
    if (a) a.av = a.step;
  }
  while (out.length < n && sim.length) {
    sim.sort(orderCmp);
    const next = sim[0];
    const d = next.av;
    for (const x of sim) x.av -= d;
    out.push(next.uid);
    next.av = next.step;
  }
  return out;
}

function orderCmp(a: { av: number; side: Side; uid: string }, b: { av: number; side: Side; uid: string }) {
  if (Math.abs(a.av - b.av) > 1e-9) return a.av - b.av;
  if (a.side !== b.side) return a.side === 'ally' ? -1 : 1;
  return a.uid < b.uid ? -1 : 1;
}

// ------------------------------------------------------------ AI

export function chooseAction(s: BattleState, u: Unit): { kind: AbilityKind; target?: string } {
  const allies = living(s, u.side);
  let kind: AbilityKind = 'basic';
  if (canUse(u, 'ultimate')) kind = 'ultimate';
  else if (canUse(u, 'skill')) {
    const sk = u.kit.skill;
    const healsOnly = sk.effects.every((e) => e.type === 'heal' || e.type === 'cleanse' || e.type === 'shield' || e.type === 'energy');
    const taunts = sk.effects.some((e) => e.type === 'taunt');
    const hurt = allies.some((a) => a.hp / a.maxHp < 0.75);
    if (healsOnly && !hurt) kind = 'basic';
    else if (taunts && has(u, 'taunt')) kind = 'basic';
    else kind = 'skill';
  }
  return { kind, target: pickTarget(s, u)?.uid };
}

function pickTarget(s: BattleState, u: Unit, rng?: Rng): Unit | undefined {
  const pool = validTargets(s, u);
  if (!pool.length) return undefined;
  if (u.side === 'enemy' && rng) {
    // enemies: mostly random, with a pull toward wounded targets
    const weights = pool.map((p) => 1 + (1 - p.hp / p.maxHp) * 1.5);
    let r = rng.next() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < pool.length; i++) {
      r -= weights[i];
      if (r <= 0) return pool[i];
    }
    return pool[pool.length - 1];
  }
  // allies: prefer element advantage, then lowest HP
  return [...pool].sort((a, b) => {
    const aa = elementMod(u.element, a.element).adv ? 0 : 1;
    const bb = elementMod(u.element, b.element).adv ? 0 : 1;
    return aa - bb || a.hp - b.hp;
  })[0];
}

// ------------------------------------------------------------ effects

function resolveTargets(s: BattleState, src: Unit, kind: TargetKind, primary: Unit | undefined, rng: Rng, hits = 1): Unit[] {
  const foes = living(s, opp(src.side));
  const friends = living(s, src.side);
  switch (kind) {
    case 'enemy':
      return primary && primary.alive ? Array(hits).fill(primary) : [];
    case 'allEnemies':
      return foes;
    case 'randomEnemies': {
      const out: Unit[] = [];
      for (let i = 0; i < hits; i++) {
        const alive = foes.filter((f) => f.alive);
        if (!alive.length) break;
        out.push(alive[Math.floor(rng.next() * alive.length)]);
      }
      return out;
    }
    case 'self':
      return src.isEcho ? [] : [src];
    case 'lowestAlly':
      return friends.length ? [friends.reduce((a, b) => (a.hp / a.maxHp <= b.hp / b.maxHp ? a : b))] : [];
    case 'allAllies':
      return friends;
  }
}

function dealDamage(_s: BattleState, src: Unit, tgt: Unit, amount: number, ev: BattleEvent[], meta: { crit: boolean; adv: boolean; dot?: boolean }) {
  if (!tgt.alive) return;
  let absorbed = 0;
  if (tgt.shield > 0) {
    absorbed = Math.min(tgt.shield, amount);
    tgt.shield -= absorbed;
  }
  const dmg = amount - absorbed;
  tgt.hp = Math.max(0, tgt.hp - dmg);
  ev.push({ t: 'damage', src: src.uid, tgt: tgt.uid, amount, absorbed, ...meta });
  if (!meta.dot) tgt.energy = Math.min(BATTLE.energyMax, tgt.energy + BATTLE.energyOnHit);
  if (tgt.hp <= 0) {
    tgt.alive = false;
    tgt.statuses = [];
    tgt.shield = 0;
    ev.push({ t: 'ko', uid: tgt.uid });
    if (!src.isEcho && src.alive) src.energy = Math.min(BATTLE.energyMax, src.energy + BATTLE.energyOnKill);
  }
}

function addStatus(tgt: Unit, st: Status) {
  // same kind+stat refreshes instead of stacking
  const i = tgt.statuses.findIndex((x) => x.kind === st.kind && ('stat' in x ? x.stat : '') === ('stat' in st ? st.stat : ''));
  if (i >= 0) {
    const cur = tgt.statuses[i];
    if (st.kind === 'dot' && cur.kind === 'dot') tgt.statuses[i] = { ...st, dmg: Math.max(st.dmg, cur.dmg), turns: Math.max(st.turns, cur.turns) };
    else if ((st.kind === 'buff' || st.kind === 'debuff') && (cur.kind === 'buff' || cur.kind === 'debuff'))
      tgt.statuses[i] = { ...st, amount: Math.max(st.amount, cur.amount), turns: Math.max(st.turns, cur.turns) };
    else tgt.statuses[i] = { ...st, turns: Math.max(st.turns, cur.turns) };
  } else tgt.statuses.push(st);
}

function applyEffect(s: BattleState, src: Unit, e: Effect, primary: Unit | undefined, rng: Rng, ev: BattleEvent[]) {
  const atk = effStat(src, 'atk');
  switch (e.type) {
    case 'damage': {
      for (const tgt of resolveTargets(s, src, e.target, primary, rng, e.hits)) {
        if (!tgt.alive) continue;
        const mult = e.mult * (e.bonusVsDebuffed && isDebuffed(tgt) ? 1 + e.bonusVsDebuffed : 1);
        const r = computeDamage(
          { atk, mult, def: effStat(tgt, 'def'), attElement: src.element, defElement: tgt.element, critRate: effStat(src, 'critRate'), critDmg: effStat(src, 'critDmg'), ignoreDef: e.ignoreDef },
          rng,
        );
        dealDamage(s, src, tgt, r.amount, ev, { crit: r.crit, adv: r.adv });
      }
      break;
    }
    case 'heal': {
      for (const tgt of resolveTargets(s, src, e.target, primary, rng)) {
        const base = e.of === 'maxHp' ? tgt.maxHp : atk;
        const amt = Math.round(base * e.mult);
        const real = Math.min(amt, tgt.maxHp - tgt.hp);
        tgt.hp += real;
        ev.push({ t: 'heal', tgt: tgt.uid, amount: amt });
      }
      break;
    }
    case 'shield': {
      for (const tgt of resolveTargets(s, src, e.target, primary, rng)) {
        const base = e.of === 'atk' ? atk : tgt.maxHp;
        const amt = Math.round(base * e.mult);
        tgt.shield = Math.max(tgt.shield, amt);
        tgt.shieldTurns = Math.max(tgt.shieldTurns, e.turns);
        ev.push({ t: 'shield', tgt: tgt.uid, amount: amt });
      }
      break;
    }
    case 'buff': {
      for (const tgt of resolveTargets(s, src, e.target, primary, rng)) {
        addStatus(tgt, { kind: 'buff', stat: e.stat, amount: e.amount, turns: e.turns, fresh: tgt === src });
        ev.push({ t: 'status', tgt: tgt.uid, kind: 'buff', stat: e.stat });
      }
      break;
    }
    case 'debuff':
    case 'dot':
    case 'stun': {
      for (const tgt of resolveTargets(s, src, e.target, primary, rng)) {
        if (!tgt.alive) continue;
        const ch = (e.chance ?? 1) * (tgt.isBoss && e.type === 'stun' ? 0.5 : 1);
        if (rng.next() >= ch) {
          if (e.type === 'stun') ev.push({ t: 'status', tgt: tgt.uid, kind: 'stun', resisted: true });
          continue;
        }
        if (e.type === 'debuff') {
          addStatus(tgt, { kind: 'debuff', stat: e.stat, amount: e.amount, turns: e.turns });
          ev.push({ t: 'status', tgt: tgt.uid, kind: 'debuff', stat: e.stat });
        } else if (e.type === 'dot') {
          addStatus(tgt, { kind: 'dot', dmg: Math.max(1, Math.round(atk * e.mult)), turns: e.turns });
          ev.push({ t: 'status', tgt: tgt.uid, kind: 'dot' });
        } else {
          addStatus(tgt, { kind: 'stun', turns: e.turns });
          ev.push({ t: 'status', tgt: tgt.uid, kind: 'stun' });
        }
      }
      break;
    }
    case 'taunt': {
      if (src.isEcho) break;
      addStatus(src, { kind: 'taunt', turns: e.turns, fresh: true });
      ev.push({ t: 'status', tgt: src.uid, kind: 'taunt' });
      break;
    }
    case 'energy': {
      for (const tgt of resolveTargets(s, src, e.target, primary, rng)) {
        tgt.energy = Math.min(BATTLE.energyMax, tgt.energy + e.amount);
        ev.push({ t: 'energy', tgt: tgt.uid, amount: e.amount });
      }
      break;
    }
    case 'cleanse': {
      for (const tgt of resolveTargets(s, src, e.target, primary, rng)) {
        const before = tgt.statuses.length;
        tgt.statuses = tgt.statuses.filter((x) => x.kind !== 'debuff' && x.kind !== 'dot' && x.kind !== 'stun');
        if (tgt.statuses.length !== before) ev.push({ t: 'cleanse', tgt: tgt.uid });
      }
      break;
    }
  }
}

function useAbility(s: BattleState, u: Unit, kind: AbilityKind, targetUid: string | undefined, rng: Rng, ev: BattleEvent[]) {
  const ab = abilityOf(u, kind);
  ev.push({ t: 'action', uid: u.uid, kind, name: ab.name });
  const pool = validTargets(s, u);
  let primary = targetUid ? pool.find((p) => p.uid === targetUid) : undefined;
  if (!primary) primary = pickTarget(s, u, rng);
  for (const e of ab.effects) applyEffect(s, u, e, primary, rng, ev);
  if (u.isEcho) return;
  if (kind === 'basic') u.energy = Math.min(BATTLE.energyMax, u.energy + BATTLE.energyOnBasic);
  if (kind === 'skill') {
    u.energy = Math.min(BATTLE.energyMax, u.energy + BATTLE.energyOnSkill);
    u.cd = ab.cooldown ?? 0;
  }
  if (kind === 'ultimate') {
    u.energy = 0;
    if (u.side === 'ally') s.allyUlts += 1;
  }
}

// ------------------------------------------------------------ turn flow

function endOfTurn(u: Unit) {
  for (const st of u.statuses) {
    if (st.fresh) st.fresh = false;
    else st.turns -= 1;
  }
  u.statuses = u.statuses.filter((st) => st.turns > 0);
  if (u.shieldTurns > 0) {
    u.shieldTurns -= 1;
    if (u.shieldTurns === 0) u.shield = 0;
  }
}

function checkEnd(s: BattleState, ev: BattleEvent[]): boolean {
  if (s.outcome) return true;
  if (living(s, 'ally').length === 0) {
    s.outcome = 'lose';
    s.active = null;
    ev.push({ t: 'end', outcome: 'lose' });
    return true;
  }
  if (living(s, 'enemy').length === 0) {
    const next = s.pendingWaves[0];
    if (!next) {
      s.outcome = 'win';
      s.active = null;
      ev.push({ t: 'end', outcome: 'win' });
      return true;
    }
    s.pendingWaves = s.pendingWaves.slice(1);
    s.units = s.units.filter((u) => u.side === 'ally');
    for (const e of next) {
      const u = makeUnit(e, 'enemy', `e${s.uidCounter++}`);
      s.units.push(u);
    }
    s.wave += 1;
    ev.push({ t: 'wave', wave: s.wave });
  }
  return false;
}

/** Move the timeline forward until a unit that can act is active (resolving DoTs, stuns, echoes). */
function advance(s: BattleState, ev: BattleEvent[]): BattleState {
  const rng = mulberry32(s.rng);
  for (let guard = 0; guard < 1000; guard++) {
    if (checkEnd(s, ev)) break;
    if (currentRound(s) > BATTLE.maxTurns) {
      s.outcome = 'lose';
      s.active = null;
      ev.push({ t: 'end', outcome: 'lose' });
      break;
    }
    const actors = s.units.filter((u) => u.alive && !u.isEcho).sort(orderCmp);
    const next = actors[0];
    const d = next.av;
    const nextElapsed = s.elapsed + d;

    // echoes act at the start of every Nth round
    if (roundOf(nextElapsed) >= s.nextEchoRound && s.units.some((u) => u.isEcho)) {
      s.nextEchoRound += BATTLE.echoEvery;
      for (const echo of s.units.filter((u) => u.isEcho)) {
        if (!living(s, 'enemy').length) break;
        ev.push({ t: 'echo', uid: echo.uid });
        useAbility(s, echo, 'skill', undefined, rng, ev);
      }
      continue; // re-check end / wave
    }
    if (roundOf(nextElapsed) >= s.nextEchoRound) s.nextEchoRound += BATTLE.echoEvery;

    for (const u of actors) u.av -= d;
    s.elapsed = nextElapsed;

    // start of turn: cooldown tick, DoT, stun
    if (next.cd > 0) next.cd -= 1;
    const dots = next.statuses.filter((x): x is Extract<Status, { kind: 'dot' }> => x.kind === 'dot');
    for (const dt of dots) dealDamage(s, next, next, dt.dmg, ev, { crit: false, adv: false, dot: true });
    if (!next.alive) {
      continue;
    }
    if (has(next, 'stun')) {
      ev.push({ t: 'stunned', uid: next.uid });
      endOfTurn(next);
      next.av = avFor(next);
      continue;
    }
    s.active = next.uid;
    ev.push({ t: 'turn', uid: next.uid });
    break;
  }
  s.rng = rng.state();
  return s;
}

/**
 * Pure reducer: resolve the active unit's action, then advance to the next actor.
 * `auto` uses the AI for the active unit (enemies always act with `auto`).
 */
export function step(prev: BattleState, action: BattleAction): { state: BattleState; events: BattleEvent[] } {
  if (prev.outcome || !prev.active) return { state: prev, events: [] };
  const s = clone(prev);
  const ev: BattleEvent[] = [];
  const u = unitById(s, s.active!)!;
  const rng = mulberry32(s.rng);

  let kind: AbilityKind;
  let target: string | undefined;
  if (action.kind === 'auto') ({ kind, target } = chooseAction(s, u));
  else {
    kind = action.kind;
    target = action.target;
  }
  if (!canUse(u, kind)) kind = 'basic';
  if (u.side === 'enemy') target = undefined; // enemy AI picks its own target (weighted random)

  useAbility(s, u, kind, target, rng, ev);
  s.actions += 1;
  endOfTurn(u);
  u.av = avFor(u);
  s.active = null;
  s.rng = rng.state();
  advance(s, ev);
  return { state: s, events: ev };
}

/** Run a battle to completion with AI on both sides (used by tests and sweep). */
export function autoResolve(setup: BattleSetup) {
  let { state } = createBattle(setup);
  let guard = 0;
  while (!state.outcome && guard++ < 5000) state = step(state, { kind: 'auto' }).state;
  return state;
}

export function battleSummary(s: BattleState) {
  const allies = s.units.filter((u) => u.side === 'ally' && !u.isEcho);
  const kos = allies.filter((u) => !u.alive).length;
  const rounds = currentRound(s);
  const win = s.outcome === 'win';
  const stars = !win ? 0 : 1 + (kos === 0 ? 1 : 0) + (rounds < BATTLE.threeStarTurnLimit ? 1 : 0);
  return { win, kos, rounds, stars };
}
