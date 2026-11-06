# RIFTBORN

Rise from the lowest rank. **RIFTBORN** is a mobile-first, offline, installable gacha RPG.
You are the *Awakened*, an E-rank hunter in the city of Vantor. Rifts tear open across the
city, and a System voice called **LATTICE** issues your directives.

All names, characters, art and lore are original. Art is procedural SVG, audio is synthesized
with WebAudio. There's no backend, no accounts, no ads and no real-money purchases.

## Play

- **Live:** https://avj888.github.io/Gacha/ (after GitHub Pages is enabled, see Deploy)
- **Local:** `npm install && npm run dev`, then open the printed URL (append `/Gacha/`).

### Install on your phone

**iPhone (Safari):** open the URL in Safari → tap **Share** → **Add to Home Screen** → **Add**.
Launch RIFTBORN from the home-screen icon. It runs full-screen and works offline after the first load.

**Android (Chrome):** open the URL in Chrome → tap **⋮** → **Install app** (or **Add to Home screen**) → **Install**.
Launch it from the app drawer or home screen. It works offline after the first load.

Progress is saved on the device (localStorage). Use **Settings → Export save** to back it up as a
copyable code, and **Import save** to restore it on another device.

## Core loop

Clear gates → earn Gold, Essence, Crystals → summon hunters → level and rank up → clear harder gates.

| System | Defaults (all in `src/config/balance.ts`) |
| --- | --- |
| Player | E-rank, Lv 1–100, `xpToNext = floor(100 · L^1.6)`; trials at Lv 10/25/45/70/90 for D/C/B/A/S |
| Team | Hunter slots E1 · D2 · C3 · B4 (+ player). Echo slots 1 → A2 → S3 |
| Summon | 160 / 1,600 Crystals; SSR 1%, SR 8%, R 91%; soft pity +6pp/pull from 66, hard pity 80; 50/50 featured with guarantee; 10-pull ≥ 1 SR |
| Mythic (6★) | Each SSR-tier result has a 10% chance to become Mythic; the 10th SSR-tier result without one is guaranteed (≈0.30% per pull). Doesn't use the 50/50 |
| Beginner | 20 pulls max, guaranteed SSR in the first 10-pull |
| Gates | 6 tiers × 10, 2 waves + boss, stamina 6/8/10/13/16/20; 3★ = no KO and < 15 turns → Sweep |
| Red Gate | 5% on any clear, ×1.45 enemy stats, ×3 rewards, no retreat |
| Echoes | Bind each gate boss once; acts every 3 turns |
| Stamina | 120 max, +1 / 6 min, +40 per player level-up |
| Quests | 3 dailies (20 Crystals each) + 1 weekly (300) |
| Damage | `ATK · mult · 100/(100+DEF) · element(1.3 on advantage) · crit · rand(0.95–1.05)` |

Element loop: Flame > Frost > Storm > Flame. Void and Radiant counter each other. The player's Rift element is neutral.

## Development

```bash
npm install
npm run dev        # dev server
npm test           # unit tests (gacha 1M-pull sim, battle engine, progression, save, economy sim)
npm run build      # typecheck + production build (PWA)
npm run preview    # serve the build at http://localhost:4173/Gacha/
node scripts/smoke.mjs        # every screen at 390×844: no console errors, no horizontal scroll
node scripts/offline-check.mjs  # offline boot + save survives closing the app
node scripts/make-icons.mjs   # regenerate PNG icons from public/icons/icon.svg
```

`SIM_VERBOSE=1 npx vitest run tests/economy.test.ts` prints the simulated free-player timeline
(5 seeds of a greedy player playing through the real engines; target ≈ 2 h of active play to C-rank).

### Layout

```
src/config/balance.ts   every tunable number
src/data/               hunters (40), enemies, gates (60), trials, quests, player kit
src/engine/             pure TS: gacha, battle/, progression, stamina, game rules, team builder, rng
src/save/               versioned schema, migrations, export/import (base64 + checksum)
src/store/              Zustand game store (debounced persistence), battle session, router, flow
src/screens/            Home, Gates, Battle, Summon, Roster, Hunter Detail, Team, Quests, Settings
src/art/Portrait.tsx    procedural SVG portraits (silhouette + element aura + rarity frame)
src/audio/sfx.ts        WebAudio synth   ·   src/fx/haptics.ts  navigator.vibrate
```

## Deploy

`.github/workflows/deploy.yml` tests, builds and deploys `dist/` to GitHub Pages on every push to
`main` (and to the development branch). One-time setup: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
