import { TRIALS } from '../config/balance';
import type { Rank } from '../types';
import type { UnitSetup } from '../engine/battle/types';
import { enemyStats } from './enemies';

type TrialRank = Exclude<Rank, 'E'>;

const TRIAL_BOSSES: Record<TrialRank, { name: string; element: UnitSetup['element']; line: string }> = {
  D: { name: 'Warden of the First Threshold', element: 'storm', line: 'Prove that you can stand, Awakened.' },
  C: { name: 'The Hollow Examiner', element: 'void', line: 'Many reach this door. Few walk through it.' },
  B: { name: 'Pyre Arbiter', element: 'flame', line: 'Burn away what you were.' },
  A: { name: 'Glacial Magistrate', element: 'frost', line: 'Stillness is the final test of motion.' },
  S: { name: 'The Lattice Sovereign', element: 'radiant', line: 'You hear me. Now face me.' },
};

export const trialInfo = (r: TrialRank) => TRIAL_BOSSES[r];

export function trialBoss(r: TrialRank): UnitSetup {
  const t = TRIAL_BOSSES[r];
  const s = enemyStats(TRIALS.gateIndex[r]);
  return {
    id: `trial-${r}`,
    name: t.name,
    cls: 'boss',
    element: t.element,
    portrait: 'boss',
    isBoss: true,
    stats: { ...s, hp: Math.round(s.hp * TRIALS.hpMult), atk: Math.round(s.atk * TRIALS.atkMult) },
    kit: {
      basic: { name: 'Verdict', desc: '', effects: [{ type: 'damage', target: 'enemy', mult: 1 }] },
      skill: { name: 'Weighing', desc: '', cooldown: 3, effects: [{ type: 'damage', target: 'enemy', mult: 1.3 }, { type: 'debuff', target: 'enemy', stat: 'atk', amount: 0.15, turns: 2 }] },
      ultimate: { name: 'Threshold Collapse', desc: '', effects: [{ type: 'damage', target: 'enemy', mult: 2.0 }] },
    },
  };
}
