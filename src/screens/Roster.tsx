import { useMemo, useState } from 'react';
import { Portrait } from '../art/Portrait';
import { ELEMENTS } from '../config/balance';
import { HUNTERS } from '../data/hunters';
import { hunterStats, power } from '../engine/progression';
import { navigate } from '../store/router';
import { useGame } from '../store/gameStore';
import { ScreenHead, Stars } from '../ui/kit';
import { CLASSES, CLASS_LABEL, ELEMENT_COLOR, ELEMENT_LABEL, RARITY_COLOR } from '../ui/meta';
import type { HunterClass, HunterElement, Rarity } from '../types';
import s from './screens.module.css';

const RARITY_ORDER: Record<Rarity, number> = { MR: 0, SSR: 1, SR: 2, R: 3 };

export function Roster() {
  const owned = useGame((g) => g.save.hunters);
  const [cls, setCls] = useState<HunterClass | null>(null);
  const [el, setEl] = useState<HunterElement | null>(null);
  const [ra, setRa] = useState<Rarity | null>(null);
  const [showAll, setShowAll] = useState(false);

  const list = useMemo(() => {
    return HUNTERS.filter((h) => (showAll || owned[h.id]) && (!cls || h.cls === cls) && (!el || h.element === el) && (!ra || h.rarity === ra))
      .map((h) => ({ h, o: owned[h.id], pw: owned[h.id] ? power(hunterStats(h.id, owned[h.id])) : 0 }))
      .sort((a, b) => (b.o ? 1 : 0) - (a.o ? 1 : 0) || RARITY_ORDER[a.h.rarity] - RARITY_ORDER[b.h.rarity] || b.pw - a.pw);
  }, [owned, cls, el, ra, showAll]);

  const ownedCount = Object.keys(owned).length;

  return (
    <>
      <ScreenHead title="Roster" backable={false} right={<button type="button" className={s.fchip} aria-pressed={false} onClick={() => navigate('team')}>Team ›</button>} />
      <div className={s.filters}>
        <div className={s.chipRow} role="group" aria-label="Rarity filter">
          {(['MR', 'SSR', 'SR', 'R'] as Rarity[]).map((r) => (
            <button key={r} type="button" className={s.fchip} style={{ color: ra === r ? RARITY_COLOR[r] : undefined }} aria-pressed={ra === r} onClick={() => setRa(ra === r ? null : r)}>{r === 'MR' ? 'Mythic' : r}</button>
          ))}
          <button type="button" className={s.fchip} aria-pressed={showAll} onClick={() => setShowAll(!showAll)}>{showAll ? 'All hunters' : 'Owned'}</button>
        </div>
        <div className={s.chipRow} role="group" aria-label="Element filter">
          {ELEMENTS.map((e) => (
            <button key={e} type="button" className={s.fchip} style={{ color: el === e ? ELEMENT_COLOR[e] : undefined }} aria-pressed={el === e} onClick={() => setEl(el === e ? null : e)}>{ELEMENT_LABEL[e]}</button>
          ))}
        </div>
        <div className={s.chipRow} role="group" aria-label="Class filter">
          {CLASSES.map((c) => (
            <button key={c} type="button" className={s.fchip} aria-pressed={cls === c} onClick={() => setCls(cls === c ? null : c)}>{CLASS_LABEL[c]}</button>
          ))}
        </div>
      </div>
      <div className={s.count}>{ownedCount}/{HUNTERS.length} collected · showing {list.length}</div>
      <div className={s.grid}>
        {list.map(({ h, o, pw }) => (
          <button key={h.id} type="button" className={s.card} onClick={() => navigate('hunter', h.id)} aria-label={h.name}>
            <Portrait id={h.id} cls={h.cls} element={h.element} rarity={h.rarity} size={100} dim={!o} />
            <span className={s.cardName}>{h.name.split(' ')[0]}</span>
            {o ? (
              <>
                <Stars count={o.stars} size={10} />
                <span className={s.cardMeta}>Lv {o.level} · {pw.toLocaleString()} PWR</span>
              </>
            ) : (
              <span className={s.cardMeta}>Not recruited</span>
            )}
          </button>
        ))}
      </div>
    </>
  );
}
