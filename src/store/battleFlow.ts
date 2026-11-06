import { GATES, PLAYER } from '../config/balance';
import { GATE_LIST, GATE_MAP, gateWaves } from '../data/gates';
import { trialBoss, trialInfo } from '../data/trials';
import { battleSummary } from '../engine/battle/battle';
import * as G from '../engine/game';
import { mulberry32, randomSeed } from '../engine/rng';
import { buildAllies, buildEchoes } from '../engine/team';
import type { Rank } from '../types';
import { fmt } from '../ui/meta';
import { sfx } from '../audio/sfx';
import { useBattle, type BattleSession } from './battleStore';
import { registerBattleResolver, type BattleResultView } from './flow';
import { useGame } from './gameStore';
import { navigate } from './router';
import { toast } from './uiStore';

export function startGateBattle(gateId: string, red = false): string | null {
  const game = useGame.getState();
  const gate = GATE_MAP[gateId];
  if (!gate) return 'Unknown gate';
  if (!red) {
    let err: string | null = null;
    game.update((d) => {
      const r = G.enterGate(d, gateId, Date.now());
      if ('error' in r) err = r.error;
    });
    if (err) return err;
  }
  const save = useGame.getState().save;
  useBattle.getState().start({
    kind: red ? 'red' : 'gate',
    title: red ? `RED GATE · ${gate.id}` : `${gate.id} · ${gate.name}`,
    gateId,
    canRetreat: !red,
    setup: {
      allies: buildAllies(save),
      waves: gateWaves(gate, red ? GATES.redGateStatMult : 1),
      echoes: buildEchoes(save),
      seed: randomSeed(),
    },
  });
  return null;
}

export function startTrial(): string | null {
  const save = useGame.getState().save;
  const r = G.trialAvailable(save);
  if (!r) return 'No trial available';
  const rank = r as Exclude<Rank, 'E'>;
  useBattle.getState().start({
    kind: 'trial',
    title: `RANK TRIAL · ${trialInfo(rank).name}`,
    rank,
    canRetreat: true,
    setup: { allies: buildAllies(save, { solo: true }), waves: [[trialBoss(rank)]], seed: randomSeed() },
  });
  return null;
}

const leave = (to: 'gates' | 'home' = 'gates') => {
  useBattle.getState().clear();
  navigate(to, undefined, true);
};

function resolveGate(session: BattleSession): BattleResultView {
  const gateId = session.gateId!;
  const red = session.kind === 'red';
  let res!: G.GateResult;
  useGame.getState().update((d) => {
    res = G.finishGate(d, gateId, session.state, { red, ultimates: session.state.allyUlts }, mulberry32(randomSeed()), Date.now());
  });
  const save = useGame.getState().save;
  const lines: BattleResultView['lines'] = [];
  const notes: string[] = [];
  if (res.rewards) {
    const r = res.rewards;
    lines.push({ label: 'Hunter XP', value: `+${fmt(r.xp)}` });
    lines.push({ label: 'Gold', value: `+${fmt(r.gold)}` });
    lines.push({ label: 'Essence', value: `+${fmt(r.essence)}` });
    for (const [el, n] of Object.entries(r.mats)) lines.push({ label: `${el[0].toUpperCase() + el.slice(1)} Cores`, value: `+${n}` });
    if (r.crystals) lines.push({ label: 'Crystals', value: `+${r.crystals}` });
    if (res.first) notes.push('FIRST CLEAR');
    if (res.newThree) notes.push('3★ — SWEEP UNLOCKED');
    if (res.levelUps) {
      notes.push(`LEVEL UP → Lv ${save.player.level} (+${res.levelUps * PLAYER.levelUpStamina} stamina)`);
      sfx('levelup');
    }
    const tr = G.trialAvailable(save);
    if (tr && res.levelUps) notes.push(`RANK TRIAL FOR ${tr} AVAILABLE`);
  } else if (!res.win) {
    notes.push('Level up your hunters, or bring an element advantage.');
  }

  const actions: BattleResultView['actions'] = [];
  if (res.redGateRolled) {
    notes.push('⚠ A RED GATE HAS OPENED. 3× rewards, no retreat.');
    actions.push({ label: 'Enter Red Gate', variant: 'danger', run: () => { useBattle.getState().clear(); startGateBattle(gateId, true); } });
  }
  if (res.win && res.canBind && !save.gates[gateId]?.bound) {
    actions.push({
      label: `Bind ${GATE_MAP[gateId].bossName} as Echo`,
      variant: 'gold',
      once: true,
      run: () => {
        if (useGame.getState().bindEcho(gateId)) toast(`${GATE_MAP[gateId].bossName} Echo bound`, 'system');
      },
    });
  }
  const idx = GATE_LIST.findIndex((g) => g.id === gateId);
  const next = GATE_LIST[idx + 1];
  if (res.win && !red && next && G.gateUnlocked(save, next)) {
    actions.push({
      label: `Next: ${next.id} (${next.cost} stamina)`,
      variant: 'primary',
      run: () => {
        useBattle.getState().clear();
        const err = startGateBattle(next.id);
        if (err) {
          toast(err, 'bad');
          navigate('gates', undefined, true);
        }
      },
    });
  }
  if (!res.win && !red) {
    actions.push({
      label: `Retry (${GATE_MAP[gateId].cost} stamina)`,
      variant: 'primary',
      run: () => {
        useBattle.getState().clear();
        const err = startGateBattle(gateId);
        if (err) {
          toast(err, 'bad');
          navigate('gates', undefined, true);
        }
      },
    });
  }
  actions.push({ label: 'Back to Gates', run: () => leave('gates') });
  return { win: res.win, stars: res.stars, showStars: !red, rounds: res.rounds, kos: res.kos, lines, notes, actions };
}

function resolveTrial(session: BattleSession): BattleResultView {
  const sum = battleSummary(session.state);
  let ranked: Rank | null = null;
  useGame.getState().update((d) => void (ranked = G.completeTrial(d, sum.win)));
  const notes: string[] = [];
  const lines: BattleResultView['lines'] = [];
  if (ranked) {
    notes.push(`RANK ASCENSION: ${ranked}-RANK`);
    notes.push(`Team slots: ${PLAYER.teamSlots[ranked as Rank]} · Echo slots: ${PLAYER.echoSlots[ranked as Rank]} · ${ranked}-tier gates open`);
    lines.push({ label: 'Crystals', value: `+${PLAYER.rankUpCrystals}` });
    sfx('levelup');
  } else notes.push('The trial is free to retry. Level up and try again.');
  return {
    win: sum.win,
    stars: sum.stars,
    showStars: false,
    rounds: sum.rounds,
    kos: sum.kos,
    lines,
    notes,
    actions: [
      ...(ranked ? [{ label: 'Open Team', variant: 'gold' as const, run: () => { useBattle.getState().clear(); navigate('team', undefined, true); } }] : []),
      { label: sum.win ? 'Continue' : 'Back', variant: 'primary', run: () => leave(sum.win ? 'home' : 'gates') },
    ],
  };
}

registerBattleResolver((session) => {
  if (session.kind === 'trial') return resolveTrial(session);
  if (session.kind === 'gate' || session.kind === 'red') return resolveGate(session);
  const sum = battleSummary(session.state);
  return { win: sum.win, stars: sum.stars, showStars: true, rounds: sum.rounds, kos: sum.kos, lines: [], notes: [], actions: [{ label: 'Continue', variant: 'primary', run: () => leave() }] };
});
