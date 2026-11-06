import type { Ability, Effect, Figure, HunterClass, HunterDef, HunterElement, Kit, Passive, Rarity, Stats } from '../types';
import { HUNTER } from '../config/balance';

// ---------- tiny effect helpers ----------
const dmg = (mult: number, target: 'enemy' | 'allEnemies' | 'randomEnemies' = 'enemy', extra: Partial<Extract<Effect, { type: 'damage' }>> = {}): Effect => ({
  type: 'damage',
  target,
  mult,
  ...extra,
});
const heal = (mult: number, target: 'self' | 'lowestAlly' | 'allAllies', of: 'atk' | 'maxHp' = 'atk'): Effect => ({ type: 'heal', target, mult, of });
const shield = (mult: number, target: 'self' | 'lowestAlly' | 'allAllies', turns = 2, of: 'atk' | 'maxHp' = 'maxHp'): Effect => ({ type: 'shield', target, mult, of, turns });
const buff = (stat: 'atk' | 'def' | 'spd' | 'critRate', amount: number, target: 'self' | 'lowestAlly' | 'allAllies', turns = 2): Effect => ({ type: 'buff', stat, amount, target, turns });
const debuff = (stat: 'atk' | 'def' | 'spd' | 'critRate', amount: number, target: 'enemy' | 'allEnemies', turns = 2, chance = 1): Effect => ({ type: 'debuff', stat, amount, target, turns, chance });
const dot = (mult: number, target: 'enemy' | 'allEnemies', turns = 2, chance = 1): Effect => ({ type: 'dot', mult, target, turns, chance });
const stun = (chance: number, target: 'enemy' | 'allEnemies' = 'enemy', turns = 1): Effect => ({ type: 'stun', chance, target, turns });
const taunt = (turns = 2): Effect => ({ type: 'taunt', turns });
const energy = (amount: number, target: 'self' | 'allAllies' | 'lowestAlly'): Effect => ({ type: 'energy', amount, target });
const cleanse = (target: 'self' | 'allAllies' | 'lowestAlly'): Effect => ({ type: 'cleanse', target });

const ab = (name: string, desc: string, effects: Effect[], cooldown?: number): Ability => ({ name, desc, effects, cooldown });
const pas = (name: string, desc: string, p: Omit<Passive, 'name' | 'desc'>): Passive => ({ name, desc, ...p });

// ---------- stat profiles ----------
const R_BASE: Stats = { hp: 900, atk: 95, def: 60, spd: 100, critRate: 0.05, critDmg: 0.5 };
const CLASS_PROFILE: Record<HunterClass, Stats> = {
  striker: { hp: 1.0, atk: 1.1, def: 1.0, spd: 1.0, critRate: 0.1, critDmg: 0.6 },
  assassin: { hp: 0.8, atk: 1.25, def: 0.75, spd: 1.15, critRate: 0.2, critDmg: 0.8 },
  ranger: { hp: 0.85, atk: 1.15, def: 0.8, spd: 1.08, critRate: 0.15, critDmg: 0.7 },
  mage: { hp: 0.8, atk: 1.2, def: 0.75, spd: 1.0, critRate: 0.1, critDmg: 0.6 },
  tank: { hp: 1.45, atk: 0.75, def: 1.5, spd: 0.92, critRate: 0.05, critDmg: 0.5 },
  healer: { hp: 1.05, atk: 0.9, def: 0.95, spd: 1.04, critRate: 0.05, critDmg: 0.5 },
};

function baseStats(cls: HunterClass, rarity: Rarity, tweak: Partial<Stats> = {}): Stats {
  const p = CLASS_PROFILE[cls];
  const m = HUNTER.rarityStatMult[rarity];
  const s: Stats = {
    hp: Math.round(R_BASE.hp * p.hp * m),
    atk: Math.round(R_BASE.atk * p.atk * m),
    def: Math.round(R_BASE.def * p.def * m),
    spd: Math.round(R_BASE.spd * p.spd + (rarity === 'MR' ? 9 : rarity === 'SSR' ? 6 : rarity === 'SR' ? 3 : 0)),
    critRate: p.critRate,
    critDmg: p.critDmg,
  };
  for (const k of Object.keys(tweak) as (keyof Stats)[]) {
    const v = tweak[k]!;
    s[k] = k === 'critRate' || k === 'critDmg' ? s[k] + v : Math.round(s[k] * (1 + v));
  }
  return s;
}

interface Spec {
  id: string;
  name: string;
  title: string;
  bio: string;
  rarity: Rarity;
  cls: HunterClass;
  element: HunterElement;
  tweak?: Partial<Stats>;
  kit: Kit;
}

const make = (s: Spec): HunterDef => ({
  id: s.id,
  name: s.name,
  title: s.title,
  bio: s.bio,
  rarity: s.rarity,
  figure: FIGURE[s.id] ?? 'm',
  cls: s.cls,
  element: s.element,
  base: baseStats(s.cls, s.rarity, s.tweak),
  kit: s.kit,
});

