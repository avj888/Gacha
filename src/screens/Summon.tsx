import { useMemo, useState } from 'react';
import { Portrait } from '../art/Portrait';
import { GACHA } from '../config/balance';
import { getHunter } from '../data/hunters';
import { effectiveSsrRate, getBanners, rotationEndsAt } from '../engine/gacha';
import { useGame, type PullOutcome } from '../store/gameStore';
import { toast } from '../store/uiStore';
import { Button, CrystalIcon, CurrencyBar, ElementTag, Modal, Panel, ScreenHead, Stars, useNow } from '../ui/kit';
import { CLASS_LABEL, ELEMENT_COLOR, RARITY_COLOR, RARITY_STARS, pct } from '../ui/meta';
import s from './screens.module.css';

export function Summon() {
  const now = useNow(30_000);
  const banners = useMemo(() => getBanners(now), [now]);
  const save = useGame((g) => g.save);
  const pull = useGame((g) => g.pull);
  const beginnerLeft = GACHA.beginner.maxPulls - save.gacha.banners.beginner.totalPulls;
  const [tab, setTab] = useState<string>(beginnerLeft > 0 ? 'beginner' : 'featured');
  const [info, setInfo] = useState<'rates' | 'history' | null>(null);
  const [result, setResult] = useState<PullOutcome | null>(null);

  const banner = banners.find((b) => b.id === tab) ?? banners[0];
  const bs = save.gacha.banners[banner.id];
  const featured = banner.featuredId ? getHunter(banner.featuredId) : null;
  const isBeginner = banner.kind === 'beginner';
  const exhausted = isBeginner && beginnerLeft <= 0;
  const daysLeft = Math.ceil((rotationEndsAt(now) - now) / 86400000);

  const doPull = (count: 1 | 10) => {
    const out = pull(banner.id, count);
    if ('error' in out) {
      toast(out.error, 'bad');
      return;
    }
    setResult(out);
  };

  return (
    <div className={s.stack}>
      <ScreenHead title="Summon" backable={false} right={<CurrencyBar stamina={false} gold={false} />} />
      <div className={s.bannerTabs} role="tablist">
        {banners.map((b) => (
          <button key={b.id} type="button" role="tab" className={s.bannerTab} aria-pressed={b.id === banner.id} aria-selected={b.id === banner.id} onClick={() => setTab(b.id)}>
            {b.name.toUpperCase()}
            {b.kind === 'beginner' ? <div className="faint" style={{ fontSize: 10 }}>{Math.max(0, beginnerLeft)}/{GACHA.beginner.maxPulls} left</div> : <div className="faint" style={{ fontSize: 10 }}>{daysLeft}d left</div>}
          </button>
        ))}
      </div>

      <div className={s.bannerHero} style={{ ['--hero' as string]: featured ? ELEMENT_COLOR[featured.element] : '#46f0c8' }}>
        {featured ? (
          <Portrait className={s.heroArt} id={featured.id} cls={featured.cls} element={featured.element} rarity="SSR" size={150} />
        ) : (
          <div className={s.heroArt} style={{ display: 'flex', gap: 4, right: 12, top: 14 }}>
            {banners[0].pool.SSR.slice(0, 2).map((id) => {
              const h = getHunter(id);
              return <Portrait key={id} id={id} cls={h.cls} element={h.element} rarity="SSR" size={64} />;
            })}
          </div>
        )}
        <div className={s.heroText}>
          <div className={s.heroKicker}>{isBeginner ? 'BEGINNER BANNER' : 'RATE-UP · 50/50'}</div>
          <h2 className={s.heroName}>{featured ? featured.name : 'First Awakening'}</h2>
          {featured ? (
            <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
              <Stars count={5} /> <ElementTag element={featured.element} />
              <span className="dim" style={{ fontSize: 12 }}>{CLASS_LABEL[featured.cls]}</span>
            </div>
          ) : null}
          <p className={s.heroBio}>
            {featured ? featured.bio : `Guaranteed SSR in your first 10-pull. Up to ${GACHA.beginner.maxPulls} pulls, 10 at a time.`}
          </p>
        </div>
      </div>

      <div className={s.pityRow}>
        <div className={s.stat}>
          <div className={s.statLabel}>PITY</div>
          <div className={s.statValue} data-testid="pity">
            {bs.pity}/{GACHA.hardPity}
          </div>
        </div>
        <div className={s.stat}>
          <div className={s.statLabel}>{isBeginner ? 'PULLS LEFT' : 'NEXT SSR'}</div>
          <div className={s.statValue} style={{ fontSize: 13 }}>
            {isBeginner ? `${Math.max(0, beginnerLeft)}` : bs.guaranteedFeatured ? <span style={{ color: 'var(--gold)' }}>Featured guaranteed</span> : '50/50 featured'}
          </div>
        </div>
      </div>

      <div className={s.pullBtns}>
        <Button className={s.pullBtn} disabled={isBeginner || save.currency.crystals < GACHA.costSingle} onClick={() => doPull(1)}>
          Summon ×1
          <span className={s.pullCost}><CrystalIcon /> {GACHA.costSingle}</span>
        </Button>
        <Button variant="gold" className={s.pullBtn} disabled={exhausted || save.currency.crystals < GACHA.costTen} onClick={() => doPull(10)}>
          Summon ×10
          <span className={s.pullCost}><CrystalIcon /> {GACHA.costTen.toLocaleString()}</span>
        </Button>
      </div>
      <p className="faint" style={{ fontSize: 11, textAlign: 'center' }}>
        {isBeginner ? 'Beginner banner: 10-pulls only.' : '10-pull guarantees at least one SR.'} Pity carries over between rotations.
      </p>
      <div className={s.links}>
        <Button small block onClick={() => setInfo('rates')}>Rates</Button>
        <Button small block onClick={() => setInfo('history')}>History</Button>
      </div>

      <Modal open={info === 'rates'} onClose={() => setInfo(null)} label="Rates">
        <h3 style={{ marginBottom: 10 }}>Summon Rates</h3>
        <div className={s.rates}>
          <span style={{ color: RARITY_COLOR.SSR }}>SSR (5★)</span><span className="num">{pct(GACHA.baseRates.SSR)}</span>
          <span style={{ color: RARITY_COLOR.SR }}>SR (4★)</span><span className="num">{pct(GACHA.baseRates.SR)}</span>
          <span style={{ color: RARITY_COLOR.R }}>R (3★)</span><span className="num">{pct(GACHA.baseRates.R)}</span>
          <span className="dim">Effective SSR rate incl. pity</span><span className="num">{pct(effectiveSsrRate(), 2)}</span>
        </div>
        <Panel className="col" >
          <p className="dim" style={{ fontSize: 13 }}>
            From pull {GACHA.softPityStart} since your last SSR, the SSR rate rises by {GACHA.softPityStep * 100} percentage points per pull. Pull {GACHA.hardPity} is a guaranteed SSR.
            On the featured banner, each SSR has a {GACHA.featuredChance * 100}% chance to be the featured hunter. If it isn't, your next SSR is guaranteed to be featured.
            Duplicates add Limit Break stars (max 5). Extra copies after that convert to Crystals.
          </p>
        </Panel>
        <div style={{ height: 10 }} />
        <Button block onClick={() => setInfo(null)}>Close</Button>
      </Modal>

      <Modal open={info === 'history'} onClose={() => setInfo(null)} label="Pull history">
        <h3 style={{ marginBottom: 10 }}>Pull History</h3>
        {save.gacha.history.length === 0 ? <p className="dim">No summons yet.</p> : null}
        <div className={s.histList}>
          {save.gacha.history.slice(0, 100).map((r, i) => {
            const h = getHunter(r.id);
            return (
              <div key={i} className={s.histRow}>
                <span style={{ color: RARITY_COLOR[r.rarity], fontWeight: 700 }}>{r.rarity}</span>
                <span>{h.name}<span className="faint" style={{ fontSize: 11 }}> · {r.banner} · pity {r.pity}</span></span>
                <span className="faint" style={{ fontSize: 11 }}>{new Date(r.t).toLocaleDateString()}</span>
              </div>
            );
          })}
        </div>
        <div style={{ height: 10 }} />
        <Button block onClick={() => setInfo(null)}>Close</Button>
      </Modal>

      {result ? <PullResults outcome={result} onClose={() => setResult(null)} /> : null}
    </div>
  );
}

