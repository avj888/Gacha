import type { Ability, BuffStat, Element, Rarity, Stats, UnitClass } from '../../types';

export type Side = 'ally' | 'enemy';
export type AbilityKind = 'basic' | 'skill' | 'ultimate';

export interface UnitKit {
  basic: Ability;
  skill: Ability;
  ultimate: Ability;
}

/** Everything needed to put a unit on the field. Stats are final (passives already applied). */
export interface UnitSetup {
  id: string;
  name: string;
  cls: UnitClass;
  element: Element;
  portrait: Rarity | 'boss' | 'player';
  stats: Stats;
  kit: UnitKit;
  startEnergy?: number;
  isBoss?: boolean;
  /** player avatar — losing it does not end the fight, but it is counted for KOs */
  isPlayer?: boolean;
}

/** `fresh`: applied by the unit to itself this turn — does not tick down at the end of that same turn */
export type Status = (
  | { kind: 'buff' | 'debuff'; stat: BuffStat; amount: number; turns: number }
  | { kind: 'dot'; dmg: number; turns: number }
  | { kind: 'stun'; turns: number }
  | { kind: 'taunt'; turns: number }
) & { fresh?: boolean };

export interface Unit extends UnitSetup {
  uid: string;
  side: Side;
  isEcho?: boolean;
  hp: number;
  maxHp: number;
  shield: number;
  shieldTurns: number;
  energy: number;
  /** skill cooldown remaining (in own turns) */
  cd: number;
  /** action value until this unit acts */
  av: number;
  statuses: Status[];
  alive: boolean;
}

export interface BattleSetup {
  allies: UnitSetup[];
  waves: UnitSetup[][];
  echoes?: UnitSetup[];
  seed: number;
}

export type Outcome = 'win' | 'lose';

export interface BattleState {
  units: Unit[];
  /** remaining waves after the current one */
  pendingWaves: UnitSetup[][];
  wave: number;
  totalWaves: number;
  /** total elapsed action value */
  elapsed: number;
  nextEchoRound: number;
  /** uid of the unit whose turn it is, or null when finished */
  active: string | null;
  outcome: Outcome | null;
  rng: number;
  actions: number;
  uidCounter: number;
}

export type BattleEvent =
  | { t: 'turn'; uid: string }
  | { t: 'action'; uid: string; kind: AbilityKind; name: string }
  | { t: 'damage'; src: string; tgt: string; amount: number; crit: boolean; adv: boolean; absorbed: number; dot?: boolean }
  | { t: 'heal'; tgt: string; amount: number }
  | { t: 'shield'; tgt: string; amount: number }
  | { t: 'status'; tgt: string; kind: Status['kind']; stat?: BuffStat; resisted?: boolean }
  | { t: 'cleanse'; tgt: string }
  | { t: 'energy'; tgt: string; amount: number }
  | { t: 'stunned'; uid: string }
  | { t: 'ko'; uid: string }
  | { t: 'wave'; wave: number }
  | { t: 'echo'; uid: string }
  | { t: 'end'; outcome: Outcome };

export type BattleAction = { kind: AbilityKind; target?: string } | { kind: 'auto' };
