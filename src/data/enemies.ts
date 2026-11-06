import { GATES } from '../config/balance';
import type { Ability, HunterElement, Stats } from '../types';
import type { UnitKit, UnitSetup } from '../engine/battle/types';

const ab = (name: string, desc: string, effects: Ability['effects'], cooldown?: number): Ability => ({ name, desc, effects, cooldown });

interface MobArchetype {
  key: string;
  name: string;
  element: HunterElement;
  shape: Partial<Stats>;
  kit: UnitKit;
}

/** Rift creatures — common wave enemies */
export const MOBS: MobArchetype[] = [
  {
    key: 'cinderhound', name: 'Cinder Hound', element: 'flame', shape: { atk: 1.1, spd: 1.08 },
    kit: {
      basic: ab('Scorch Bite', '', [{ type: 'damage', target: 'enemy', mult: 1.0 }]),
      skill: ab('Ember Lunge', '', [{ type: 'damage', target: 'enemy', mult: 1.4 }, { type: 'dot', target: 'enemy', mult: 0.25, turns: 2, chance: 0.5 }], 3),
      ultimate: ab('Blaze Howl', '', [{ type: 'damage', target: 'allEnemies', mult: 1.0 }]),
    },
  },
  {
    key: 'rimecrawler', name: 'Rime Crawler', element: 'frost', shape: { hp: 1.2, def: 1.2, spd: 0.92 },
    kit: {
      basic: ab('Frost Pincer', '', [{ type: 'damage', target: 'enemy', mult: 0.95 }]),
      skill: ab('Hoarfrost Shell', '', [{ type: 'shield', target: 'self', mult: 0.2, of: 'maxHp', turns: 2 }], 3),
      ultimate: ab('Glacial Spit', '', [{ type: 'damage', target: 'enemy', mult: 1.6 }, { type: 'debuff', target: 'enemy', stat: 'spd', amount: 0.2, turns: 2 }]),
    },
  },
  {
    key: 'voltwisp', name: 'Volt Wisp', element: 'storm', shape: { hp: 0.8, atk: 1.15, spd: 1.15 },
    kit: {
      basic: ab('Spark Touch', '', [{ type: 'damage', target: 'enemy', mult: 1.0 }]),
      skill: ab('Arc Flicker', '', [{ type: 'damage', target: 'randomEnemies', mult: 0.6, hits: 2 }], 3),
      ultimate: ab('Discharge', '', [{ type: 'damage', target: 'allEnemies', mult: 0.9 }, { type: 'stun', target: 'enemy', chance: 0.2, turns: 1 }]),
    },
  },
  {
    key: 'hollowstalker', name: 'Hollow Stalker', element: 'void', shape: { atk: 1.2, def: 0.85, spd: 1.05 },
    kit: {
      basic: ab('Null Claw', '', [{ type: 'damage', target: 'enemy', mult: 1.0 }]),
      skill: ab('Unmake', '', [{ type: 'damage', target: 'enemy', mult: 1.5, ignoreDef: 0.2 }], 3),
      ultimate: ab('Devour Light', '', [{ type: 'damage', target: 'enemy', mult: 2.0 }]),
    },
  },
  {
    key: 'gleammoth', name: 'Gleam Moth', element: 'radiant', shape: { hp: 0.9, atk: 0.95, spd: 1.1 },
    kit: {
      basic: ab('Dust Wing', '', [{ type: 'damage', target: 'enemy', mult: 0.95 }]),
      skill: ab('Dazzle', '', [{ type: 'debuff', target: 'enemy', stat: 'atk', amount: 0.2, turns: 2 }, { type: 'damage', target: 'enemy', mult: 0.8 }], 3),
      ultimate: ab('Lumen Storm', '', [{ type: 'damage', target: 'allEnemies', mult: 0.9 }]),
    },
  },
  {
    key: 'slagbrute', name: 'Slag Brute', element: 'flame', shape: { hp: 1.35, atk: 1.05, def: 1.1, spd: 0.88 },
    kit: {
      basic: ab('Molten Fist', '', [{ type: 'damage', target: 'enemy', mult: 1.05 }]),
      skill: ab('Slag Slam', '', [{ type: 'damage', target: 'allEnemies', mult: 0.7 }], 4),
      ultimate: ab('Eruption', '', [{ type: 'damage', target: 'allEnemies', mult: 1.1 }]),
    },
  },
  {
    key: 'stormgull', name: 'Stormgull', element: 'storm', shape: { hp: 0.85, atk: 1.05, spd: 1.2 },
    kit: {
      basic: ab('Dive Peck', '', [{ type: 'damage', target: 'enemy', mult: 1.0 }]),
      skill: ab('Squall', '', [{ type: 'debuff', target: 'allEnemies', stat: 'spd', amount: 0.1, turns: 2 }], 4),
      ultimate: ab('Thunder Dive', '', [{ type: 'damage', target: 'enemy', mult: 1.8 }]),
    },
  },
  {
    key: 'shardwraith', name: 'Shard Wraith', element: 'frost', shape: { hp: 0.9, atk: 1.2, def: 0.9 },
    kit: {
      basic: ab('Ice Shard', '', [{ type: 'damage', target: 'enemy', mult: 1.0 }]),
      skill: ab('Splinter', '', [{ type: 'damage', target: 'randomEnemies', mult: 0.55, hits: 3 }], 3),
      ultimate: ab('Whiteout', '', [{ type: 'damage', target: 'allEnemies', mult: 1.0 }]),
    },
  },
];

