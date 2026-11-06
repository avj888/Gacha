import { CURRENT_VERSION, defaultSave, type Save } from './schema';

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnySave = Record<string, any>;

/**
 * Migration chain: MIGRATIONS[n] upgrades a save at version n to version n+1.
 * Never edit an old migration once shipped; add a new one and bump SAVE.version.
 */
export const MIGRATIONS: Record<number, (s: AnySave) => AnySave> = {
  // v0: pre-release prototype saves ({ crystals, roster: string[] }) -> v1
  0: (s) => {
    const base = defaultSave(s.createdAt ?? Date.now()) as AnySave;
    const hunters: AnySave = {};
    for (const id of (s.roster as string[] | undefined) ?? []) {
      hunters[id] = { level: 1, stars: 0, ascension: 0, obtainedAt: base.createdAt };
    }
    return {
      ...base,
      currency: { ...base.currency, crystals: s.crystals ?? base.currency.crystals },
      hunters: Object.keys(hunters).length ? hunters : base.hunters,
      version: 1,
    };
  },
  // v1 -> v2: Mythic rarity spark counter on every banner, player avatar setting
  1: (s) => {
    const banners: AnySave = {};
    for (const [id, b] of Object.entries((s.gacha?.banners ?? {}) as AnySave)) banners[id] = { mrPity: 0, ...b };
    return {
      ...s,
      gacha: { ...s.gacha, banners },
      settings: { avatar: 'm', ...s.settings },
      version: 2,
    };
  },
};

export function migrate(raw: AnySave): Save {
  let s = raw;
  let v: number = typeof s.version === 'number' ? s.version : 0;
  if (v > CURRENT_VERSION) throw new Error(`Save is from a newer version (${v}) of RIFTBORN.`);
  while (v < CURRENT_VERSION) {
    const step = MIGRATIONS[v];
    if (!step) throw new Error(`No migration from save version ${v}`);
    s = step(s);
    v = s.version;
  }
  return repair(s);
}

/** Fill any missing keys from the default save (deep for plain objects). */
export function repair(s: AnySave): Save {
  return deepFill(s, defaultSave(s.createdAt ?? Date.now())) as Save;
}

function isObj(v: unknown): v is AnySave {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

// Keys whose contents are user maps (don't fill from defaults inside them).
const MAP_KEYS = new Set(['hunters', 'gates', 'banners']);

function deepFill(target: AnySave, defaults: AnySave, key = ''): AnySave {
  const out: AnySave = { ...target };
  for (const k of Object.keys(defaults)) {
    if (!(k in out) || out[k] === undefined || (out[k] === null && defaults[k] !== null)) {
      out[k] = defaults[k];
    } else if (isObj(defaults[k]) && isObj(out[k]) && !MAP_KEYS.has(k)) {
      out[k] = deepFill(out[k], defaults[k], k);
    } else if (k === 'banners' && isObj(out[k])) {
      out[k] = { ...defaults[k], ...out[k] };
    }
  }
  void key;
  return out;
}
