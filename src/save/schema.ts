import type { Figure, HunterElement, Rank, Rarity } from '../types';
import { PLAYER, SAVE, STAMINA, START } from '../config/balance';
import { emptyBannerState, type BannerState } from '../engine/gacha';
import type { OwnedHunter } from '../engine/progression';

export interface PullRecord {
  t: number;
  banner: string;
  id: string;
  rarity: Rarity;
  pity: number;
}

export interface GateProgress {
  cleared: boolean;
  bestStars: number;
  bound: boolean;
}

export interface QuestState {
  id: string;
  progress: number;
  claimed: boolean;
}

export interface Settings {
  sound: boolean;
  haptics: boolean;
  auto: boolean;
  speed2x: boolean;
  reducedMotion: 'system' | 'on' | 'off';
  /** look of the player's own Awakened portrait */
  avatar: Figure;
}

export interface SaveV2 {
  version: 2;
  createdAt: number;
  lastSeenAt: number;
  seed: number;
  player: { name: string; level: number; xp: number; rank: Rank };
  currency: { crystals: number; gold: number; essence: number; mats: Record<HunterElement, number> };
  stamina: { value: number; updatedAt: number };
  hunters: Record<string, OwnedHunter>;
  team: { slots: (string | null)[]; echoes: (string | null)[] };
  echoes: string[];
  gates: Record<string, GateProgress>;
  gacha: { banners: Record<string, BannerState>; history: PullRecord[] };
  quests: { dailyKey: string; weeklyKey: string; daily: QuestState[]; weekly: QuestState | null };
  stats: { gatesCleared: number; redGatesCleared: number; pulls: number; playMs: number };
  settings: Settings;
  tutorialSeen: boolean;
}

export type Save = SaveV2;
export const CURRENT_VERSION = SAVE.version;

export function defaultSave(now = Date.now()): Save {
  return {
    version: 2,
    createdAt: now,
    lastSeenAt: now,
    seed: (now ^ 0x5eed) >>> 0,
    player: { name: 'Awakened', level: 1, xp: 0, rank: PLAYER.startRank },
    currency: {
      crystals: START.crystals,
      gold: START.gold,
      essence: START.essence,
      mats: { flame: 0, frost: 0, storm: 0, void: 0, radiant: 0 },
    },
    stamina: { value: STAMINA.max, updatedAt: now },
    hunters: { [START.starterHunter]: { level: 1, stars: 0, ascension: 0, obtainedAt: now } },
    team: { slots: [START.starterHunter, null, null, null], echoes: [null, null, null] },
    echoes: [],
    gates: {},
    gacha: { banners: { featured: emptyBannerState(), beginner: emptyBannerState() }, history: [] },
    quests: { dailyKey: '', weeklyKey: '', daily: [], weekly: null },
    stats: { gatesCleared: 0, redGatesCleared: 0, pulls: 0, playMs: 0 },
    settings: { sound: true, haptics: true, auto: false, speed2x: false, reducedMotion: 'system', avatar: 'm' },
    tutorialSeen: false,
  };
}
