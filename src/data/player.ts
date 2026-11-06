import type { UnitKit } from '../engine/battle/types';

/** The Awakened — the player's own kit. Grows with rank in the battle setup. */
export const PLAYER_KIT: UnitKit = {
  basic: { name: 'Rift Edge', desc: 'Strike one enemy for 110% ATK.', effects: [{ type: 'damage', target: 'enemy', mult: 1.1 }] },
  skill: {
    name: 'Fracture Step',
    desc: 'Deal 200% ATK to one enemy and gain +20% ATK for 2 turns.',
    cooldown: 3,
    effects: [{ type: 'damage', target: 'enemy', mult: 2.0 }, { type: 'buff', target: 'self', stat: 'atk', amount: 0.2, turns: 2 }],
  },
  ultimate: {
    name: 'Riftbreak',
    desc: 'Tear the Rift open: 280% ATK to all enemies, then heal self for 15% max HP.',
    effects: [{ type: 'damage', target: 'allEnemies', mult: 2.8 }, { type: 'heal', target: 'self', mult: 0.15, of: 'maxHp' }],
  },
};