export function PullResults({ outcome, onClose }: { outcome: PullOutcome; onClose: () => void }) {
  const single = outcome.results.length === 1;
  return (
    <div className={s.results} onClick={onClose} role="dialog" aria-label="Summon results">
      <h2 className="display" style={{ fontSize: 16, letterSpacing: '.2em' }}>SUMMON RESULTS</h2>
      <div className={`${s.resultGrid} ${single ? s.single : ''}`}>
        {outcome.results.map((r, i) => {
          const h = getHunter(r.hunterId);
          return (
            <div key={i} className={s.resultCell} style={{ animationDelay: `${i * 60}ms` }}>
              <Portrait id={h.id} cls={h.cls} element={h.element} rarity={r.rarity} size={single ? 160 : 70} />
              {r.kind === 'new' ? <span className={s.newTag}>NEW</span> : r.kind === 'star' ? <span className={s.starTag}>+★</span> : null}
              <span className={s.resultName} style={{ color: RARITY_COLOR[r.rarity] }}>{h.name.split(' ')[0]}</span>
              {single ? <Stars count={RARITY_STARS[r.rarity]} /> : null}
            </div>
          );
        })}
      </div>
      <p className="faint" style={{ fontSize: 12 }}>Tap anywhere to continue</p>
    </div>
  );
}
