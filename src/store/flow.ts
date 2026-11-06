import type { ReactNode } from 'react';
import { battleSummary } from '../engine/battle/battle';
import type { BattleSession } from './battleStore';

export interface BattleResultView {
  win: boolean;
  stars: number;
  showStars: boolean;
  rounds: number;
  kos: number;
  lines: { label: string; value: ReactNode }[];
  notes: string[];
  actions: { label: string; variant?: 'primary' | 'gold' | 'ghost' | 'danger'; once?: boolean; run: () => void }[];
}

type Resolver = (session: BattleSession) => BattleResultView;

let resolver: Resolver | null = null;
/** Phase 3 registers the real reward resolver; default just reports the result. */
export const registerBattleResolver = (r: Resolver) => (resolver = r);

export function resolveBattle(session: BattleSession, fallbackActions: BattleResultView['actions']): BattleResultView {
  if (session.result) return session.result as BattleResultView;
  if (resolver) return resolver(session);
  const s = battleSummary(session.state);
  return { win: s.win, stars: s.stars, showStars: true, rounds: s.rounds, kos: s.kos, lines: [], notes: [], actions: fallbackActions };
}
