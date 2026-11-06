import { PLAYER } from '../config/balance';
import { xpToNext, nextRank } from '../engine/progression';
import { navigate } from '../store/router';
import { useGame } from '../store/gameStore';
import { Bar, CurrencyBar, IconBtnClass, Panel, SystemPanel } from '../ui/kit';
import s from './screens.module.css';

export function Home() {
  const save = useGame((g) => g.save);
  const p = save.player;
  const nr = nextRank(p.rank);
  const owned = Object.keys(save.hunters).length;
  return (
    <div className={s.stack}>
      <div className={s.homeTop}>
        <span className={s.logo}>RIFTBORN</span>
        <button type="button" className={IconBtnClass} aria-label="Settings" onClick={() => navigate('settings')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3.2" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" /></svg>
        </button>
      </div>
      <CurrencyBar />
      <Panel>
        <div className={s.playerCard}>
          <div className={s.rankBadge} aria-label={`Rank ${p.rank}`}>{p.rank}</div>
          <div className="grow col" style={{ gap: 6 }}>
            <div className={s.pName}>{p.name}</div>
            <div className={s.pSub}>
              {p.rank}-Rank Hunter · Lv {p.level}/{PLAYER.maxLevel}
            </div>
            <Bar value={p.level >= PLAYER.maxLevel ? 1 : p.xp / xpToNext(p.level)} />
            <div className={s.pSub}>
              {nr ? `Rank trial for ${nr} at Lv ${PLAYER.trialLevel[nr as keyof typeof PLAYER.trialLevel]}` : 'Peak rank reached'} · {owned} hunters
            </div>
          </div>
        </div>
      </Panel>
      <SystemPanel title="SYSTEM // LATTICE">
        <p style={{ fontSize: 14 }}>
          Welcome, Awakened. You are the lowest rank in Vantor, and the Rifts know it. Recruit hunters at the Summon terminal.
        </p>
      </SystemPanel>
      <div className={s.quick}>
        <button type="button" className={s.quickBtn} onClick={() => navigate('gates')}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M5 21V9a7 7 0 0 1 14 0v12M9 21V10a3 3 0 0 1 6 0v11" /></svg>
          GATES
        </button>
        <button type="button" className={s.quickBtn} onClick={() => navigate('summon')}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="var(--gold)"><path d="M12 2l3 7 7 .5-5.5 4.5 2 7-6.5-4-6.5 4 2-7L2 9.5 9 9z" /></svg>
          SUMMON
        </button>
        <button type="button" className={s.quickBtn} onClick={() => navigate('team')}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--el-frost)" strokeWidth="2"><circle cx="8" cy="8" r="3.5" /><circle cx="16.5" cy="9" r="2.8" /><path d="M2 20c0-4 3-6 6-6s6 2 6 6M14 15c3-1 7 0 8 5" /></svg>
          TEAM
        </button>
      </div>
    </div>
  );
}
