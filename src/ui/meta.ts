import type { Element, HunterClass, Rarity } from '../types';

export const ELEMENT_COLOR: Record<Element, string> = {
  flame: '#ff6a3d',
  frost: '#6fd3ff',
  storm: '#ffd84a',
  void: '#a46bff',
  radiant: '#fff0b3',
  rift: '#46f0c8',
};
export const ELEMENT_LABEL: Record<Element, string> = {
  flame: 'Flame', frost: 'Frost', storm: 'Storm', void: 'Void', radiant: 'Radiant', rift: 'Rift',
};
export const RARITY_COLOR: Record<Rarity, string> = { R: '#4aa3ff', SR: '#b26bff', SSR: '#ffc23d', MR: '#ff5cf0' };
export const RARITY_STARS: Record<Rarity, number> = { R: 3, SR: 4, SSR: 5, MR: 6 };
export const RARITY_LABEL: Record<Rarity, string> = { R: 'R', SR: 'SR', SSR: 'SSR', MR: 'MYTHIC' };
/** CSS rainbow used for Mythic accents */
export const MYTHIC_GRADIENT = 'linear-gradient(90deg, #ff5c8a, #ffc23d, #5cf08a, #46c8f0, #a46bff, #ff5cf0)';
export const CLASS_LABEL: Record<HunterClass, string> = {
  striker: 'Striker', assassin: 'Assassin', ranger: 'Ranger', mage: 'Mage', tank: 'Tank', healer: 'Healer',
};
export const CLASSES: HunterClass[] = ['striker', 'assassin', 'ranger', 'mage', 'tank', 'healer'];

export const fmt = (n: number) => {
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M';
  if (n >= 1e4) return (n / 1e3).toFixed(n >= 1e5 ? 0 : 1) + 'K';
  return Math.floor(n).toLocaleString('en-US');
};
export const pct = (n: number, digits = 1) => (n * 100).toFixed(digits) + '%';
