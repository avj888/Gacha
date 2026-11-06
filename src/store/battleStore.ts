import { create } from 'zustand';
import { createBattle } from '../engine/battle/battle';
import type { BattleEvent, BattleSetup, BattleState } from '../engine/battle/types';
import type { Rank } from '../types';
import { navigate } from './router';

export type BattleKind = 'gate' | 'red' | 'trial' | 'training';

export interface BattleSession {
  kind: BattleKind;
  title: string;
  subtitle?: string;
  gateId?: string;
  rank?: Rank;
  canRetreat: boolean;
  state: BattleState;
  initialEvents: BattleEvent[];
  startedAt: number;
}

interface BattleStore {
  session: BattleSession | null;
  start: (opts: Omit<BattleSession, 'state' | 'initialEvents' | 'startedAt'> & { setup: BattleSetup }) => void;
  setState: (s: BattleState) => void;
  clear: () => void;
}

export const useBattle = create<BattleStore>((set, get) => ({
  session: null,
  start: ({ setup, ...rest }) => {
    const { state, events } = createBattle(setup);
    set({ session: { ...rest, state, initialEvents: events, startedAt: Date.now() } });
    navigate('battle');
  },
  setState: (state) => {
    const s = get().session;
    if (s) set({ session: { ...s, state } });
  },
  clear: () => set({ session: null }),
}));
