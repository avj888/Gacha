import { describe, expect, it } from 'vitest';
import { BATTLE } from '../src/config/balance';
import { autoResolve, battleSummary, createBattle, previewOrder, step, unitById } from '../src/engine/battle/battle';
import { computeDamage, elementMod } from '../src/engine/battle/damage';
import type { BattleEvent, BattleSetup, UnitSetup } from '../src/engine/battle/types';
import type { Rng } from '../src/engine/rng';
import type { Element, Stats } from '../src/types';

const seq = (...vals: number[]): Rng => {
  let i = 0;
  return { next: () => vals[i++ % vals.length], state: () => i };
};

const stats = (o: Partial<Stats> = {}): Stats => ({ hp: 1000, atk: 100, def: 50, spd: 100, critRate: 0, critDmg: 0.5, ...o });
const basicOnly = (mult = 1) => ({
  basic: { name: 'Hit', desc: '', effects: [{ type: 'damage' as const, target: 'enemy' as const, mult }] },
  skill: { name: 'Big Hit', desc: '', cooldown: 3, effects: [{ type: 'damage' as const, target: 'enemy' as const, mult: mult * 2 }] },
  ultimate: { name: 'Ult', desc: '', effects: [{ type: 'damage' as const, target: 'allEnemies' as const, mult: mult * 3 }] },
});
const unit = (id: string, o: Partial<Stats> = {}, element: Element = 'rift', extra: Partial<UnitSetup> = {}): UnitSetup => ({
  id, name: id, cls: 'striker', element, portrait: 'R', stats: stats(o), kit: basicOnly(), ...extra,
});

describe('damage formula', () => {
  it('matches ATK * mult * 100/(100+DEF) * element * crit * rand', () => {
    // rng: crit roll 0.99 (no crit), rand roll 0.5 -> 1.0
    const r = computeDamage({ atk: 100, mult: 1.5, def: 100, attElement: 'rift', defElement: 'rift', critRate: 0.2, critDmg: 0.5 }, seq(0.99, 0.5));
    expect(r.amount).toBe(75);
    expect(r.crit).toBe(false);
  });
  it('applies +30% on element advantage and crit damage', () => {
    const r = computeDamage({ atk: 100, mult: 1, def: 0, attElement: 'flame', defElement: 'frost', critRate: 1, critDmg: 0.5 }, seq(0, 0.5));
    expect(r.adv).toBe(true);
    expect(r.crit).toBe(true);
    expect(r.amount).toBe(Math.round(100 * 1.3 * 1.5));
  });
  it('random factor stays within 0.95–1.05', () => {
    const lo = computeDamage({ atk: 1000, mult: 1, def: 0, attElement: 'rift', defElement: 'rift', critRate: 0, critDmg: 0 }, seq(0.9, 0));
    const hi = computeDamage({ atk: 1000, mult: 1, def: 0, attElement: 'rift', defElement: 'rift', critRate: 0, critDmg: 0 }, seq(0.9, 0.99999));
    expect(lo.amount).toBe(950);
    expect(hi.amount).toBe(1050);
  });
  it('ignoreDef reduces effective DEF', () => {
    const a = computeDamage({ atk: 100, mult: 1, def: 100, attElement: 'rift', defElement: 'rift', critRate: 0, critDmg: 0, ignoreDef: 1 }, seq(0.9, 0.5));
    expect(a.amount).toBe(100);
  });
});

describe('element loop', () => {
  it('Flame > Frost > Storm > Flame', () => {
    expect(elementMod('flame', 'frost').adv).toBe(true);
    expect(elementMod('frost', 'storm').adv).toBe(true);
    expect(elementMod('storm', 'flame').adv).toBe(true);
    expect(elementMod('frost', 'flame').adv).toBe(false);
  });
  it('Void and Radiant counter each other; Rift is neutral', () => {
    expect(elementMod('void', 'radiant').adv).toBe(true);
    expect(elementMod('radiant', 'void').adv).toBe(true);
    expect(elementMod('rift', 'void').mod).toBe(1);
    expect(elementMod('flame', 'void').mod).toBe(1);
  });
});