// =========================================================== SSR
const SSR: Spec[] = [
  {
    id: 'ssr-isolde', name: 'Isolde Varkas', title: 'The Quiet Eclipse', rarity: 'SSR', cls: 'assassin', element: 'void',
    bio: 'Walked out of a collapsed Rift alone and never spoke of the six who did not.',
    kit: {
      basic: ab('Hush Cut', 'Strike one enemy for 100% ATK.', [dmg(1.0)]),
      skill: ab('Umbral Step', 'Deal 220% ATK to one enemy, ignoring 30% DEF.', [dmg(2.2, 'enemy', { ignoreDef: 0.3 })], 3),
      ultimate: ab('Total Eclipse', 'Deal 420% ATK to one enemy, +50% vs debuffed targets; gain 15% crit for 2 turns.', [dmg(4.2, 'enemy', { bonusVsDebuffed: 0.5 }), buff('critRate', 0.15, 'self')]),
      passives: [
        pas('Silent Hours', '+12% ATK.', { stats: { atk: 0.12 } }),
        pas('Null Lantern', 'Start battle with 40 energy.', { startEnergy: 40 }),
        pas('Event Horizon', '+20% Crit DMG, +8% SPD.', { stats: { critDmg: 0.2, spd: 0.08 } }),
      ],
    },
  },
  {
    id: 'ssr-ren', name: 'Ren Okafor', title: 'Stormbreaker', rarity: 'SSR', cls: 'striker', element: 'storm',
    bio: 'A former lineman who caught a Rift-bolt bare-handed and kept the current.',
    kit: {
      basic: ab('Arc Jab', 'Hit one enemy for 110% ATK.', [dmg(1.1)]),
      skill: ab('Live Wire', '150% ATK to one enemy, 60% chance to stun for 1 turn.', [dmg(1.5), stun(0.6)], 3),
      ultimate: ab('Grid Collapse', '230% ATK to all enemies and lower their SPD by 20% for 2 turns.', [dmg(2.3, 'allEnemies'), debuff('spd', 0.2, 'allEnemies')]),
      passives: [
        pas('Grounded', '+10% ATK, +10% HP.', { stats: { atk: 0.1, hp: 0.1 } }),
        pas('Static Field', 'Team gains +6% SPD.', { teamStats: { spd: 0.06 } }),
        pas('Overload', '+15% ATK, +10% Crit Rate.', { stats: { atk: 0.15, critRate: 0.1 } }),
      ],
    },
  },
  {
    id: 'ssr-mireille', name: 'Mireille Sol', title: 'Dawnwarden', rarity: 'SSR', cls: 'healer', element: 'radiant',
    bio: 'Keeps a lighthouse on the edge of the Sundered Quarter, and keeps it lit.',
    kit: {
      basic: ab('Beacon Shot', 'Deal 90% ATK to one enemy.', [dmg(0.9)]),
      skill: ab('Tidelight', 'Heal all allies for 120% ATK and cleanse debuffs.', [heal(1.2, 'allAllies'), cleanse('allAllies')], 3),
      ultimate: ab('First Light', 'Heal all allies for 200% ATK, shield them for 12% max HP, +20% ATK for 2 turns.', [heal(2.0, 'allAllies'), shield(0.12, 'allAllies'), buff('atk', 0.2, 'allAllies')]),
      passives: [
        pas('Keeper’s Vigil', '+12% HP.', { stats: { hp: 0.12 } }),
        pas('Long Night Over', 'Team gains +8% DEF.', { teamStats: { def: 0.08 } }),
        pas('Undimmed', '+15% ATK, start with 30 energy.', { stats: { atk: 0.15 }, startEnergy: 30 }),
      ],
    },
  },
  {
    id: 'ssr-tavish', name: 'Tavish Crane', title: 'The Glacier Wall', rarity: 'SSR', cls: 'tank', element: 'frost',
    bio: 'Held the Harbor Bridge for nine hours. The ice he left is still there.',
    kit: {
      basic: ab('Rime Bash', 'Hit one enemy for 115% ATK.', [dmg(1.15)]),
      skill: ab('Permafrost Stance', 'Taunt for 2 turns and shield self for 25% max HP.', [taunt(2), shield(0.25, 'self')], 3),
      ultimate: ab('Ice Age', 'Deal 160% ATK to all enemies, lower their ATK by 25%, shield the team for 15% max HP.', [dmg(1.6, 'allEnemies'), debuff('atk', 0.25, 'allEnemies'), shield(0.15, 'allAllies')]),
      passives: [
        pas('Cold Iron', '+15% DEF.', { stats: { def: 0.15 } }),
        pas('Bridgehold', 'Team gains +10% HP.', { teamStats: { hp: 0.1 } }),
        pas('Unthawed', '+20% HP, +15% DEF.', { stats: { hp: 0.2, def: 0.15 } }),
      ],
    },
  },
];