interface BossArchetype {
  key: string;
  name: string;
  element: HunterElement;
  kit: UnitKit;
}

/** Gate bosses — each gate's boss can be bound once as an Echo. */
export const BOSSES: BossArchetype[] = [
  { key: 'ashmaw', name: 'Ashmaw', element: 'flame', kit: bossKit('Cinder Crush', 'Kiln Breath', 'Ashfall', 'flame') },
  { key: 'gloamwyrm', name: 'Gloamwyrm', element: 'void', kit: bossKit('Gloam Fang', 'Hungering Dark', 'Abyssal Coil', 'void') },
  { key: 'tidewarden', name: 'Rimeback Colossus', element: 'frost', kit: bossKit('Glacier Fist', 'Frost Ward', 'Avalanche', 'frost') },
  { key: 'stormcrown', name: 'The Stormcrown', element: 'storm', kit: bossKit('Bolt Lash', 'Static Halo', 'Skyfracture', 'storm') },
  { key: 'haloeater', name: 'Halo-Eater', element: 'radiant', kit: bossKit('Searing Gaze', 'Blinding Choir', 'Sunfall', 'radiant') },
  { key: 'pyrecaller', name: 'Pyre Matron', element: 'flame', kit: bossKit('Brand', 'Pyre Hymn', 'Conflagration', 'flame') },
  { key: 'frostjaw', name: 'Old Frostjaw', element: 'frost', kit: bossKit('Gnaw', 'Cold Snap', 'Deep Winter', 'frost') },
  { key: 'thunderhulk', name: 'Thunderhulk', element: 'storm', kit: bossKit('Hammerfall', 'Overcharge', 'Grand Surge', 'storm') },
  { key: 'nullpriest', name: 'The Null Priest', element: 'void', kit: bossKit('Void Rite', 'Unmaking Sermon', 'Last Rite', 'void') },
  { key: 'lumenknight', name: 'Lumen Knight', element: 'radiant', kit: bossKit('Lance of Dawn', 'Gleaming Aegis', 'Judgement Hour', 'radiant') },
];

function bossKit(b: string, s: string, u: string, el: HunterElement): UnitKit {
  const flavor: Record<HunterElement, Ability['effects']> = {
    flame: [{ type: 'dot', target: 'allEnemies', mult: 0.25, turns: 2, chance: 0.6 }],
    frost: [{ type: 'debuff', target: 'allEnemies', stat: 'spd', amount: 0.15, turns: 2 }],
    storm: [{ type: 'stun', target: 'enemy', chance: 0.35, turns: 1 }],
    void: [{ type: 'debuff', target: 'allEnemies', stat: 'def', amount: 0.15, turns: 2 }],
    radiant: [{ type: 'heal', target: 'self', mult: 0.08, of: 'maxHp' }],
  };
  return {
    basic: ab(b, 'Hits one target.', [{ type: 'damage', target: 'enemy', mult: 1.0 }]),
    skill: ab(s, 'Strikes all foes with an elemental effect.', [{ type: 'damage', target: 'allEnemies', mult: 0.65 }, ...flavor[el]], 3),
    ultimate: ab(u, 'Devastating attack on all foes.', [{ type: 'damage', target: 'allEnemies', mult: 1.25 }]),
  };
}

// ------------------------------------------------------------ scaling

export function enemyStats(g: number, shape: Partial<Stats> = {}, mult = 1): Stats {
  const b = GATES.enemyBase;
  const f = (1 + GATES.enemyGrowth * Math.pow(g, GATES.enemyGrowthExp)) * mult;
  return {
    hp: Math.round(b.hp * f * (shape.hp ?? 1)),
    atk: Math.round(b.atk * f * (shape.atk ?? 1)),
    def: Math.round(b.def * Math.pow(f, GATES.enemyDefExp) * (shape.def ?? 1)),
    spd: Math.round((b.spd + g * 0.35) * (shape.spd ?? 1)),
    critRate: b.critRate + Math.min(0.15, g * 0.003),
    critDmg: b.critDmg,
  };
}

export function mobUnit(m: MobArchetype, g: number, mult = 1): UnitSetup {
  return { id: m.key, name: m.name, cls: 'beast', element: m.element, portrait: 'R', stats: enemyStats(g, m.shape, mult), kit: m.kit };
}

export function bossUnit(b: BossArchetype, g: number, mult = 1, title?: string): UnitSetup {
  const s = enemyStats(g, {}, mult);
  return {
    id: b.key,
    name: title ?? b.name,
    cls: 'boss',
    element: b.element,
    portrait: 'boss',
    isBoss: true,
    stats: { ...s, hp: Math.round(s.hp * GATES.bossHpMult), atk: Math.round(s.atk * GATES.bossAtkMult), spd: s.spd + 4 },
    kit: b.kit,
  };
}
