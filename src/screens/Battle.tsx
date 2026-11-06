import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Portrait } from '../art/Portrait';
import { BATTLE } from '../config/balance';
import { canUse, currentRound, previewOrder, step, unitById, validTargets } from '../engine/battle/battle';
import type { AbilityKind, BattleAction, BattleEvent, Unit } from '../engine/battle/types';
import { sfx } from '../audio/sfx';
import { haptic } from '../fx/haptics';
import { useBattle } from '../store/battleStore';
import { resolveBattle, type BattleResultView } from '../store/flow';
import { useGame } from '../store/gameStore';
import { navigate } from '../store/router';
import { Button, Modal } from '../ui/kit';
import s from './Battle.module.css';

interface Float {
  id: number;
  uid: string;
  text: string;
  cls: string;
  adv?: boolean;
}

let floatId = 1;

export function Battle() {
  const session = useBattle((b) => b.session);
  const setBattleState = useBattle((b) => b.setState);
  const clearBattle = useBattle((b) => b.clear);
  const settings = useGame((g) => g.save.settings);
  const update = useGame((g) => g.update);

  const [floats, setFloats] = useState<Float[]>([]);
  const [acting, setActing] = useState<string | null>(null);
  const [hit, setHit] = useState<Set<string>>(new Set());
  const [koing, setKoing] = useState<Set<string>>(new Set());
  const [shake, setShake] = useState(false);
  const [banner, setBanner] = useState<{ id: number; text: string } | null>(null);
  const [actionName, setActionName] = useState<{ id: number; text: string; ult: boolean } | null>(null);
  const [target, setTarget] = useState<string | undefined>();
  const [ready, setReady] = useState(true);
  const [result, setResult] = useState<BattleResultView | null>(null);
  const [confirmRetreat, setConfirmRetreat] = useState(false);
  const lastUlt = useRef(false);
  const auto = settings.auto;
  const fast = settings.speed2x;
  const speed = fast ? 0.5 : 1;

  const play = useCallback(
    (events: BattleEvent[]) => {
      const nf: Float[] = [];
      const hits = new Set<string>();
      const kos = new Set<string>();
      let crit = false;
      let ult = false;
      for (const e of events) {
        switch (e.t) {
          case 'action':
            setActing(e.uid);
            setActionName({ id: floatId++, text: e.name, ult: e.kind === 'ultimate' });
            if (e.kind === 'ultimate') {
              ult = true;
              sfx('ult');
              haptic('ult');
            } else sfx(e.kind === 'skill' ? 'skill' : 'hit');
            break;
          case 'damage':
            hits.add(e.tgt);
            if (e.crit) crit = true;
            nf.push({ id: floatId++, uid: e.tgt, text: (e.crit ? '' : '') + e.amount.toLocaleString() + (e.crit ? '!' : ''), cls: `${e.crit ? s.crit : ''} ${e.dot ? s.small : ''}`, adv: e.adv });
            break;
          case 'heal':
            nf.push({ id: floatId++, uid: e.tgt, text: '+' + e.amount.toLocaleString(), cls: s.heal });
            sfx('heal');
            break;
          case 'shield':
            nf.push({ id: floatId++, uid: e.tgt, text: 'SHIELD', cls: s.shieldF });
            break;
          case 'status':
            if (e.resisted) nf.push({ id: floatId++, uid: e.tgt, text: 'RESIST', cls: `${s.small}` });
            else if (e.kind === 'stun') nf.push({ id: floatId++, uid: e.tgt, text: 'STUN', cls: `${s.small}` });
            break;
          case 'stunned':
            nf.push({ id: floatId++, uid: e.uid, text: 'STUNNED', cls: s.small });
            break;
          case 'ko':
            kos.add(e.uid);
            sfx('ko');
            break;
          case 'wave':
            setBanner({ id: floatId++, text: e.wave === (session?.state.totalWaves ?? 3) ? 'BOSS WAVE' : `WAVE ${e.wave}` });
            sfx('gate');
            break;
          case 'echo':
            setActionName({ id: floatId++, text: 'ECHO STRIKES', ult: true });
            break;
          case 'end':
            sfx(e.outcome === 'win' ? 'win' : 'lose');
            haptic(e.outcome === 'win' ? 'win' : 'error');
            break;
        }
      }
      lastUlt.current = ult;
      if (crit) {
        setShake(false);
        requestAnimationFrame(() => setShake(true));
        setTimeout(() => setShake(false), 340);
        sfx('crit');
        haptic('crit');
      } else if (hits.size) haptic('hit');
      setHit(hits);
      if (kos.size) setKoing((prev) => new Set([...prev, ...kos]));
      if (nf.length) {
        setFloats((f) => [...f.slice(-24), ...nf]);
        const ids = new Set(nf.map((x) => x.id));
        setTimeout(() => setFloats((f) => f.filter((x) => !ids.has(x.id))), 1000);
      }
      setTimeout(() => {
        setActing(null);
        setHit(new Set());
      }, 320);
    },
    [session?.state.totalWaves],
  );

  // initial wave banner
  useEffect(() => {
    if (session) play(session.initialEvents);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.startedAt]);

  const runStep = useCallback(
    (action: BattleAction) => {
      const cur = useBattle.getState().session;
      if (!cur || cur.state.outcome) return;
      const r = step(cur.state, action);
      setBattleState(r.state);
      play(r.events);
      setReady(false);
      setTimeout(() => setReady(true), (lastUlt.current ? 900 : 550) * speed);
    },
    [play, setBattleState, speed],
  );

  const state = session?.state;
  const active = state?.active ? unitById(state, state.active) : undefined;
  const allyTurn = !!active && active.side === 'ally';

  // drive AI / auto turns and the end of battle
  useEffect(() => {
    if (!session || !state) return;
    if (state.outcome) {
      const t = setTimeout(() => {
        setResult(
          resolveBattle(session, [
            { label: 'Continue', variant: 'primary', run: () => { clearBattle(); navigate('gates', undefined, true); } },
          ]),
        );
      }, 900 * speed);
      return () => clearTimeout(t);
    }
    if (!active || !ready) return;
    if (active.side === 'enemy' || auto) {
      const t = setTimeout(() => runStep({ kind: 'auto' }), 380 * speed);
      return () => clearTimeout(t);
    }
  }, [session, state, active, auto, ready, runStep, speed, clearBattle]);

  const order = useMemo(() => (state ? previewOrder(state, BATTLE.timelinePreview) : []), [state]);

  if (!session || !state) {
    return (
      <div className="col" style={{ alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
        <p className="dim">No active battle.</p>
        <Button variant="primary" onClick={() => navigate('gates', undefined, true)}>Back to Gates</Button>
      </div>
    );
  }

  const enemies = state.units.filter((u) => u.side === 'enemy');
  const allies = state.units.filter((u) => u.side === 'ally' && !u.isEcho);
  const echoes = state.units.filter((u) => u.isEcho);
  const targets = active && allyTurn ? validTargets(state, active) : [];
  const targetUnit = targets.find((t) => t.uid === target) ?? undefined;
  const round = currentRound(state);

  const act = (kind: AbilityKind) => {
    if (!allyTurn || !ready || auto || !active || !canUse(active, kind)) return;
    runStep({ kind, target: targetUnit?.uid });
  };

  const unitClass = (u: Unit) =>
    [
      s.unit,
      u.side === 'enemy' ? s.enemyUnit : '',
      u.isBoss ? s.boss : '',
      state.active === u.uid && !state.outcome ? s.active : '',
      targetUnit?.uid === u.uid ? s.targeted : '',
      targets.includes(u) ? s.targetable : '',
      acting === u.uid ? s.acting : '',
      hit.has(u.uid) ? s.hit : '',
      !u.alive ? (koing.has(u.uid) ? s.koAnim : s.ko) : '',
    ].join(' ');

  const floatsFor = (uid: string) =>
    floats
      .filter((f) => f.uid === uid)
      .map((f, i) => (
        <span key={f.id} className={`${s.float} ${f.cls}`} style={{ top: `${10 + (i % 3) * 14}%` }}>
          {f.text}
          {f.adv ? <span className={s.advTag}>ADVANTAGE</span> : null}
        </span>
      ));

  const statuses = (u: Unit) => (
    <div className={s.statusRow}>
      {u.statuses.slice(0, 4).map((st, i) => {
        const label = st.kind === 'buff' || st.kind === 'debuff' ? `${st.stat.slice(0, 3).toUpperCase()}${st.kind === 'buff' ? '↑' : '↓'}` : st.kind === 'dot' ? 'BURN' : st.kind === 'stun' ? 'STUN' : 'TAUNT';
        const c = st.kind === 'buff' ? s.stBuff : st.kind === 'debuff' || st.kind === 'dot' ? s.stDebuff : s.stOther;
        return <span key={i} className={`${s.st} ${c}`}>{label}</span>;
      })}
    </div>
  );

  const hpBar = (u: Unit, ally: boolean) => (
    <div className={s.hpBar} aria-label={`HP ${u.hp} of ${u.maxHp}`}>
      <div className={`${s.hpFill} ${ally ? s.allyHp : ''}`} style={{ width: `${(u.hp / u.maxHp) * 100}%` }} />
      {u.shield > 0 ? <div className={s.shieldFill} style={{ width: `${Math.min(1, u.shield / u.maxHp) * 100}%` }} /> : null}
    </div>
  );

  const toggle = (k: 'auto' | 'speed2x') => update((d) => void (d.settings[k] = !d.settings[k]));

  return (
    <div className={`${s.wrap} ${shake && settings.reducedMotion !== 'on' ? s.shake : ''} ${session.kind === 'red' ? s.red : ''}`}>
      <div className={s.top}>
        <div className={s.title}>
          <div className={s.titleMain}>{session.title}</div>
          <div className={s.titleSub}>
            Wave {state.wave}/{state.totalWaves} · Turn <span style={{ color: round >= BATTLE.threeStarTurnLimit ? 'var(--danger)' : undefined }}>{round}</span>/{BATTLE.threeStarTurnLimit}
            {echoes.length ? ` · Echo in ${state.nextEchoRound - round + 1 > 0 ? state.nextEchoRound - round : 0}` : ''}
          </div>
        </div>
        {session.canRetreat ? (
          <Button small onClick={() => setConfirmRetreat(true)} disabled={!!state.outcome}>Retreat</Button>
        ) : (
          <span className="faint" style={{ fontSize: 10, letterSpacing: '.12em', fontFamily: 'var(--font-display)', color: 'var(--danger)' }}>NO RETREAT</span>
        )}
      </div>

      <div className={s.timeline} aria-label="Turn order">
        <span className={s.tlLabel}>NEXT</span>
        {order.map((uid, i) => {
          const u = unitById(state, uid);
          if (!u) return null;
          return (
            <div key={i} className={`${s.tlItem} ${i === 0 ? s.first : ''} ${u.side === 'enemy' ? s.enemy : s.ally}`} title={u.name}>
              <Portrait id={u.id} cls={u.cls} element={u.element} rarity={u.portrait} size={34} frame={false} />
            </div>
          );
        })}
      </div>

      <div className={s.field}>
        <div className={s.enemies}>
          {enemies.map((u) => (
            <button
              key={u.uid}
              type="button"
              className={unitClass(u)}
              onClick={() => targets.includes(u) && setTarget(u.uid)}
              aria-label={`${u.name}, ${u.hp} HP`}
              disabled={!u.alive}
            >
              {statuses(u)}
              <Portrait id={u.id + u.uid} cls={u.cls} element={u.element} rarity={u.portrait} size={u.isBoss ? 112 : 74} />
              {hpBar(u, false)}
              <span className={s.unitName}>{u.name}</span>
              <div className={s.floats}>{floatsFor(u.uid)}</div>
            </button>
          ))}
        </div>

        <div>
          <div className={s.allies}>
            {allies.map((u) => (
              <div key={u.uid} className={unitClass(u)} aria-label={`${u.name}, ${u.hp} HP, ${u.energy} energy`}>
                {statuses(u)}
                <Portrait id={u.id} cls={u.cls} element={u.element} rarity={u.portrait} size={66} />
                {hpBar(u, true)}
                <div className={s.enBar}>
                  <div className={`${s.enFill} ${u.energy >= BATTLE.energyMax ? s.enFull : ''}`} style={{ width: `${u.energy}%` }} />
                </div>
                <span className={s.unitName}>{u.name}</span>
                <div className={s.floats}>{floatsFor(u.uid)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={s.controls}>
        <div className={s.hint}>
          {state.outcome ? '' : auto ? 'Auto battle' : allyTurn ? `${active!.name}'s turn${targets.length > 1 ? ' · tap an enemy to target' : ''}` : 'Enemy turn…'}
        </div>
        <div className={s.skills}>
          {(['basic', 'skill', 'ultimate'] as AbilityKind[]).map((k) => {
            const ab = allyTurn && active ? active.kit[k] : null;
            const usable = !!active && allyTurn && canUse(active, k) && ready && !auto;
            const meta =
              k === 'skill' && active && allyTurn ? (active.cd > 0 ? `CD ${active.cd}` : 'Ready') : k === 'ultimate' && active && allyTurn ? `${Math.floor(active.energy)}/${BATTLE.energyMax}` : '';
            return (
              <button
                key={k}
                type="button"
                className={`${s.skillBtn} ${k === 'ultimate' && active && allyTurn && canUse(active, 'ultimate') ? s.ultReady : ''}`}
                disabled={!usable}
                onClick={() => act(k)}
                aria-label={ab ? `${k}: ${ab.name}. ${ab.desc}` : k}
              >
                <span className={s.skillKind}>{k === 'ultimate' ? 'ULT' : k.toUpperCase()}</span>
                <span className={s.skillName}>{ab?.name ?? '—'}</span>
                <span className={s.skillMeta}>{meta}</span>
              </button>
            );
          })}
        </div>
        <div className={s.toggles}>
          <button type="button" className={s.toggle} aria-pressed={auto} onClick={() => toggle('auto')}>AUTO</button>
          <button type="button" className={s.toggle} aria-pressed={fast} onClick={() => toggle('speed2x')}>2× SPEED</button>
        </div>
      </div>

      {banner ? <div key={banner.id} className={s.banner}>{banner.text}</div> : null}
      {actionName ? <div key={actionName.id} className={`${s.actionName} ${actionName.ult ? s.ult : ''}`}>{actionName.text}</div> : null}

      {result ? (
        <div className={s.result} role="dialog" aria-label="Battle result">
          <div className={`${s.resTitle} ${result.win ? s.win : s.lose}`}>{result.win ? 'CLEARED' : 'DEFEATED'}</div>
          {result.showStars ? (
            <div className={s.resStars} aria-label={`${result.stars} stars`}>
              {[0, 1, 2].map((i) => (
                <span key={i} className={`${s.resStar} ${i < result.stars ? s.on : ''}`} style={{ animationDelay: `${i * 0.18}s` }}>★</span>
              ))}
            </div>
          ) : null}
          <div className={s.resList}>
            <span>Turns: {result.rounds} · KO'd: {result.kos}</span>
            {result.lines.map((l, i) => (
              <span key={i}>{l.label}: <b style={{ color: 'var(--text)' }}>{l.value}</b></span>
            ))}
            {result.notes.map((n, i) => (
              <span key={'n' + i} style={{ color: 'var(--accent)' }}>{n}</span>
            ))}
          </div>
          <div className={s.resActions}>
            {result.actions.map((a, i) => (
              <Button key={i} variant={a.variant ?? 'ghost'} block onClick={a.run}>{a.label}</Button>
            ))}
          </div>
        </div>
      ) : null}

      <Modal open={confirmRetreat} onClose={() => setConfirmRetreat(false)} label="Retreat">
        <h3 style={{ marginBottom: 6 }}>Retreat from the gate?</h3>
        <p className="dim" style={{ fontSize: 13, marginBottom: 12 }}>You won't get any rewards, and stamina already spent isn't refunded.</p>
        <div className="row">
          <Button variant="danger" block onClick={() => { setConfirmRetreat(false); clearBattle(); navigate('gates', undefined, true); }}>Retreat</Button>
          <Button block onClick={() => setConfirmRetreat(false)}>Stay</Button>
        </div>
      </Modal>
    </div>
  );
}
