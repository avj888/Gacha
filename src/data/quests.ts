export type QuestKind = 'gate_clear' | 'stamina' | 'summon' | 'level' | 'ult' | 'boss' | 'three_star' | 'sweep' | 'red_gate';

export interface QuestDef {
  id: string;
  kind: QuestKind;
  target: number;
  text: string;
}

export const DAILY_POOL: QuestDef[] = [
  { id: 'd-clear3', kind: 'gate_clear', target: 3, text: 'Clear 3 gates' },
  { id: 'd-clear6', kind: 'gate_clear', target: 6, text: 'Clear 6 gates' },
  { id: 'd-stam60', kind: 'stamina', target: 60, text: 'Spend 60 stamina' },
  { id: 'd-stam100', kind: 'stamina', target: 100, text: 'Spend 100 stamina' },
  { id: 'd-level3', kind: 'level', target: 3, text: 'Level up hunters 3 times' },
  { id: 'd-ult5', kind: 'ult', target: 5, text: 'Unleash 5 ultimates' },
  { id: 'd-boss3', kind: 'boss', target: 3, text: 'Defeat 3 gate bosses' },
  { id: 'd-sweep2', kind: 'sweep', target: 2, text: 'Sweep 2 gates' },
  { id: 'd-summon1', kind: 'summon', target: 1, text: 'Perform 1 summon' },
];

export const WEEKLY_POOL: QuestDef[] = [
  { id: 'w-clear30', kind: 'gate_clear', target: 30, text: 'Clear 30 gates this week' },
  { id: 'w-stam600', kind: 'stamina', target: 600, text: 'Spend 600 stamina this week' },
  { id: 'w-ult40', kind: 'ult', target: 40, text: 'Unleash 40 ultimates this week' },
  { id: 'w-boss20', kind: 'boss', target: 20, text: 'Defeat 20 gate bosses this week' },
];

export const QUEST_MAP: Record<string, QuestDef> = Object.fromEntries([...DAILY_POOL, ...WEEKLY_POOL].map((q) => [q.id, q]));