// =========================================================== SR
const SR: Spec[] = [
  {
    id: 'sr-kasimir', name: 'Kasimir Dray', title: 'Cinderbolt', rarity: 'SR', cls: 'ranger', element: 'flame',
    bio: 'Tips his bolts in foundry slag. Says it is cheaper than ammunition.',
    kit: {
      basic: ab('Hot Bolt', '100% ATK to one enemy.', [dmg(1.0)]),
      skill: ab('Slag Volley', '3 hits of 70% ATK to random enemies, each may burn.', [dmg(0.7, 'randomEnemies', { hits: 3 }), dot(0.3, 'enemy', 2, 0.5)], 3),
      ultimate: ab('Furnace Rain', '200% ATK to all enemies and burn them for 2 turns.', [dmg(2.0, 'allEnemies'), dot(0.4, 'allEnemies')]),
      passives: [
        pas('Steady Hands', '+10% Crit Rate.', { stats: { critRate: 0.1 } }),
        pas('Spark Supply', 'Start with 25 energy.', { startEnergy: 25 }),
        pas('White Heat', '+15% ATK.', { stats: { atk: 0.15 } }),
      ],
    },
  },
  {
    id: 'sr-yuna', name: 'Yuna Belcourt', title: 'Rimecaller', rarity: 'SR', cls: 'mage', element: 'frost',
    bio: 'A conservatory cellist whose low notes now freeze the air solid.',
    kit: {
      basic: ab('Cold Note', '100% ATK to one enemy.', [dmg(1.0)]),
      skill: ab('Glacial Chord', '130% ATK to all enemies, 25% chance to stun.', [dmg(1.3, 'allEnemies'), stun(0.25, 'allEnemies')], 4),
      ultimate: ab('Winter Requiem', '260% ATK to all enemies and lower their SPD by 25%.', [dmg(2.6, 'allEnemies'), debuff('spd', 0.25, 'allEnemies')]),
      passives: [
        pas('Perfect Pitch', '+10% ATK.', { stats: { atk: 0.1 } }),
        pas('Encore', 'Start with 30 energy.', { startEnergy: 30 }),
        pas('Fermata', '+12% ATK, +10% Crit DMG.', { stats: { atk: 0.12, critDmg: 0.1 } }),
      ],
    },
  },
  {
    id: 'sr-odalys', name: 'Odalys Fen', title: 'Hollow Choir', rarity: 'SR', cls: 'mage', element: 'void',
    bio: 'Hears the voices inside Rifts and answers in a language no one taught her.',
    kit: {
      basic: ab('Whisper', '100% ATK to one enemy.', [dmg(1.0)]),
      skill: ab('Dirge', '120% ATK to all enemies and lower DEF by 20%.', [dmg(1.2, 'allEnemies'), debuff('def', 0.2, 'allEnemies')], 3),
      ultimate: ab('Choir of Nothing', '250% ATK to all enemies, +30% vs debuffed targets.', [dmg(2.5, 'allEnemies', { bonusVsDebuffed: 0.3 })]),
      passives: [
        pas('Unheard', '+10% SPD.', { stats: { spd: 0.1 } }),
        pas('Resonance', 'Team gains +6% ATK.', { teamStats: { atk: 0.06 } }),
        pas('Silent Verse', '+15% ATK.', { stats: { atk: 0.15 } }),
      ],
    },
  },
  {
    id: 'sr-jabari', name: 'Jabari Quell', title: 'Skyline Sentry', rarity: 'SR', cls: 'ranger', element: 'storm',
    bio: 'Spots Rifts from rooftop to rooftop before the sirens even start.',
    kit: {
      basic: ab('Spotter Round', '100% ATK to one enemy.', [dmg(1.0)]),
      skill: ab('Lightning Rod', '200% ATK to one enemy, gain +20% SPD for 2 turns.', [dmg(2.0), buff('spd', 0.2, 'self')], 3),
      ultimate: ab('Thunderhead', '5 hits of 80% ATK on random enemies.', [dmg(0.8, 'randomEnemies', { hits: 5 })]),
      passives: [
        pas('High Ground', '+10% Crit Rate.', { stats: { critRate: 0.1 } }),
        pas('Early Warning', 'Team gains +5% SPD.', { teamStats: { spd: 0.05 } }),
        pas('Eye of the Storm', '+20% Crit DMG.', { stats: { critDmg: 0.2 } }),
      ],
    },
  },
  {
    id: 'sr-petra', name: 'Petra Halvorsen', title: 'Forgeheart', rarity: 'SR', cls: 'striker', element: 'flame',
    bio: 'A blacksmith who forged her own gauntlets from a fallen gate-beast’s horn.',
    kit: {
      basic: ab('Anvil Punch', '110% ATK to one enemy.', [dmg(1.1)]),
      skill: ab('Quench', '180% ATK to one enemy and burn it.', [dmg(1.8), dot(0.5, 'enemy', 2)], 3),
      ultimate: ab('Molten Core', '320% ATK to one enemy and gain +25% ATK for 2 turns.', [dmg(3.2), buff('atk', 0.25, 'self')]),
      passives: [
        pas('Tempered', '+10% HP.', { stats: { hp: 0.1 } }),
        pas('Bellows', 'Start with 25 energy.', { startEnergy: 25 }),
        pas('Masterwork', '+15% ATK, +5% Crit Rate.', { stats: { atk: 0.15, critRate: 0.05 } }),
      ],
    },
  },
  {
    id: 'sr-sable', name: 'Sable Merrow', title: 'Frostknife', rarity: 'SR', cls: 'assassin', element: 'frost',
    bio: 'Courier by day. The packages she delivers at night are much sharper.',
    kit: {
      basic: ab('Quick Slice', '100% ATK to one enemy.', [dmg(1.0)]),
      skill: ab('Black Ice', '190% ATK to one enemy and lower its SPD by 30%.', [dmg(1.9), debuff('spd', 0.3, 'enemy')], 3),
      ultimate: ab('Shatterpoint', '380% ATK to one enemy, +40% vs debuffed.', [dmg(3.8, 'enemy', { bonusVsDebuffed: 0.4 })]),
      passives: [
        pas('Light Feet', '+8% SPD.', { stats: { spd: 0.08 } }),
        pas('Cold Read', '+10% Crit Rate.', { stats: { critRate: 0.1 } }),
        pas('Clean Exit', '+15% ATK.', { stats: { atk: 0.15 } }),
      ],
    },
  },
  {
    id: 'sr-goran', name: 'Goran Vell', title: 'Black Bastion', rarity: 'SR', cls: 'tank', element: 'void',
    bio: 'His shield is a slab of Rift-glass. Light bends around it, and so do blows.',
    kit: {
      basic: ab('Slab Strike', '90% ATK to one enemy.', [dmg(0.9)]),
      skill: ab('Gravity Well', 'Taunt for 2 turns and gain +30% DEF.', [taunt(2), buff('def', 0.3, 'self')], 3),
      ultimate: ab('Event Wall', 'Shield all allies for 18% max HP and lower enemy ATK by 20%.', [shield(0.18, 'allAllies'), debuff('atk', 0.2, 'allEnemies')]),
      passives: [
        pas('Dense', '+12% DEF.', { stats: { def: 0.12 } }),
        pas('Anchor', 'Team gains +6% DEF.', { teamStats: { def: 0.06 } }),
        pas('Immovable', '+15% HP, +10% DEF.', { stats: { hp: 0.15, def: 0.1 } }),
      ],
    },
  },
  {
    id: 'sr-lumi', name: 'Lumi Castellane', title: 'Lanternkeeper', rarity: 'SR', cls: 'healer', element: 'radiant',
    bio: 'Runs the night clinic under the overpass. No one has ever been turned away.',
    kit: {
      basic: ab('Glow Dart', '90% ATK to one enemy.', [dmg(0.9)]),
      skill: ab('Mend', 'Heal the weakest ally for 220% ATK.', [heal(2.2, 'lowestAlly')], 2),
      ultimate: ab('Lantern Circle', 'Heal all allies for 160% ATK and grant 20 energy.', [heal(1.6, 'allAllies'), energy(20, 'allAllies')]),
      passives: [
        pas('Night Shift', '+10% HP.', { stats: { hp: 0.1 } }),
        pas('Triage', 'Team gains +5% HP.', { teamStats: { hp: 0.05 } }),
        pas('Open Doors', '+15% ATK, start with 25 energy.', { stats: { atk: 0.15 }, startEnergy: 25 }),
      ],
    },
  },
];

