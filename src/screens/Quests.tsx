import { QUEST_MAP } from '../data/quests';
import { QUESTS } from '../config/balance';
import { nextDailyReset, nextWeeklyReset } from '../engine/game';
import { useGame } from '../store/gameStore';
import { toast } from '../store/uiStore';
import { sfx } from '../audio/sfx';
import { Bar, Button, CrystalIcon, ScreenHead, SystemPanel, useNow } from '../ui/kit';
import type { QuestState } from '../save/schema';
import s from './screens.module.css';

const dur = (ms: number) => {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : `${h}h ${m}m`;
};

export function QuestRow({ q, weekly }: { q: QuestState; weekly?: boolean }) {
  const claim = useGame((g) => g.claimQuest);
  const def = QUEST_MAP[q.id];
  if (!def) return null;
  const done = q.progress >= def.target;
  return (
    <div className={s.setRow} style={{ gap: 10, padding: '8px 0' }}>
      <div className="grow col" style={{ gap: 5 }}>
        <span style={{ fontSize: 14 }}>{def.text}</span>
        <Bar value={q.progress / def.target} color={done ? 'var(--gold)' : undefined} />
        <span className="dim num row" style={{ fontSize: 11, gap: 4 }}>
          {q.progress}/{def.target} · <CrystalIcon /> {weekly ? QUESTS.weeklyCrystals : QUESTS.dailyCrystals}
        </span>
      </div>
      {q.claimed ? (
        <span className="faint display" style={{ fontSize: 10 }}>CLAIMED</span>
      ) : (
        <Button
          small
          variant={done ? 'gold' : 'ghost'}
          disabled={!done}
          onClick={() => {
            const r = claim(q.id);
            if (r) {
              sfx('levelup');
              toast(`+${r.crystals} Crystals${r.gold ? `, +${r.gold.toLocaleString()} Gold` : ''}`, 'good');
            }
          }}
        >
          Claim
        </Button>
      )}
    </div>
  );
}

export function Quests() {
  const quests = useGame((g) => g.save.quests);
  const now = useNow(30_000);
  return (
    <div className="col" style={{ gap: 12 }}>
      <ScreenHead title="Quests" backable={false} />
      <SystemPanel title={`SYSTEM // DAILY DIRECTIVES · resets in ${dur(nextDailyReset(now) - now)}`}>
        {quests.daily.map((q) => <QuestRow key={q.id} q={q} />)}
      </SystemPanel>
      <SystemPanel title={`SYSTEM // WEEKLY DIRECTIVE · ${dur(nextWeeklyReset(now) - now)}`}>
        {quests.weekly ? <QuestRow q={quests.weekly} weekly /> : null}
      </SystemPanel>
      <p className="faint" style={{ fontSize: 12, textAlign: 'center' }}>
        Dailies: {QUESTS.dailyCrystals * QUESTS.dailyCount} Crystals per day · Weekly: {QUESTS.weeklyCrystals} Crystals
      </p>
    </div>
  );
}
