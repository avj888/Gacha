import { useEffect, type ReactNode } from 'react';
import s from './App.module.css';
import { navigate, useRoute, type RouteName } from './store/router';
import { useGame } from './store/gameStore';
import { Toasts } from './ui/kit';
import { Home } from './screens/Home';
import { Summon } from './screens/Summon';
import { Roster } from './screens/Roster';
import { HunterDetail } from './screens/HunterDetail';
import { Settings } from './screens/Settings';
import { Placeholder } from './screens/Placeholder';

const NAV: { name: RouteName; label: string; icon: ReactNode }[] = [
  { name: 'home', label: 'HOME', icon: <path d="M3 11 L12 3 L21 11 V21 H14 V15 H10 V21 H3Z" /> },
  { name: 'gates', label: 'GATES', icon: <path d="M5 21 V9 A7 7 0 0 1 19 9 V21 M9 21 V10 A3 3 0 0 1 15 10 V21" fill="none" strokeWidth="2" /> },
  { name: 'summon', label: 'SUMMON', icon: <path d="M12 2 L15 9 L22 9.5 L16.5 14 L18.5 21 L12 17 L5.5 21 L7.5 14 L2 9.5 L9 9Z" /> },
  { name: 'roster', label: 'ROSTER', icon: <path d="M8 11 A4 4 0 1 1 8 3 A4 4 0 0 1 8 11Z M1 21 C1 15 15 15 15 21Z M17 10 A3 3 0 1 0 17 4 M18 14 C21 14 23 16 23 21 H17" /> },
  { name: 'quests', label: 'QUESTS', icon: <path d="M5 3 H19 V21 L12 17 L5 21Z" /> },
];

function NavBar({ current }: { current: RouteName }) {
  const active = current === 'hunter' || current === 'team' ? 'roster' : current;
  return (
    <nav className={s.nav} aria-label="Main">
      {NAV.map((n) => (
        <button key={n.name} type="button" className={s.navBtn} aria-current={active === n.name ? 'page' : undefined} onClick={() => navigate(n.name)}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="0">
            {n.icon}
          </svg>
          {n.label}
        </button>
      ))}
    </nav>
  );
}

export default function App() {
  const route = useRoute();
  const motion = useGame((g) => g.save.settings.reducedMotion);

  useEffect(() => {
    const el = document.documentElement;
    if (motion === 'on') el.dataset.motion = 'reduced';
    else delete el.dataset.motion;
  }, [motion]);

  const fullscreen = route.name === 'battle';
  let screen: ReactNode;
  switch (route.name) {
    case 'summon': screen = <Summon />; break;
    case 'roster': screen = <Roster />; break;
    case 'hunter': screen = <HunterDetail id={route.param ?? ''} />; break;
    case 'settings': screen = <Settings />; break;
    case 'gates': screen = <Placeholder title="Gates" phase={3} />; break;
    case 'quests': screen = <Placeholder title="Quests" phase={3} />; break;
    case 'team': screen = <Placeholder title="Team" phase={3} />; break;
    case 'battle': screen = <Placeholder title="Battle" phase={2} />; break;
    default: screen = <Home />;
  }

  return (
    <div className={s.app}>
      <div className="backdrop" />
      <main key={route.name + (route.param ?? '')} className={`${s.screen} ${fullscreen ? s.full : ''}`}>
        {screen}
      </main>
      {!fullscreen ? <NavBar current={route.name} /> : null}
      <Toasts />
      <div className="landscape-block" aria-hidden="true">
        <h2 className="display">ROTATE DEVICE</h2>
        <p className="dim">RIFTBORN is played in portrait.</p>
      </div>
    </div>
  );
}