// =========================================================== R
const rp = (a: string, b: string, c: string): [Passive, Passive, Passive] => [
  pas(a, '+8% ATK.', { stats: { atk: 0.08 } }),
  pas(b, '+8% HP.', { stats: { hp: 0.08 } }),
  pas(c, '+10% ATK, +5% Crit Rate.', { stats: { atk: 0.1, critRate: 0.05 } }),
];
const rpTank = (a: string, b: string, c: string): [Passive, Passive, Passive] => [
  pas(a, '+8% DEF.', { stats: { def: 0.08 } }),
  pas(b, '+8% HP.', { stats: { hp: 0.08 } }),
  pas(c, '+10% HP, +10% DEF.', { stats: { hp: 0.1, def: 0.1 } }),
];
const rpHeal = (a: string, b: string, c: string): [Passive, Passive, Passive] => [
  pas(a, '+8% HP.', { stats: { hp: 0.08 } }),
  pas(b, 'Start with 20 energy.', { startEnergy: 20 }),
  pas(c, '+10% ATK, +8% HP.', { stats: { atk: 0.1, hp: 0.08 } }),
];

const R: Spec[] = [
  {
    id: 'r-brann', name: 'Brann Toller', title: 'Dockside Brawler', rarity: 'R', cls: 'striker', element: 'flame',
    bio: 'Unloads cargo ships by day; unloads on gate-beasts by night.',
    kit: {
      basic: ab('Haymaker', '105% ATK to one enemy.', [dmg(1.05)]),
      skill: ab('Boiler Burst', '170% ATK to one enemy.', [dmg(1.7)], 3),
      ultimate: ab('Overtime', '280% ATK to one enemy.', [dmg(2.8)]),
      passives: rp('Thick Knuckles', 'Night Shift Grit', 'Last Crate'),
    },
  },
  {
    id: 'r-cole', name: 'Cole Varga', title: 'Livewire', rarity: 'R', cls: 'striker', element: 'storm',
    bio: 'An electrician who learned the hard way that Rift-current bites back.',
    kit: {
      basic: ab('Zap', '105% ATK to one enemy.', [dmg(1.05)]),
      skill: ab('Short Circuit', '140% ATK to one enemy, 35% chance to stun.', [dmg(1.4), stun(0.35)], 3),
      ultimate: ab('Breaker Trip', '180% ATK to all enemies.', [dmg(1.8, 'allEnemies')]),
      passives: rp('Rubber Soles', 'Insulated', 'High Voltage'),
    },
  },
  {
    id: 'r-wren', name: 'Wren Ashby', title: 'Gutter Sparrow', rarity: 'R', cls: 'ranger', element: 'storm',
    bio: 'Grew up on fire escapes. Never misses from a moving rooftop.',
    kit: {
      basic: ab('Pebble Shot', '100% ATK to one enemy.', [dmg(1.0)]),
      skill: ab('Gust Arrow', '2 hits of 85% ATK to random enemies.', [dmg(0.85, 'randomEnemies', { hits: 2 })], 2),
      ultimate: ab('Downdraft', '3 hits of 100% ATK to random enemies.', [dmg(1.0, 'randomEnemies', { hits: 3 })]),
      passives: rp('Keen Eye', 'Wiry', 'Tailwind'),
    },
  },
  {
    id: 'r-tamsin', name: 'Tamsin Reed', title: 'Icefisher', rarity: 'R', cls: 'ranger', element: 'frost',
    bio: 'Fished the frozen canals before the Sundering; now she harpoons what swims up.',
    kit: {
      basic: ab('Line Cast', '100% ATK to one enemy.', [dmg(1.0)]),
      skill: ab('Harpoon', '180% ATK to one enemy and lower its SPD by 20%.', [dmg(1.8), debuff('spd', 0.2, 'enemy')], 3),
      ultimate: ab('Ice Hole', '260% ATK to one enemy.', [dmg(2.6)]),
      passives: rp('Patience', 'Cold Blood', 'Big Catch'),
    },
  },
  {
    id: 'r-dace', name: 'Dace Morrow', title: 'Alley Ghost', rarity: 'R', cls: 'assassin', element: 'void',
    bio: 'Nobody remembers hiring him. Everyone remembers the result.',
    kit: {
      basic: ab('Shiv', '100% ATK to one enemy.', [dmg(1.0)]),
      skill: ab('Vanish Cut', '190% ATK to one enemy, ignoring 20% DEF.', [dmg(1.9, 'enemy', { ignoreDef: 0.2 })], 3),
      ultimate: ab('Gone', '300% ATK to one enemy.', [dmg(3.0)]),
      passives: rp('Low Profile', 'Hard to Pin', 'Nobody Saw'),
    },
  },
  {
    id: 'r-vesna', name: 'Vesna Kroll', title: 'Matchstick', rarity: 'R', cls: 'assassin', element: 'flame',
    bio: 'Ex-firefighter. Knows exactly how fire moves, and where to stand.',
    kit: {
      basic: ab('Flick', '100% ATK to one enemy.', [dmg(1.0)]),
      skill: ab('Backdraft', '150% ATK to one enemy and burn it.', [dmg(1.5), dot(0.4, 'enemy')], 3),
      ultimate: ab('Flashover', '290% ATK to one enemy, +30% vs debuffed.', [dmg(2.9, 'enemy', { bonusVsDebuffed: 0.3 })]),
      passives: rp('Heat Sense', 'Turnout Gear', 'Fire Line'),
    },
  },
  {
    id: 'r-ilse', name: 'Ilse Kettering', title: 'Kettle Witch', rarity: 'R', cls: 'mage', element: 'flame',
    bio: 'Brews tea, brews fire. Swears the recipes are almost identical.',
    kit: {
      basic: ab('Ember', '100% ATK to one enemy.', [dmg(1.0)]),
      skill: ab('Boil Over', '110% ATK to all enemies.', [dmg(1.1, 'allEnemies')], 3),
      ultimate: ab('Scald', '200% ATK to all enemies and burn them.', [dmg(2.0, 'allEnemies'), dot(0.3, 'allEnemies')]),
      passives: rp('Steep', 'Warm Hands', 'Full Boil'),
    },
  },
  {
    id: 'r-pim', name: 'Pim Lachance', title: 'Static Scholar', rarity: 'R', cls: 'mage', element: 'storm',
    bio: 'A physics student who wrote a thesis on Rifts. Then a Rift wrote back.',
    kit: {
      basic: ab('Spark', '100% ATK to one enemy.', [dmg(1.0)]),
      skill: ab('Chain Theory', '3 hits of 70% ATK to random enemies.', [dmg(0.7, 'randomEnemies', { hits: 3 })], 3),
      ultimate: ab('Peer Review', '210% ATK to all enemies, lower DEF by 15%.', [dmg(2.1, 'allEnemies'), debuff('def', 0.15, 'allEnemies')]),
      passives: rp('Footnotes', 'All-Nighter', 'Tenure'),
    },
  },
  {
    id: 'r-hob', name: 'Hob Greaves', title: 'Cold Storage', rarity: 'R', cls: 'tank', element: 'frost',
    bio: 'Worked in a meat locker for twenty years. Cold does not scare him.',
    kit: {
      basic: ab('Shoulder Check', '90% ATK to one enemy.', [dmg(0.9)]),
      skill: ab('Freezer Door', 'Taunt for 2 turns and shield self for 18% max HP.', [taunt(2), shield(0.18, 'self')], 3),
      ultimate: ab('Deep Freeze', '140% ATK to all enemies, lower their ATK by 15%.', [dmg(1.4, 'allEnemies'), debuff('atk', 0.15, 'allEnemies')]),
      passives: rpTank('Thick Coat', 'Stubborn', 'Walk-In'),
    },
  },
  {
    id: 'r-orrin', name: 'Orrin Bask', title: 'Chapel Guard', rarity: 'R', cls: 'tank', element: 'radiant',
    bio: 'Guards an old chapel that refugees sleep in. Nothing gets past the doors.',
    kit: {
      basic: ab('Censer Swing', '90% ATK to one enemy.', [dmg(0.9)]),
      skill: ab('Sanctuary', 'Taunt for 2 turns and gain +25% DEF.', [taunt(2), buff('def', 0.25, 'self')], 3),
      ultimate: ab('Vespers', 'Shield all allies for 14% max HP.', [shield(0.14, 'allAllies')]),
      passives: rpTank('Old Oak', 'Faithful', 'Bell Tower'),
    },
  },
  {
    id: 'r-ama', name: 'Ama Ostrander', title: 'Street Medic', rarity: 'R', cls: 'healer', element: 'radiant',
    bio: 'Carries a bag of bandages and a light that closes wounds faster than stitches.',
    kit: {
      basic: ab('Pen Light', '90% ATK to one enemy.', [dmg(0.9)]),
      skill: ab('Patch Up', 'Heal the weakest ally for 200% ATK.', [heal(2.0, 'lowestAlly')], 2),
      ultimate: ab('Field Hospital', 'Heal all allies for 140% ATK.', [heal(1.4, 'allAllies')]),
      passives: rpHeal('Steady Pulse', 'On Call', 'Bedside'),
    },
  },
  {
    id: 'r-saffi', name: 'Saffi Noor', title: 'Hollow Nurse', rarity: 'R', cls: 'healer', element: 'void',
    bio: 'Draws the pain out of others and stores it somewhere no one can find.',
    kit: {
      basic: ab('Drain', '90% ATK to one enemy.', [dmg(0.9)]),
      skill: ab('Siphon', 'Heal the weakest ally for 160% ATK and lower an enemy’s ATK by 15%.', [heal(1.6, 'lowestAlly'), debuff('atk', 0.15, 'enemy')], 3),
      ultimate: ab('Empty Ward', 'Heal all allies for 130% ATK and cleanse debuffs.', [heal(1.3, 'allAllies'), cleanse('allAllies')]),
      passives: rpHeal('Quiet Hands', 'Hollow Reserve', 'Painless'),
    },
  },
];

