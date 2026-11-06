import { Portrait } from '../art/Portrait';
import { HUNTER } from '../config/balance';
import { HUNTER_MAP } from '../data/hunters';
import { hunterStats, levelCap, power } from '../engine/progression';
import { useGame } from '../store/gameStore';
import { ElementTag, Panel, RarityTag, ScreenHead, Stars } from '../ui/kit';
import { CLASS_LABEL, RARITY_COLOR, pct } from '../ui/meta';
import s from './screens.module.css';
import type { ReactNode } from 'react';

export function StatBox({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className={s.stat}>
      <div className={s.statLabel}>{label}</div>
      <div className={s.statValue} style={{ fontSize: 14 }}>{value}</div>
    </div>
  );
}

export function HunterDetail({ id, children }: { id: string; children?: ReactNode }) {
  const def = HUNTER_MAP[id];
  const owned = useGame((g) => g.save.hunters[id]);
  if (!def) return <ScreenHead title="Unknown hunter" />;
  const view = owned ?? { level: 1, stars: 0, ascension: 0, obtainedAt: 0 };
  const st = hunterStats(id, view);
  const kit = def.kit;
  return (
    <div className={s.stack}>
      <ScreenHead title={def.name} />
      <div className={s.detailHero}>
        <Portrait id={def.id} cls={def.cls} element={def.element} rarity={def.rarity} size={130} dim={!owned} />
        <div className="col grow">
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, letterSpacing: '.14em', color: RARITY_COLOR[def.rarity] }}>{def.title.toUpperCase()}</div>
          <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
            <RarityTag rarity={def.rarity} />
            <ElementTag element={def.element} />
            <span className="dim" style={{ fontSize: 12 }}>{CLASS_LABEL[def.cls]}</span>
          </div>
          <p className="dim" style={{ fontSize: 13 }}>{def.bio}</p>
          {owned ? (
            <div className="col" style={{ gap: 2 }}>
              <span style={{ fontSize: 13 }}>Lv <b>{view.level}</b>/{levelCap(view.ascension)} · Asc {view.ascension}</span>
              <span className="row" style={{ gap: 6, fontSize: 12 }}>Limit Break <Stars count={view.stars} max={HUNTER.maxStars} /></span>
            </div>
          ) : (
            <span className="faint" style={{ fontSize: 12 }}>Not yet recruited</span>
          )}
        </div>
      </div>
      <div className={s.statsGrid}>
        <StatBox label="HP" value={st.hp.toLocaleString()} />
        <StatBox label="ATK" value={st.atk.toLocaleString()} />
        <StatBox label="DEF" value={st.def.toLocaleString()} />
        <StatBox label="SPD" value={st.spd} />
        <StatBox label="CRIT" value={pct(st.critRate, 0)} />
        <StatBox label="CRIT DMG" value={pct(st.critDmg, 0)} />
      </div>
      <div className="dim" style={{ fontSize: 12, textAlign: 'right' }}>Power {power(st).toLocaleString()}</div>
      {children}
      <Panel>
        {([
          ['BASIC', kit.basic],
          ['SKILL', kit.skill],
          ['ULT', kit.ultimate],
        ] as const).map(([k, a]) => (
          <div key={k} className={s.kitItem}>
            <div className={s.kitHead}>
              <span className={s.kitKind}>{k}</span>
              <span className={s.kitName}>{a.name}</span>
              {a.cooldown ? <span className="faint" style={{ fontSize: 11 }}>CD {a.cooldown}</span> : null}
              {k === 'ULT' ? <span className="faint" style={{ fontSize: 11 }}>100 energy</span> : null}
            </div>
            <div className={s.kitDesc}>{a.desc}</div>
          </div>
        ))}
      </Panel>
      <Panel>
        <h3 style={{ fontSize: 12, letterSpacing: '.14em', marginBottom: 4 }}>PASSIVES</h3>
        {kit.passives.map((p, i) => {
          const need = HUNTER.passiveStars[i];
          const on = view.stars >= need;
          return (
            <div key={p.name} className={`${s.kitItem} ${on ? '' : s.locked}`}>
              <div className={s.kitHead}>
                <span className={s.kitKind}>★{need}</span>
                <span className={s.kitName}>{p.name}</span>
                {!on ? <span className="faint" style={{ fontSize: 11 }}>Locked</span> : null}
              </div>
              <div className={s.kitDesc}>{p.desc}</div>
            </div>
          );
        })}
      </Panel>
    </div>
  );
}
