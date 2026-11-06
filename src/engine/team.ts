import { PLAYER } from '../config/balance';
import { getHunter } from '../data/hunters';
import { PLAYER_KIT } from '../data/player';
import { BOSSES } from '../data/enemies';
import { GATE_MAP } from '../data/gates';
import type { Save } from '../save/schema';
import type { StatMods } from '../types';
import type { UnitSetup } from './battle/types';
import { activePassives, applyMods, hunterStats, playerStats, rankIndex, roundStats } from './progression';

export const teamSize = (save: Save) => PLAYER.teamSlots[save.player.rank];
export const echoSize = (save: Save) => PLAYER.echoSlots[save.player.rank];

export const activeTeam = (save: Save): string[] =>
  save.team.slots.slice(0, teamSize(save)).filter((id): id is string => !!id && !!save.hunters[id]);

export function playerUnit(save: Save): UnitSetup {
  return {
    id: 'player',
    name: save.player.name || 'Awakened',
    cls: 'awakened',
    element: 'rift',
    portrait: 'player',
    isPlayer: true,
    stats: playerStats(save.player.level, save.player.rank),
    kit: PLAYER_KIT,
    startEnergy: 20,
  };
}

/** Player + active hunters with their passives, and team-wide passive bonuses applied. */
export function buildAllies(save: Save, opts: { solo?: boolean } = {}): UnitSetup[] {
  const ids = opts.solo ? [] : activeTeam(save);
  const team: StatMods = {};
  const hunters: UnitSetup[] = ids.map((id) => {
    const def = getHunter(id);
    const owned = save.hunters[id];
    let startEnergy = 0;
    for (const p of activePassives(def, owned.stars)) {
      if (p.startEnergy) startEnergy += p.startEnergy;
      if (p.teamStats) for (const [k, v] of Object.entries(p.teamStats)) team[k as keyof StatMods] = (team[k as keyof StatMods] ?? 0) + v!;
    }
    return {
      id,
      name: def.name.split(' ')[0],
      cls: def.cls,
      element: def.element,
      portrait: def.rarity,
      stats: hunterStats(id, owned),
      kit: { basic: def.kit.basic, skill: def.kit.skill, ultimate: def.kit.ultimate },
      startEnergy,
    };
  });
  const all = [playerUnit(save), ...hunters];
  return all.map((u) => ({ ...u, stats: roundStats(applyMods(u.stats, team)) }));
}

/** Bound echoes scale off the player's power so early bindings stay useful. */
export function buildEchoes(save: Save): UnitSetup[] {
  const ps = playerStats(save.player.level, save.player.rank);
  return save.team.echoes
    .slice(0, echoSize(save))
    .filter((id): id is string => !!id && save.echoes.includes(id))
    .map((gateId) => {
      const gate = GATE_MAP[gateId];
      const boss = BOSSES.find((b) => b.key === gate.bossKey)!;
      const mult = 0.75 + gate.tierIndex * 0.1 + rankIndex(save.player.rank) * 0.02;
      return {
        id: `echo-${gateId}`,
        name: `${boss.name} Echo`,
        cls: 'boss' as const,
        element: boss.element,
        portrait: 'boss' as const,
        stats: { ...ps, atk: Math.round(ps.atk * mult) },
        kit: boss.kit,
      };
    });
}