describe('timeline', () => {
  it('faster units act first and a 2x-speed unit acts twice as often', () => {
    const setup: BattleSetup = {
      allies: [unit('fast', { spd: 200, hp: 1e9 })],
      waves: [[unit('slow', { spd: 100, hp: 1e9 })]],
      seed: 1,
    };
    let { state } = createBattle(setup);
    const order: string[] = [];
    for (let i = 0; i < 9; i++) {
      order.push(unitById(state, state.active!)!.id);
      state = step(state, { kind: 'basic' }).state;
    }
    expect(order[0]).toBe('fast');
    expect(order.filter((x) => x === 'fast').length).toBe(6);
    expect(order.filter((x) => x === 'slow').length).toBe(3);
  });
  it('preview order matches actual order when nothing changes speed', () => {
    const setup: BattleSetup = {
      allies: [unit('a', { spd: 130, hp: 1e9 }), unit('b', { spd: 97, hp: 1e9 })],
      waves: [[unit('x', { spd: 111, hp: 1e9 }), unit('y', { spd: 80, hp: 1e9 })]],
      seed: 3,
    };
    let { state } = createBattle(setup);
    const preview = previewOrder(state, 8);
    const actual: string[] = [];
    for (let i = 0; i < 8; i++) {
      actual.push(state.active!);
      state = step(state, { kind: 'basic' }).state;
    }
    expect(actual).toEqual(preview);
  });
});

describe('cooldowns and energy', () => {
  it('skill goes on cooldown for its cooldown in own turns', () => {
    const setup: BattleSetup = { allies: [unit('a', { hp: 1e9 })], waves: [[unit('e', { hp: 1e9, spd: 50 })]], seed: 7 };
    let { state } = createBattle(setup);
    const used: string[] = [];
    for (let i = 0; i < 12; i++) {
      const u = unitById(state, state.active!)!;
      const r = step(state, u.side === 'ally' ? { kind: 'skill' } : { kind: 'basic' });
      if (u.side === 'ally') used.push(r.events.find((e) => e.t === 'action')!.kind as string);
      state = r.state;
    }
    // CD 3 -> skill, basic, basic, skill, ...
    expect(used.slice(0, 7)).toEqual(['skill', 'basic', 'basic', 'skill', 'basic', 'basic', 'skill']);
  });
  it('basic gives energy, ultimate needs full energy and spends it', () => {
    const setup: BattleSetup = { allies: [unit('a', { hp: 1e9 }, 'rift', { startEnergy: 90 })], waves: [[unit('e', { hp: 1e9, spd: 1 })]], seed: 2 };
    let { state } = createBattle(setup);
    const a0 = () => state.units.find((u) => u.uid === 'a0')!;
    // ultimate not allowed below 100 -> falls back to basic
    let r = step(state, { kind: 'ultimate' });
    expect(r.events.find((e) => e.t === 'action')!.kind).toBe('basic');
    state = r.state;
    expect(a0().energy).toBe(Math.min(100, 90 + BATTLE.energyOnBasic));
    r = step(state, { kind: 'ultimate' });
    expect(r.events.find((e) => e.t === 'action')!.kind).toBe('ultimate');
    state = r.state;
    expect(a0().energy).toBe(0);
  });
});