// =========================================================== Wave 2 (roster expansion)
const SSR2: Spec[] = [
  {
    id: 'ssr-ingrid', name: 'Ingrid Emberlane', title: 'The Last Furnace', rarity: 'SSR', cls: 'mage', element: 'flame',
    bio: 'Ran the city’s last coal furnace. When the Rift came through the boiler room, she breathed it in.',
    kit: {
      basic: ab('Cinder Script', 'Deal 100% ATK to one enemy.', [dmg(1.0)]),
      skill: ab('Stokehold', '140% ATK to all enemies and burn them for 2 turns.', [dmg(1.4, 'allEnemies'), dot(0.35, 'allEnemies')], 3),
      ultimate: ab('Last Furnace', '300% ATK to all enemies, +40% vs debuffed, then +20% ATK for 2 turns.', [dmg(3.0, 'allEnemies', { bonusVsDebuffed: 0.4 }), buff('atk', 0.2, 'self')]),
      passives: [
        pas('Banked Coals', '+12% ATK.', { stats: { atk: 0.12 } }),
        pas('Heat Haze', 'Team gains +6% ATK.', { teamStats: { atk: 0.06 } }),
        pas('White Furnace', '+15% ATK, start with 35 energy.', { stats: { atk: 0.15 }, startEnergy: 35 }),
      ],
    },
  },
  {
    id: 'ssr-teodor', name: 'Teodor Halcyon', title: 'Dawnstring', rarity: 'SSR', cls: 'ranger', element: 'radiant',
    bio: 'A bell-ringer who strung his bow with wire from the cathedral tower. Every shot sounds like morning.',
    kit: {
      basic: ab('Matins', 'Deal 105% ATK to one enemy.', [dmg(1.05)]),
      skill: ab('Peal', '4 hits of 65% ATK on random enemies; team gains +10% SPD for 2 turns.', [dmg(0.65, 'randomEnemies', { hits: 4 }), buff('spd', 0.1, 'allAllies')], 3),
      ultimate: ab('Daybreak Volley', '380% ATK to one enemy, ignoring 25% DEF, and give the team 15 energy.', [dmg(3.8, 'enemy', { ignoreDef: 0.25 }), energy(15, 'allAllies')]),
      passives: [
        pas('Tower Sight', '+10% Crit Rate.', { stats: { critRate: 0.1 } }),
        pas('First Bell', 'Team gains +5% SPD.', { teamStats: { spd: 0.05 } }),
        pas('High Noon', '+15% ATK, +20% Crit DMG.', { stats: { atk: 0.15, critDmg: 0.2 } }),
      ],
    },
  },
];

