export type Element = 'flame' | 'frost' | 'storm' | 'void' | 'radiant' | 'rift';
export type HunterElement = Exclude<Element, 'rift'>;
export type HunterClass = 'striker' | 'assassin' | 'ranger' | 'mage' | 'tank' | 'healer';
export type UnitClass = HunterClass | 'awakened' | 'beast' | 'boss';
/** MR = Mythic (6★), above SSR */
export type Rarity = 'R' | 'SR' | 'SSR' | 'MR';
export type Figure = 'f' | 'm';
export type Rank = 'E' | 'D' | 'C' | 'B' | 'A' | 'S';

export type StatKey = 'hp' | 'atk' | 'def' | 'spd' | 'critRate' | 'critDmg';
export type Stats = Record<StatKey, number>;
export type StatMods = Partial<Record<StatKey, number>>; // fractional (+0.1 = +10%) except critRate/critDmg which are flat additions

export type TargetKind =
  | 'enemy' // the chosen / auto-chosen single enemy
  | 'allEnemies'
  | 'randomEnemies' // `hits` random picks
  | 'self'
  | 'lowestAlly'
  | 'allAllies';

export type BuffStat = 'atk' | 'def' | 'spd' | 'critRate';

export type Effect =
  | { type: 'damage'; target: TargetKind; mult: number; hits?: number; ignoreDef?: number; bonusVsDebuffed?: number }
  | { type: 'heal'; target: TargetKind; mult: number; of?: 'atk' | 'maxHp' }
  | { type: 'shield'; target: TargetKind; mult: number; of?: 'atk' | 'maxHp'; turns: number }
  | { type: 'buff'; target: TargetKind; stat: BuffStat; amount: number; turns: number }
  | { type: 'debuff'; target: TargetKind; stat: BuffStat; amount: number; turns: number; chance?: number }
  | { type: 'dot'; target: TargetKind; mult: number; turns: number; chance?: number }
  | { type: 'stun'; target: TargetKind; turns: number; chance: number }
  | { type: 'taunt'; turns: number }
  | { type: 'energy'; target: TargetKind; amount: number }
  | { type: 'cleanse'; target: TargetKind };

export interface Ability {
  name: string;
  desc: string;
  effects: Effect[];
  /** skill only: cooldown in owner's turns */
  cooldown?: number;
}

export interface Passive {
  name: string;
  desc: string;
  /** own stat bonuses */
  stats?: StatMods;
  /** bonuses to the whole team at battle start */
  teamStats?: StatMods;
  /** energy at battle start */
  startEnergy?: number;
}

export interface Kit {
  basic: Ability;
  skill: Ability;
  ultimate: Ability;
  /** unlocked at limit break stars 1, 3, 5 */
  passives: [Passive, Passive, Passive];
}

export interface HunterDef {
  id: string;
  name: string;
  title: string;
  bio: string;
  rarity: Rarity;
  /** portrait body type */
  figure: Figure;
  cls: HunterClass;
  element: HunterElement;
  /** level 1 base stats */
  base: Stats;
  kit: Kit;
}