describe('battle flow', () => {
  const setup = (seed: number): BattleSetup => ({
    allies: [unit('hero', { atk: 400, hp: 5000 }), unit('ally', { atk: 300, hp: 4000, spd: 110 })],
    waves: [[unit('m1'), unit('m2')], [unit('m3'), unit('m4')], [unit('boss', { hp: 4000, atk: 120 }, 'rift', { isBoss: true })]],
    seed,
  });

  it('is deterministic for a given seed', () => {
    const a = autoResolve(setup(42));
    const b = autoResolve(setup(42));
    expect(a).toEqual(b);
  });

  it('clears all waves in order and reports a win', () => {
    let { state, events } = createBattle(setup(5));
    const all: BattleEvent[] = [...events];
    let guard = 0;
    while (!state.outcome && guard++ < 1000) {
      const r = step(state, { kind: 'auto' });
      state = r.state;
      all.push(...r.events);
    }
    expect(state.outcome).toBe('win');
    expect(all.filter((e) => e.t === 'wave').map((e) => (e as { wave: number }).wave)).toEqual([1, 2, 3]);
    expect(all[all.length - 1]).toEqual({ t: 'end', outcome: 'win' });
    const sum = battleSummary(state);
    expect(sum.win).toBe(true);
    expect(sum.stars).toBeGreaterThanOrEqual(2);
  });

  it('loses when every ally is KO’d', () => {
    const s = autoResolve({ allies: [unit('weak', { hp: 10, atk: 1 })], waves: [[unit('big', { atk: 1000, hp: 1e6 })]], seed: 1 });
    expect(s.outcome).toBe('lose');
    expect(battleSummary(s).stars).toBe(0);
  });

  it('taunt forces single-target enemy attacks onto the taunter', () => {
    const tauntKit = { ...basicOnly(), skill: { name: 'Taunt', desc: '', cooldown: 3, effects: [{ type: 'taunt' as const, turns: 2 }] } };
    let { state } = createBattle({
      allies: [unit('tank', { hp: 1e9, spd: 150 }, 'rift', { kit: tauntKit }), unit('dps', { hp: 1e9, spd: 10 })],
      waves: [[unit('e', { hp: 1e9, spd: 100 })]],
      seed: 11,
    });
    state = step(state, { kind: 'skill' }).state; // tank taunts
    expect(state.units[0].statuses.some((x) => x.kind === 'taunt')).toBe(true);
    // advance until enemy acts
    while (unitById(state, state.active!)!.side === 'ally') state = step(state, { kind: 'basic' }).state;
    const r = step(state, { kind: 'auto' });
    const hit = r.events.find((e) => e.t === 'damage') as Extract<BattleEvent, { t: 'damage' }>;
    expect(hit.tgt).toBe('a0');
  });

  it('stunned units skip their turn', () => {
    const stunKit = { ...basicOnly(), basic: { name: 'Stun', desc: '', effects: [{ type: 'stun' as const, target: 'enemy' as const, chance: 1, turns: 1 }] } };
    let { state } = createBattle({
      allies: [unit('s', { hp: 1e9, spd: 150 }, 'rift', { kit: stunKit })],
      waves: [[unit('e', { hp: 1e9, spd: 100 })]],
      seed: 3,
    });
    const r = step(state, { kind: 'basic' });
    // enemy would act next but is stunned -> 'stunned' event and the ally is active again
    expect(r.events.some((e) => e.t === 'stunned')).toBe(true);
    expect(r.state.active).toBe('a0');
  });

  it('bound echoes act every 3 rounds', () => {
    const echo = unit('echo', { atk: 50 }, 'rift');
    let { state, events } = createBattle({ allies: [unit('a', { hp: 1e9, atk: 1 })], waves: [[unit('e', { hp: 1e9, atk: 1 })]], echoes: [echo], seed: 9 });
    const all = [...events];
    for (let i = 0; i < 40; i++) {
      const r = step(state, { kind: 'basic' });
      all.push(...r.events);
      state = r.state;
    }
    const rounds = Math.ceil(state.elapsed / 100);
    const echoActs = all.filter((e) => e.t === 'echo').length;
    expect(echoActs).toBe(Math.floor(rounds / 3));
  });

  it('DoTs tick and can KO', () => {
    const dotKit = { ...basicOnly(), basic: { name: 'Burn', desc: '', effects: [{ type: 'dot' as const, target: 'enemy' as const, mult: 1, turns: 3 }] } };
    const s = autoResolve({ allies: [unit('b', { hp: 1e9, atk: 100 }, 'rift', { kit: dotKit })], waves: [[unit('e', { hp: 250, def: 0, atk: 0 })]], seed: 4 });
    expect(s.outcome).toBe('win');
  });
});