const SR2: Spec[] = [
  {
    id: 'sr-mara', name: 'Mara Quillon', title: 'Nullfist', rarity: 'SR', cls: 'striker', element: 'void',
    bio: 'An amateur boxer whose punches now land a half-second before she throws them.',
    kit: {
      basic: ab('Jab Before Time', '110% ATK to one enemy.', [dmg(1.1)]),
      skill: ab('Hollow Hook', '170% ATK to one enemy and lower its DEF by 20%.', [dmg(1.7), debuff('def', 0.2, 'enemy')], 3),
      ultimate: ab('Count of Zero', '340% ATK to one enemy, +35% vs debuffed.', [dmg(3.4, 'enemy', { bonusVsDebuffed: 0.35 })]),
      passives: [
        pas('Footwork', '+8% SPD.', { stats: { spd: 0.08 } }),
        pas('Second Wind', 'Start with 25 energy.', { startEnergy: 25 }),
        pas('Title Shot', '+15% ATK.', { stats: { atk: 0.15 } }),
      ],
    },
  },
  {
    id: 'sr-kip', name: 'Kip Ravensworth', title: 'Static Knife', rarity: 'SR', cls: 'assassin', element: 'storm',
    bio: 'A bike messenger who rides the power lines. Nobody has ever outrun him, and plenty have tried.',
    kit: {
      basic: ab('Spark Slash', '100% ATK to one enemy.', [dmg(1.0)]),
      skill: ab('Live Rail', '180% ATK to one enemy, 40% chance to stun.', [dmg(1.8), stun(0.4)], 3),
      ultimate: ab('Blackout Run', '3 hits of 130% ATK on random enemies.', [dmg(1.3, 'randomEnemies', { hits: 3 })]),
      passives: [
        pas('Tailwind', '+10% SPD.', { stats: { spd: 0.1 } }),
        pas('Close Call', '+10% Crit Rate.', { stats: { critRate: 0.1 } }),
        pas('Rush Hour', '+15% ATK.', { stats: { atk: 0.15 } }),
      ],
    },
  },
  {
    id: 'sr-augustin', name: 'Augustin Brask', title: 'Kiln Wall', rarity: 'SR', cls: 'tank', element: 'flame',
    bio: 'A potter with hands like oven mitts. He fires his own armour, one brick-red plate at a time.',
    kit: {
      basic: ab('Clay Slam', '90% ATK to one enemy.', [dmg(0.9)]),
      skill: ab('Glaze', 'Taunt for 2 turns and shield self for 22% max HP.', [taunt(2), shield(0.22, 'self')], 3),
      ultimate: ab('Firing', '150% ATK to all enemies and burn them; team gains +15% DEF.', [dmg(1.5, 'allEnemies'), dot(0.3, 'allEnemies'), buff('def', 0.15, 'allAllies')]),
      passives: [
        pas('Thick Walls', '+12% DEF.', { stats: { def: 0.12 } }),
        pas('Hearth', 'Team gains +6% HP.', { teamStats: { hp: 0.06 } }),
        pas('Stoneware', '+15% HP, +10% DEF.', { stats: { hp: 0.15, def: 0.1 } }),
      ],
    },
  },
  {
    id: 'sr-elodie', name: 'Elodie Marsh', title: 'Winter Nurse', rarity: 'SR', cls: 'healer', element: 'frost',
    bio: 'Packs wounds in Rift-ice that never melts. Her patients wake up cold, but they wake up.',
    kit: {
      basic: ab('Chill Touch', '90% ATK to one enemy.', [dmg(0.9)]),
      skill: ab('Cold Compress', 'Heal the weakest ally for 200% ATK and shield them for 10% max HP.', [heal(2.0, 'lowestAlly'), shield(0.1, 'lowestAlly')], 2),
      ultimate: ab('Long Frost', 'Heal all allies for 150% ATK and lower enemy SPD by 15%.', [heal(1.5, 'allAllies'), debuff('spd', 0.15, 'allEnemies')]),
      passives: [
        pas('Steady Hands', '+10% HP.', { stats: { hp: 0.1 } }),
        pas('Bedside Manner', 'Team gains +5% DEF.', { teamStats: { def: 0.05 } }),
        pas('Cryo Ward', '+15% ATK, start with 25 energy.', { stats: { atk: 0.15 }, startEnergy: 25 }),
      ],
    },
  },
];

