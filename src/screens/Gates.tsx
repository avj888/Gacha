import { useState } from 'react';
import { Portrait } from '../art/Portrait';
import { GATES, PLAYER, RANKS } from '../config/balance';
import { GATE_MAP, gatesOfTier, type GateDef } from '../data/gates';
import { trialInfo } from '../data/trials';
import { canSweep, frontierGate, gateUnlocked, gateXp, tierUnlocked, trialAvailable } from '../engine/game';
import { nextRank } from '../engine/progression';
import { startGateBattle, startTrial } from '../store/battleFlow';
import { useGame } from '../store/gameStore';
import { toast } from '../store/uiStore';
import { Button, CurrencyBar, ElementTag, Modal, ScreenHead, Stars, StaminaIcon, SystemPanel } from '../ui/kit';
import { fmt } from '../ui/meta';
import type { Rank } from '../types';
import s from './Gates.module.css';

export function Gates() {
  const save = useGame((g) => g.save);
  const sweep = useGame((g) => g.sweep);
  const front = frontierGate(save);
  const [tier, setTier] = useState<Rank>(front?.tier ?? 'E');
  const [open, setOpen] = useState<GateDef | null>(null);
  const tr = trialAvailable(save);
  const nr = nextRank(save.player.rank);

  const enter = (g: GateDef) => {
    const err = startGateBattle(g.id);
    if (err) toast(err, 'bad');
  };
  const doSweep = (g: GateDef, n: number) => {
    const r = sweep(g.id, n);
    if ('error' in r) return toast(r.error, 'bad');
    toast(`Swept ×${r.runs}: +${fmt(r.rewards.gold)} gold, +${fmt(r.rewards.essence)} essence, +${fmt(r.rewards.xp)} XP${r.levelUps ? ` · LEVEL UP` : ''}`, 'good');
  };

  return (
    <>
      <ScreenHead title="Gates" backable={false} right={<CurrencyBar gold={false} />} />
      {tr ? (
        <SystemPanel title="SYSTEM // RANK TRIAL" className={s.trial}>
          <p style={{ marginBottom: 4 }}>
            Trial unlocked: defeat <b>{trialInfo(tr as Exclude<Rank, 'E'>).name}</b> alone to become a <b>{tr}-Rank</b> hunter.
          </p>
          <p className="dim" style={{ fontSize: 12, marginBottom: 10 }}>“{trialInfo(tr as Exclude<Rank, 'E'>).line}” · Solo fight · Free to retry</p>
          <Button variant="primary" block onClick={() => { const e = startTrial(); if (e) toast(e, 'bad'); }}>Begin Trial</Button>
        </SystemPanel>
      ) : nr ? (
        <p className="faint" style={{ fontSize: 12, marginBottom: 10 }}>
          Next rank trial ({nr}) unlocks at Lv {PLAYER.trialLevel[nr as keyof typeof PLAYER.trialLevel]}. You're Lv {save.player.level}.
        </p>
      ) : null}

      <div className={s.tiers} role="tablist" aria-label="Gate tier">
        {RANKS.map((r) => {
          const unlocked = tierUnlocked(save, r);
          return (
            <button key={r} type="button" role="tab" className={s.tier} aria-pressed={tier === r} aria-selected={tier === r} disabled={!unlocked} onClick={() => setTier(r)} aria-label={`${r} tier${unlocked ? '' : ' (locked)'}`}>
              {r}
              <small>{unlocked ? `${gatesOfTier(r).filter((g) => save.gates[g.id]?.cleared).length}/10` : '🔒'}</small>
            </button>
          );
        })}
      </div>

      <div className={s.path}>
        {gatesOfTier(tier).map((g) => {
          const p = save.gates[g.id];
          const unlocked = gateUnlocked(save, g);
          return (
            <button
              key={g.id}
              type="button"
              className={`${s.node} ${p?.cleared ? s.cleared : ''} ${front?.id === g.id && !p?.cleared ? s.frontier : ''}`}
              disabled={!unlocked}
              onClick={() => setOpen(g)}
            >
              <span className={s.gid}>{g.id}</span>
              <span className="grow">
                <div className={s.gname}>{g.name}</div>
                <div className={s.gsub}>
                  <ElementTag element={g.element} />
                  <span>Boss: {g.bossName}</span>
                </div>
              </span>
              <span className={s.gright}>
                <Stars count={p?.bestStars ?? 0} max={3} size={11} />
                <span className={s.cost}><StaminaIcon />{g.cost}</span>
                {p?.bound ? <span className={s.echoMark}>ECHO</span> : null}
              </span>
            </button>
          );
        })}
      </div>

      <Modal open={!!open} onClose={() => setOpen(null)} label="Gate details">
        {open ? <GateSheet gate={open} onEnter={() => enter(open)} onSweep={(n) => doSweep(open, n)} /> : null}
      </Modal>
    </>
  );
}

