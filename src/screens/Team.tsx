import { useState } from 'react';
import { Portrait } from '../art/Portrait';
import { PLAYER, RANKS } from '../config/balance';
import { GATE_MAP } from '../data/gates';
import { BOSSES } from '../data/enemies';
import { getHunter } from '../data/hunters';
import { activePassives, hunterStats, playerStats, power } from '../engine/progression';
import { echoSize, teamSize } from '../engine/team';
import { navigate } from '../store/router';
import { useGame } from '../store/gameStore';
import { Button, ElementTag, Modal, Panel, ScreenHead, Stars } from '../ui/kit';
import { CLASS_LABEL, RARITY_COLOR } from '../ui/meta';
import type { Rank } from '../types';
import s from './Team.module.css';

const rankFor = (slots: Record<Rank, number>, i: number) => RANKS.find((r) => slots[r] > i);

export function Team() {
  const save = useGame((g) => g.save);
  const setSlot = useGame((g) => g.setSlot);
  const setEchoSlot = useGame((g) => g.setEchoSlot);
  const [pick, setPick] = useState<number | null>(null);
  const [pickEcho, setPickEcho] = useState<number | null>(null);
  const size = teamSize(save);
  const esize = echoSize(save);
  const owned = Object.keys(save.hunters);

  const ps = playerStats(save.player.level, save.player.rank);
  let total = power(ps);
  const teamIds = save.team.slots.slice(0, size).filter((x): x is string => !!x && !!save.hunters[x]);
  for (const id of teamIds) total += power(hunterStats(id, save.hunters[id]));
  const teamBuffs = teamIds.flatMap((id) => activePassives(getHunter(id), save.hunters[id].stars).filter((p) => p.teamStats).map((p) => ({ id, p })));

  return (
    <div className="col" style={{ gap: 12 }}>
      <ScreenHead title="Team" right={<span className="dim num" style={{ fontSize: 13 }}>PWR {total.toLocaleString()}</span>} />
      <Panel>
        <div className={s.label}>STRIKE TEAM</div>
        <div className={s.slots}>
          <div className={s.slot}>
            <Portrait id="player" cls="awakened" element="rift" rarity="player" size={68} />
            <span className={s.slotName}>{save.player.name}</span>
            <span className={s.slotMeta}>Lv {save.player.level}</span>
          </div>
          {[0, 1, 2, 3].map((i) => {
            const locked = i >= size;
            const id = save.team.slots[i];
            const h = id && save.hunters[id] ? getHunter(id) : null;
            if (locked) {
              return (
                <div key={i} className={`${s.slot} ${s.locked}`}>
                  <div className={s.empty}>🔒</div>
                  <span className={s.slotMeta}>{rankFor(PLAYER.teamSlots, i)}-Rank</span>
                </div>
              );
            }
            return (
              <button key={i} type="button" className={s.slot} onClick={() => setPick(i)} aria-label={h ? `Slot ${i + 1}: ${h.name}` : `Empty slot ${i + 1}`}>
                {h ? <Portrait id={h.id} cls={h.cls} element={h.element} rarity={h.rarity} size={68} /> : <div className={s.empty}>+</div>}
                <span className={s.slotName}>{h ? h.name.split(' ')[0] : 'Empty'}</span>
                <span className={s.slotMeta}>{h ? `Lv ${save.hunters[id!].level}` : 'Tap to add'}</span>
              </button>
            );
          })}
        </div>
        {teamBuffs.length ? (
          <div className={s.buffs}>
            {teamBuffs.map(({ id, p }) => (
              <span key={id + p.name} className="dim" style={{ fontSize: 12 }}>Team passive · <b style={{ color: 'var(--text)' }}>{p.name}</b>: {p.desc}</span>
            ))}
          </div>
        ) : null}
      </Panel>

      <Panel>
        <div className={s.label}>BOUND ECHOES <span className="faint">· act every 3 turns</span></div>
        <div className={s.slots} style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {[0, 1, 2].map((i) => {
            const locked = i >= esize;
            const gid = save.team.echoes[i];
            const gate = gid ? GATE_MAP[gid] : null;
            const boss = gate ? BOSSES.find((b) => b.key === gate.bossKey)! : null;
            if (locked) {
              return (
                <div key={i} className={`${s.slot} ${s.locked}`}>
                  <div className={s.empty}>🔒</div>
                  <span className={s.slotMeta}>{rankFor(PLAYER.echoSlots, i)}-Rank</span>
                </div>
              );
            }
            return (
              <button key={i} type="button" className={s.slot} onClick={() => setPickEcho(i)} aria-label={boss ? `Echo slot ${i + 1}: ${boss.name}` : `Empty echo slot ${i + 1}`}>
                {boss && gate ? <Portrait id={gate.bossKey + gate.id} cls="boss" element={boss.element} rarity="boss" size={68} /> : <div className={s.empty}>+</div>}
                <span className={s.slotName}>{boss ? boss.name : 'Empty'}</span>
                <span className={s.slotMeta}>{gate ? gate.id : save.echoes.length ? 'Tap to equip' : 'Beat a boss'}</span>
              </button>
            );
          })}
        </div>
      </Panel>

      <Modal open={pick !== null} onClose={() => setPick(null)} label="Choose hunter">
        <h3 style={{ marginBottom: 10 }}>Choose a hunter</h3>
        <div className={s.pickList}>
          {owned
            .map((id) => ({ id, pw: power(hunterStats(id, save.hunters[id])) }))
            .sort((a, b) => b.pw - a.pw)
            .map(({ id, pw }) => {
              const h = getHunter(id);
              const at = save.team.slots.slice(0, size).indexOf(id);
              return (
                <button key={id} type="button" className={s.pickRow} onClick={() => { setSlot(pick!, id); setPick(null); }}>
                  <Portrait id={h.id} cls={h.cls} element={h.element} rarity={h.rarity} size={44} />
                  <span className="grow" style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: RARITY_COLOR[h.rarity] }}>{h.name}</div>
                    <div className="row" style={{ gap: 6, fontSize: 11 }}>
                      <ElementTag element={h.element} /> <span className="dim">{CLASS_LABEL[h.cls]} · Lv {save.hunters[id].level}</span>
                    </div>
                  </span>
                  <span className="col" style={{ alignItems: 'flex-end', gap: 2 }}>
                    <Stars count={save.hunters[id].stars} size={9} />
                    <span className="dim num" style={{ fontSize: 11 }}>{pw.toLocaleString()}</span>
                    {at >= 0 ? <span style={{ fontSize: 10, color: 'var(--accent)' }}>{at === pick ? 'IN SLOT' : `SLOT ${at + 1}`}</span> : null}
                  </span>
                </button>
              );
            })}
        </div>
        <div className="row" style={{ marginTop: 10 }}>
          <Button block variant="danger" onClick={() => { setSlot(pick!, null); setPick(null); }}>Remove</Button>
          <Button block onClick={() => setPick(null)}>Cancel</Button>
        </div>
      </Modal>

      <Modal open={pickEcho !== null} onClose={() => setPickEcho(null)} label="Choose echo">
        <h3 style={{ marginBottom: 10 }}>Choose an Echo</h3>
        {save.echoes.length === 0 ? <p className="dim">Defeat a gate boss and bind it from the result screen.</p> : null}
        <div className={s.pickList}>
          {save.echoes.map((gid) => {
            const gate = GATE_MAP[gid];
            const boss = BOSSES.find((b) => b.key === gate.bossKey)!;
            const at = save.team.echoes.slice(0, esize).indexOf(gid);
            return (
              <button key={gid} type="button" className={s.pickRow} onClick={() => { setEchoSlot(pickEcho!, gid); setPickEcho(null); }}>
                <Portrait id={gate.bossKey + gate.id} cls="boss" element={boss.element} rarity="boss" size={44} />
                <span className="grow">
                  <div style={{ fontWeight: 700 }}>{boss.name} Echo</div>
                  <div className="dim" style={{ fontSize: 11 }}>{gate.id} · {boss.kit.skill.name}: {boss.kit.skill.desc}</div>
                </span>
                {at >= 0 ? <span style={{ fontSize: 10, color: 'var(--accent)' }}>SLOT {at + 1}</span> : null}
              </button>
            );
          })}
        </div>
        <div className="row" style={{ marginTop: 10 }}>
          <Button block variant="danger" onClick={() => { setEchoSlot(pickEcho!, null); setPickEcho(null); }}>Remove</Button>
          <Button block onClick={() => setPickEcho(null)}>Cancel</Button>
        </div>
      </Modal>

      <Button block onClick={() => navigate('gates')} variant="primary">To the Gates</Button>
    </div>
  );
}