const R2: Spec[] = [
  {
    id: 'r-benny', name: 'Benny Ortolan', title: 'Neon Bouncer', rarity: 'R', cls: 'striker', element: 'radiant',
    bio: 'Works the door at a club that glows a little too brightly. Gate-beasts are not on the list.',
    kit: {
      basic: ab('Velvet Rope', '105% ATK to one enemy.', [dmg(1.05)]),
      skill: ab('Lights Up', '160% ATK to one enemy and lower its ATK by 15%.', [dmg(1.6), debuff('atk', 0.15, 'enemy')], 3),
      ultimate: ab('Closing Time', '270% ATK to one enemy.', [dmg(2.7)]),
      passives: rp('Big Frame', 'Door Policy', 'Last Call'),
    },
  },
  {
    id: 'r-juno', name: 'Juno Sallow', title: 'Glint', rarity: 'R', cls: 'assassin', element: 'radiant',
    bio: 'A pickpocket who learned to steal light. Now she hides inside the glare of streetlamps.',
    kit: {
      basic: ab('Flash Cut', '100% ATK to one enemy.', [dmg(1.0)]),
      skill: ab('Glare', '170% ATK to one enemy, ignoring 20% DEF.', [dmg(1.7, 'enemy', { ignoreDef: 0.2 })], 3),
      ultimate: ab('Blindside', '290% ATK to one enemy, +30% vs debuffed.', [dmg(2.9, 'enemy', { bonusVsDebuffed: 0.3 })]),
      passives: rp('Quick Fingers', 'Shine', 'Vanishing Act'),
    },
  },
  {
    id: 'r-dorrit', name: 'Dorrit Vale', title: 'Lightning Rod', rarity: 'R', cls: 'tank', element: 'storm',
    bio: 'A roofer who has been struck nine times. She now climbs up during storms on purpose.',
    kit: {
      basic: ab('Ground Out', '90% ATK to one enemy.', [dmg(0.9)]),
      skill: ab('Draw Fire', 'Taunt for 2 turns and gain +25% DEF.', [taunt(2), buff('def', 0.25, 'self')], 3),
      ultimate: ab('Earth Wire', '130% ATK to all enemies, 25% chance to stun.', [dmg(1.3, 'allEnemies'), stun(0.25, 'allEnemies')]),
      passives: rpTank('Rubber Boots', 'Weathered', 'Struck Ten'),
    },
  },
  {
    id: 'r-pell', name: 'Pell Haverty', title: 'Jumpstart', rarity: 'R', cls: 'healer', element: 'storm',
    bio: 'An ambulance mechanic who discovered the defibrillator works on hunters, too. Mostly.',
    kit: {
      basic: ab('Zap Check', '90% ATK to one enemy.', [dmg(0.9)]),
      skill: ab('Clear!', 'Heal the weakest ally for 180% ATK and give them 20 energy.', [heal(1.8, 'lowestAlly'), energy(20, 'lowestAlly')], 3),
      ultimate: ab('Full Charge', 'Heal all allies for 130% ATK and grant 15 energy.', [heal(1.3, 'allAllies'), energy(15, 'allAllies')]),
      passives: rpHeal('Spare Battery', 'Jumper Cables', 'Overcharge'),
    },
  },
  {
    id: 'r-wynn', name: 'Wynn Calder', title: 'Margin Note', rarity: 'R', cls: 'mage', element: 'void',
    bio: 'A night-shift archivist who reads the blank pages in old books. Something reads back.',
    kit: {
      basic: ab('Ink Blot', '100% ATK to one enemy.', [dmg(1.0)]),
      skill: ab('Redact', '110% ATK to all enemies and lower DEF by 15%.', [dmg(1.1, 'allEnemies'), debuff('def', 0.15, 'allEnemies')], 3),
      ultimate: ab('Unwritten', '200% ATK to all enemies.', [dmg(2.0, 'allEnemies')]),
      passives: rp('Late Return', 'Quiet Hours', 'Final Draft'),
    },
  },
  {
    id: 'r-ossie', name: 'Ossie Brandt', title: 'Flare Gun', rarity: 'R', cls: 'ranger', element: 'flame',
    bio: 'Harbour coast-guard volunteer. Fires distress flares at Rift-things and is surprised how well it works.',
    kit: {
      basic: ab('Signal Shot', '100% ATK to one enemy.', [dmg(1.0)]),
      skill: ab('Mayday', '2 hits of 90% ATK on random enemies; each may burn.', [dmg(0.9, 'randomEnemies', { hits: 2 }), dot(0.3, 'enemy', 2, 0.5)], 2),
      ultimate: ab('Red Sky', '180% ATK to all enemies.', [dmg(1.8, 'allEnemies')]),
      passives: rp('Sea Legs', 'Weatherproof', 'Bright Night'),
    },
  },
];

