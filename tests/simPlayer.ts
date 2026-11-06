/**
 * A scripted "greedy free player" that plays RIFTBORN through the real engines.
 * Time model (a human mixing auto/2x and manual): battle = 12s menus/results + 0.7s per action;
 * sweep = 4s; summon = 10s; every decision loop (team/upgrades/quests) = 4s.
 */
import { GACHA, GATES, PLAYER } from '../src/config/balance';
import { GATE_LIST, GATE_MAP, gateWaves } from '../src/data/gates';
import { trialBoss } from '../src/data/trials';
import { createBattle, step } from '../src/engine/battle/battle';
import type { BattleSetup, BattleState } from '../src/engine/battle/types';
import { getBanners, pullTen } from '../src/engine/gacha';
import {
  ascendHunter, bindEcho, canAscend, canSweep, claimQuest, completeTrial, enterGate, ensureQuests,
  finishGate, frontierGate, gateUnlocked, gateXp, levelUpHunter, sweepGate, trialAvailable,
} from '../src/engine/game';
import { hunterStats, levelUpCost, power, receiveHunter } from '../src/engine/progression';
import { mulberry32 } from '../src/engine/rng';
import { currentStamina, msToNextStamina } from '../src/engine/stamina';
import { buildAllies, buildEchoes, teamSize } from '../src/engine/team';
import { defaultSave, type Save } from '../src/save/schema';
import type { Rank } from '../src/types';

export interface SimLog {
  t: number;
  msg: string;
}

function fight(setup: BattleSetup) {
  let { state } = createBattle(setup);
  let ults = 0;
  let guard = 0;
  while (!state.outcome && guard++ < 5000) {
    const r = step(state, { kind: 'auto' });
    ults += r.events.filter((e) => e.t === 'action' && e.kind === 'ultimate' && e.uid.startsWith('a')).length;
    state = r.state;
  }
  return { state: state as BattleState, ults };
}

