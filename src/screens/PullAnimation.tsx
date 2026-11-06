import { useEffect, useState } from 'react';
import { sfx } from '../audio/sfx';
import { haptic } from '../fx/haptics';
import type { PullOutcome } from '../store/gameStore';
import { useGame } from '../store/gameStore';
import { RARITY_COLOR } from '../ui/meta';
import { PullResults } from './Summon';
import s from './PullAnimation.module.css';

const prefersReduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Gate opens -> light colour reveals the best rarity (blue / purple / gold) -> results. Tap to skip. */
export function PullAnimation({ outcome, onClose }: { outcome: PullOutcome; onClose: () => void }) {
  const motion = useGame((g) => g.save.settings.reducedMotion);
  const reduced = motion === 'on' || (motion === 'system' && prefersReduced());
  const best = outcome.results.some((r) => r.rarity === 'SSR') ? 'SSR' : outcome.results.some((r) => r.rarity === 'SR') ? 'SR' : 'R';
  const [phase, setPhase] = useState<'gate' | 'flash' | 'reveal'>(reduced ? 'reveal' : 'gate');

  useEffect(() => {
    if (phase === 'reveal') {
      sfx(best === 'SSR' ? 'pullSSR' : best === 'SR' ? 'pullSR' : 'pullR');
      if (best === 'SSR') haptic('ssr');
      return;
    }
    if (phase === 'gate') {
      sfx('gate');
      const t = setTimeout(() => setPhase('flash'), best === 'SSR' ? 2100 : 1700);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setPhase('reveal'), 380);
    return () => clearTimeout(t);
  }, [phase, best]);

  if (phase === 'reveal') return <PullResults outcome={outcome} onClose={onClose} />;

  return (
    <div
      className={s.stage}
      style={{ ['--glow' as string]: RARITY_COLOR[best] }}
      onClick={() => setPhase('reveal')}
      role="dialog"
      aria-label="Summoning. Tap to skip."
    >
      <div className={s.ring} />
      <div className={`${s.ring} ${s.ring2}`} />
      <div className={s.rays} />
      {best === 'SSR' ? <div className={s.ssrText}>RIFT RESONANCE</div> : null}
      <div className={s.gate}>
        <div className={s.light} />
        <div className={s.crack} />
        <div className={`${s.door} ${s.left}`} />
        <div className={`${s.door} ${s.right}`} />
      </div>
      {phase === 'flash' ? <div className={s.flash} /> : null}
      <div className={s.skip}>TAP TO SKIP</div>
    </div>
  );
}