// =========================================================== Mythic (6★)
const MR: Spec[] = [
  {
    id: 'mr-aurelia', name: 'Aurelia Nox', title: 'Eclipse Regent', rarity: 'MR', cls: 'mage', element: 'void',
    bio: 'Declared dead in the Sundering. She walked out of the first Rift three years later, wearing its dark like a crown.',
    kit: {
      basic: ab('Null Verse', 'Deal 110% ATK to one enemy.', [dmg(1.1)]),
      skill: ab('Event Horizon', '180% ATK to all enemies and lower their DEF by 25%.', [dmg(1.8, 'allEnemies'), debuff('def', 0.25, 'allEnemies')], 3),
      ultimate: ab('Total Night', '450% ATK to all enemies, +50% vs debuffed; team gains +20% ATK for 2 turns.', [dmg(4.5, 'allEnemies', { bonusVsDebuffed: 0.5 }), buff('atk', 0.2, 'allAllies')]),
      passives: [
        pas('Crown of Dark', '+15% ATK.', { stats: { atk: 0.15 } }),
        pas('Regency', 'Team gains +8% ATK.', { teamStats: { atk: 0.08 } }),
        pas('Long Eclipse', '+20% ATK, start with 50 energy.', { stats: { atk: 0.2 }, startEnergy: 50 }),
      ],
    },
  },
  {
    id: 'mr-caspian', name: 'Caspian Rook', title: 'The Rift-Walker', rarity: 'MR', cls: 'striker', element: 'storm',
    bio: 'Steps between Rifts the way other people step off a curb. Nobody has seen him use a door in years.',
    kit: {
      basic: ab('Blink Strike', 'Hit one enemy for 120% ATK.', [dmg(1.2)]),
      skill: ab('Phase Cut', '240% ATK to one enemy, ignoring 30% DEF; gain +25% SPD for 2 turns.', [dmg(2.4, 'enemy', { ignoreDef: 0.3 }), buff('spd', 0.25, 'self')], 3),
      ultimate: ab('Thousand Steps', '6 hits of 110% ATK on random enemies, 30% chance to stun.', [dmg(1.1, 'randomEnemies', { hits: 6 }), stun(0.3, 'allEnemies')]),
      passives: [
        pas('Between Places', '+12% SPD.', { stats: { spd: 0.12 } }),
        pas('Slipstream', 'Team gains +8% SPD.', { teamStats: { spd: 0.08 } }),
        pas('No Doors', '+20% ATK, +15% Crit Rate.', { stats: { atk: 0.2, critRate: 0.15 } }),
      ],
    },
  },
  {
    id: 'mr-saoirse', name: 'Saoirse Vantor', title: 'Heir of the City', rarity: 'MR', cls: 'healer', element: 'radiant',
    bio: 'Last descendant of the family that founded Vantor. She swore the city would not fall twice.',
    kit: {
      basic: ab('Charter Light', 'Deal 100% ATK to one enemy.', [dmg(1.0)]),
      skill: ab('Founding Light', 'Heal all allies for 160% ATK, cleanse debuffs, shield for 10% max HP.', [heal(1.6, 'allAllies'), cleanse('allAllies'), shield(0.1, 'allAllies')], 3),
      ultimate: ab('City Unbroken', 'Heal all allies for 260% ATK, +25% ATK for 2 turns, and grant 25 energy.', [heal(2.6, 'allAllies'), buff('atk', 0.25, 'allAllies'), energy(25, 'allAllies')]),
      passives: [
        pas('Old Blood', '+15% HP.', { stats: { hp: 0.15 } }),
        pas('Civic Oath', 'Team gains +10% HP.', { teamStats: { hp: 0.1 } }),
        pas('Lantern of Vantor', '+20% ATK, start with 40 energy.', { stats: { atk: 0.2 }, startEnergy: 40 }),
      ],
    },
  },
  {
    id: 'mr-magnus', name: 'Magnus Hale', title: 'The Unburnt', rarity: 'MR', cls: 'tank', element: 'flame',
    bio: 'Walked through the Foundry Rift fire to carry out forty workers. The flames have obeyed him ever since.',
    kit: {
      basic: ab('Foundry Fist', 'Hit one enemy for 110% ATK.', [dmg(1.1)]),
      skill: ab('Unburnt Stance', 'Taunt for 2 turns, shield self for 30% max HP, team +15% DEF.', [taunt(2), shield(0.3, 'self'), buff('def', 0.15, 'allAllies')], 3),
      ultimate: ab('Pyreheart', '200% ATK to all enemies and burn them; shield the team for 20% max HP.', [dmg(2.0, 'allEnemies'), dot(0.4, 'allEnemies'), shield(0.2, 'allAllies')]),
      passives: [
        pas('Fireproof', '+18% DEF.', { stats: { def: 0.18 } }),
        pas('Forty Saved', 'Team gains +10% DEF.', { teamStats: { def: 0.1 } }),
        pas('Heart of the Forge', '+25% HP, +15% DEF.', { stats: { hp: 0.25, def: 0.15 } }),
      ],
    },
  },
];

/** Portrait body type per hunter */
const FIGURE: Record<string, Figure> = {
  'ssr-isolde': 'f', 'ssr-ren': 'm', 'ssr-mireille': 'f', 'ssr-tavish': 'm', 'ssr-ingrid': 'f', 'ssr-teodor': 'm',
  'sr-kasimir': 'm', 'sr-yuna': 'f', 'sr-odalys': 'f', 'sr-jabari': 'm', 'sr-petra': 'f', 'sr-sable': 'f', 'sr-goran': 'm', 'sr-lumi': 'f',
  'sr-mara': 'f', 'sr-kip': 'm', 'sr-augustin': 'm', 'sr-elodie': 'f',
  'r-brann': 'm', 'r-cole': 'm', 'r-wren': 'f', 'r-tamsin': 'f', 'r-dace': 'm', 'r-vesna': 'f', 'r-ilse': 'f', 'r-pim': 'm', 'r-hob': 'm',
  'r-orrin': 'm', 'r-ama': 'f', 'r-saffi': 'f', 'r-benny': 'm', 'r-juno': 'f', 'r-dorrit': 'f', 'r-pell': 'm', 'r-wynn': 'm', 'r-ossie': 'm',
  'mr-aurelia': 'f', 'mr-caspian': 'm', 'mr-saoirse': 'f', 'mr-magnus': 'm',
};

export const HUNTERS: HunterDef[] = [...MR, ...SSR, ...SSR2, ...SR, ...SR2, ...R, ...R2].map(make);
export const HUNTER_MAP: Record<string, HunterDef> = Object.fromEntries(HUNTERS.map((h) => [h.id, h]));
export const getHunter = (id: string): HunterDef => {
  const h = HUNTER_MAP[id];
  if (!h) throw new Error(`Unknown hunter ${id}`);
  return h;
};
export const byRarity = (r: Rarity) => HUNTERS.filter((h) => h.rarity === r);
