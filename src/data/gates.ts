import { ELEMENTS, GATES, RANKS, STAMINA } from '../config/balance';
import type { HunterElement, Rank } from '../types';
import type { UnitSetup } from '../engine/battle/types';
import { BOSSES, MOBS, bossUnit, mobUnit } from './enemies';

export interface GateDef {
  id: string;
  tier: Rank;
  tierIndex: number;
  n: number;
  /** global index 0..59 */
  g: number;
  name: string;
  element: HunterElement;
  cost: number;
  bossKey: string;
  bossName: string;
}

const LOCALES = [
  'Canal Breach', 'Rail Yard Tear', 'Night Market Fissure', 'Foundry Rift', 'Overpass Hollow',
  'Tidegate Wound', 'Subway Maw', 'Rooftop Spiral', 'Cathedral Crack', 'Harbor Scar',
  'Arcade Sinkhole', 'Old Mill Breach', 'Signal Tower Rift', 'Greenhouse Bloom', 'Tram Depot Gash',
  'Library Fault', 'Lantern Row Tear', 'Reservoir Rift', 'Stadium Crater', 'Skybridge Split',
];

const MOB_COUNT = [2, 3, 3, 4, 4, 4];
const BOSS_ADDS = [0, 0, 1, 1, 2, 2];

export const GATE_LIST: GateDef[] = RANKS.flatMap((tier, ti) =>
  Array.from({ length: GATES.perTier }, (_, i) => {
    const g = ti * GATES.perTier + i;
    const element = ELEMENTS[(g * 3 + ti) % ELEMENTS.length];
    const pool = BOSSES.filter((b) => b.element === element);
    const boss = pool[(g + ti) % pool.length];
    return {
      id: `${tier}-${i + 1}`,
      tier,
      tierIndex: ti,
      n: i + 1,
      g,
      name: LOCALES[(g * 7) % LOCALES.length],
      element,
      cost: STAMINA.cost[tier],
      bossKey: boss.key,
      bossName: boss.name,
    };
  }),
);

export const GATE_MAP: Record<string, GateDef> = Object.fromEntries(GATE_LIST.map((g) => [g.id, g]));
export const gatesOfTier = (t: Rank) => GATE_LIST.filter((g) => g.tier === t);

/** Build enemy waves (2 mob waves + boss wave). `mult` scales stats (Red Gates). */
export function gateWaves(gate: GateDef, mult = 1): UnitSetup[][] {
  const themed = MOBS.filter((m) => m.element === gate.element);
  const others = MOBS.filter((m) => m.element !== gate.element);
  const count = MOB_COUNT[gate.tierIndex];
  const wave = (w: number) =>
    Array.from({ length: count }, (_, i) => {
      const k = gate.g + w * 3 + i;
      const m = i % 3 === 2 ? others[k % others.length] : themed[k % themed.length];
      return mobUnit(m, gate.g, mult);
    });
  const boss = BOSSES.find((b) => b.key === gate.bossKey)!;
  const adds = Array.from({ length: BOSS_ADDS[gate.tierIndex] }, (_, i) => mobUnit(themed[(gate.g + i) % themed.length], gate.g, mult * 0.9));
  const waves: UnitSetup[][] = [];
  for (let w = 0; w < GATES.waves; w++) waves.push(wave(w));
  waves.push([bossUnit(boss, gate.g, mult), ...adds]);
  return waves;
}