function GateSheet({ gate, onEnter, onSweep }: { gate: GateDef; onEnter: () => void; onSweep: (n: number) => void }) {
  const save = useGame((g) => g.save);
  const p = save.gates[gate.id];
  const sweepable = canSweep(save, gate.id);
  const xp = gateXp(GATE_MAP[gate.id]);
  return (
    <>
      <div className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
        <Portrait id={gate.bossKey + gate.id} cls="boss" element={gate.element} rarity="boss" size={84} />
        <div className="col grow" style={{ gap: 4 }}>
          <span className="faint display" style={{ fontSize: 11 }}>{gate.tier}-TIER GATE · {gate.id}</span>
          <h3 style={{ fontSize: 17 }}>{gate.name}</h3>
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            <ElementTag element={gate.element} />
            <Stars count={p?.bestStars ?? 0} max={3} />
          </div>
          <span className="dim" style={{ fontSize: 12 }}>2 waves + boss <b>{gate.bossName}</b>{p?.bound ? ' (bound as Echo)' : ''}</span>
        </div>
      </div>
      <div style={{ marginTop: 10 }}>
        <div className={s.sheetRow}><span className="dim">Stamina</span><span>{gate.cost}</span></div>
        <div className={s.sheetRow}><span className="dim">Hunter XP</span><span>{fmt(xp)}{!p?.cleared ? ` (first clear ×${GATES.firstClearXpMult})` : ''}</span></div>
        <div className={s.sheetRow}><span className="dim">Gold / Essence</span><span>{fmt(gate.cost * GATES.goldPerStamina)} / {fmt(gate.cost * GATES.essencePerStamina)}</span></div>
        <div className={s.sheetRow}><span className="dim">Boss drops</span><span style={{ textTransform: 'capitalize' }}>{gate.element} Cores</span></div>
        {!p?.cleared ? <div className={s.sheetRow}><span className="dim">First clear</span><span>+{GATES.firstClearCrystals[gate.tier]} Crystals</span></div> : null}
        {(p?.bestStars ?? 0) < 3 ? <div className={s.sheetRow}><span className="dim">First 3★</span><span>+{GATES.threeStarCrystals[gate.tier]} Crystals · unlocks Sweep</span></div> : null}
      </div>
      <p className="faint" style={{ fontSize: 11, marginTop: 8 }}>
        ★ clear · ★ no hunter KO'd · ★ under 15 turns. Each clear has a {GATES.redGateChance * 100}% chance to open a Red Gate. Sweeps give {GATES.sweepXpMult * 100}% XP.
      </p>
      <div className={s.sheetActions}>
        <Button variant="primary" block onClick={onEnter}>Enter Gate · {gate.cost} ⚡</Button>
        <Button block disabled={!sweepable} onClick={() => onSweep(1)}>Sweep ×1</Button>
        <Button block disabled={!sweepable} onClick={() => onSweep(5)}>Sweep ×5</Button>
      </div>
    </>
  );
}