export function simulate(opts: { seed: number; maxSeconds: number; untilRank: Rank; verbose?: boolean }) {
  const T0 = Date.UTC(2026, 0, 5, 10); // a Monday morning
  let now = T0;
  const end = T0 + opts.maxSeconds * 1000;
  const d: Save = defaultSave(now);
  const rng = mulberry32(opts.seed);
  const log: SimLog[] = [];
  const rankAt: Partial<Record<Rank, number>> = { E: 0 };
  const activeAt: Partial<Record<Rank, number>> = { E: 0 };
  let idle = 0;
  let battles = 0;
  let losses = 0;
  let minCrystals = d.currency.crystals;
  const fails: Record<string, number> = {};
  const say = (msg: string) => log.push({ t: (now - T0) / 1000, msg });
  const spend = (s: number) => (now += s * 1000);

  const pickTeam = () => {
    const ids = Object.keys(d.hunters)
      .map((id) => ({ id, pw: power(hunterStats(id, d.hunters[id])) }))
      .sort((a, b) => b.pw - a.pw)
      .slice(0, teamSize(d))
      .map((x) => x.id);
    d.team.slots = [...ids, null, null, null, null].slice(0, 4);
  };

  const summon = () => {
    const banners = getBanners(now);
    for (const b of banners) {
      const bs = d.gacha.banners[b.id];
      while (d.currency.crystals >= GACHA.costTen && (b.kind !== 'beginner' || bs.totalPulls + 10 <= GACHA.beginner.maxPulls)) {
        if (b.kind === 'featured' && d.gacha.banners.beginner.totalPulls + 10 <= GACHA.beginner.maxPulls) break;
        const out = pullTen(d.gacha.banners[b.id], b, rng);
        d.gacha.banners[b.id] = out.state;
        d.currency.crystals -= GACHA.costTen;
        minCrystals = Math.min(minCrystals, d.currency.crystals);
        for (const r of out.results) {
          const rec = receiveHunter(d.hunters[r.hunterId], r.hunterId, now);
          d.hunters[r.hunterId] = rec.owned;
          d.currency.crystals += rec.crystals;
        }
        spend(10);
        say(`summon x10 on ${b.id}: ${out.results.filter((r) => r.rarity !== 'R').map((r) => r.rarity + ':' + r.hunterId).join(', ')}`);
        if (b.kind !== 'beginner') return;
      }
    }
  };

  const invest = () => {
    // level the team evenly, lowest first, keep 20% of essence? no: greedy spend
    for (let guard = 0; guard < 500; guard++) {
      const team = d.team.slots.filter((x): x is string => !!x);
      for (const id of team) if (canAscend(d, id)) ascendHunter(d, id);
      const lowest = team.sort((a, b) => d.hunters[a].level - d.hunters[b].level).find((id) => levelUpHunter(d, id, 1) > 0);
      if (!lowest) break;
    }
  };

  const runGate = (gateId: string, red = false): boolean => {
    const gate = GATE_MAP[gateId];
    if (!red) {
      const st = currentStamina(d.stamina, now).value;
      if (st < gate.cost) {
        const need = gate.cost - st;
        const wait = msToNextStamina(d.stamina, now) + (need - 1) * 6 * 60000;
        idle += wait / 1000;
        now += wait;
      }
      const ok = enterGate(d, gateId, now);
      if ('error' in ok) throw new Error(ok.error);
    }
    const { state, ults } = fight({
      allies: buildAllies(d),
      waves: gateWaves(gate, red ? 1.45 : 1),
      echoes: buildEchoes(d),
      seed: (rng.next() * 2 ** 32) >>> 0,
    });
    battles++;
    spend(12 + state.actions * 0.7);
    const res = finishGate(d, gateId, state, { red, ultimates: ults }, rng, now);
    if (!res.win) {
      losses++;
      fails[gateId] = (fails[gateId] ?? 0) + 1;
      return false;
    }
    if (res.first && opts.verbose) say(`first clear ${gateId} ★${res.stars} (r${res.rounds}) lv${d.player.level}`);
    if (res.canBind && d.echoes.length < PLAYER.maxEchoes + 3) bindEcho(d, gateId);
    if (res.redGateRolled) {
      const ok = runGate(gateId, true);
      say(`red gate ${gateId}: ${ok ? 'cleared' : 'failed'}`);
    }
    return true;
  };

  ensureQuests(d, now);
  summon();
  pickTeam();

  while (now < end && d.player.rank !== opts.untilRank) {
    spend(4);
    ensureQuests(d, now);
    for (const q of [...d.quests.daily, d.quests.weekly!]) claimQuest(d, q.id, now);
    summon();
    pickTeam();
    invest();

    const tr = trialAvailable(d);
    if (tr) {
      const { state } = fight({ allies: buildAllies(d, { solo: true }), waves: [[trialBoss(tr as Exclude<Rank, 'E'>)]], seed: (rng.next() * 2 ** 32) >>> 0 });
      spend(12 + state.actions * 0.7);
      if (completeTrial(d, state.outcome === 'win')) {
        rankAt[d.player.rank] = (now - T0) / 1000;
        activeAt[d.player.rank] = (now - T0) / 1000 - idle;
        say(`RANK UP -> ${d.player.rank} at lv ${d.player.level}`);
        pickTeam();
        continue;
      } else if (opts.verbose) say(`trial ${tr} failed at lv ${d.player.level}`);
    }

    const front = frontierGate(d)!;
    const frontFails = fails[front.id] ?? 0;
    const frontCleared = !!d.gates[front.id]?.cleared;
    if (!frontCleared && frontFails < 2) {
      runGate(front.id);
      continue;
    }
    // farm by XP per stamina: battle the best cleared gate (full XP) unless a sweep (half XP, 4s) is at least as good
    const cleared = GATE_LIST.filter((g) => gateUnlocked(d, g) && d.gates[g.id]?.cleared);
    const sweepable = cleared.filter((g) => canSweep(d, g.id));
    const bestBattle = cleared[cleared.length - 1];
    const bestSweep = sweepable[sweepable.length - 1];
    const xps = (g: (typeof GATE_LIST)[number], mult: number) => (gateXp(g) * mult) / g.cost;
    if (bestSweep && (!bestBattle || xps(bestSweep, GATES.sweepXpMult) >= xps(bestBattle, 1))) {
      const st = currentStamina(d.stamina, now).value;
      if (st < bestSweep.cost) {
        const wait = msToNextStamina(d.stamina, now) + (bestSweep.cost - st - 1) * 6 * 60000;
        idle += wait / 1000;
        now += wait;
      }
      sweepGate(d, bestSweep.id, 1, rng, now);
      spend(4);
    } else if (bestBattle) {
      if (!runGate(bestBattle.id) && cleared.length > 1) runGate(cleared[cleared.length - 2].id);
    } else {
      runGate(front.id);
    }
    // give the frontier another go after progress
    if (frontFails >= 2 && rng.next() < 0.25) fails[front.id] = 1;
  }

  return {
    save: d,
    rankAt,
    activeAt,
    seconds: (now - T0) / 1000,
    idle,
    battles,
    losses,
    minCrystals,
    log,
    essenceLeft: d.currency.essence,
    goldLeft: d.currency.gold,
    nextLevelCost: levelUpCost(20),
  };
}
