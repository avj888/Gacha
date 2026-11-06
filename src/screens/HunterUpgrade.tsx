import { HUNTER } from '../config/balance';
import { getHunter } from '../data/hunters';
import { affordableLevels, canAscend } from '../engine/game';
import { ascensionCost, levelCap, levelUpCost, maxAscension } from '../engine/progression';
import { teamSize } from '../engine/team';
import { useGame } from '../store/gameStore';
import { toast } from '../store/uiStore';
import { sfx } from '../audio/sfx';
import { Button, EssenceIcon, GoldIcon, Panel } from '../ui/kit';
import { ELEMENT_LABEL, fmt } from '../ui/meta';

export function HunterUpgrade({ id }: { id: string }) {
  const save = useGame((g) => g.save);
  const levelUp = useGame((g) => g.levelUp);
  const ascend = useGame((g) => g.ascend);
  const setSlot = useGame((g) => g.setSlot);
  const h = save.hunters[id];
  if (!h) return null;
  const def = getHunter(id);
  const cap = levelCap(h.ascension);
  const atCap = h.level >= cap;
  const one = levelUpCost(h.level);
  const ten = affordableLevels(save, id, 10);
  const max = affordableLevels(save, id);
  const asc = h.ascension < maxAscension() ? ascensionCost(h.ascension) : null;
  const size = teamSize(save);
  const inTeam = save.team.slots.slice(0, size).includes(id);
  const free = save.team.slots.slice(0, size).findIndex((x) => !x);

  const lv = (n: number) => {
    const done = levelUp(id, n);
    if (done) {
      sfx('levelup');
      toast(`${def.name.split(' ')[0]} reached Lv ${h.level + done}`, 'good');
    } else toast('Not enough Gold or Essence', 'bad');
  };

  return (
    <Panel className="col">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h3 style={{ fontSize: 12, letterSpacing: '.14em' }}>UPGRADE</h3>
        <span className="dim num row" style={{ fontSize: 12, gap: 4 }}>
          <GoldIcon /> {fmt(save.currency.gold)} · <EssenceIcon /> {fmt(save.currency.essence)}
        </span>
      </div>
      {!atCap ? (
        <>
          <span className="dim" style={{ fontSize: 12 }}>Next level: {fmt(one.gold)} gold · {fmt(one.essence)} essence</span>
          <div className="row">
            <Button block small onClick={() => lv(1)} disabled={max.levels < 1}>+1</Button>
            <Button block small onClick={() => lv(10)} disabled={ten.levels < 1}>+{Math.max(1, ten.levels)}</Button>
            <Button block small variant="primary" onClick={() => lv(999)} disabled={max.levels < 1}>Max (+{max.levels})</Button>
          </div>
        </>
      ) : asc ? (
        <>
          <span className="dim" style={{ fontSize: 12 }}>
            Level cap {cap}. Ascend to raise it to {levelCap(h.ascension + 1)} and gain +{HUNTER.ascensionStatBonus * 100}% HP/ATK/DEF.
          </span>
          <span style={{ fontSize: 12 }}>
            Cost: {asc.mats} {ELEMENT_LABEL[def.element]} Cores (have {save.currency.mats[def.element]}) · {fmt(asc.gold)} gold
          </span>
          <Button variant="gold" block disabled={!canAscend(save, id)} onClick={() => { if (ascend(id)) { sfx('levelup'); toast('Ascended!', 'good'); } }}>
            Ascend
          </Button>
          <span className="faint" style={{ fontSize: 11 }}>{ELEMENT_LABEL[def.element]} Cores drop from {ELEMENT_LABEL[def.element]} gate bosses.</span>
        </>
      ) : (
        <span className="dim">Fully ascended and at max level.</span>
      )}
      {!inTeam ? (
        <Button block disabled={free < 0} onClick={() => { setSlot(free, id); toast('Added to team', 'good'); }}>
          {free < 0 ? 'Team full (edit in Team)' : 'Add to team'}
        </Button>
      ) : (
        <span className="faint" style={{ fontSize: 11, textAlign: 'center' }}>In your strike team</span>
      )}
      <span className="faint" style={{ fontSize: 11 }}>Duplicates from summons add a Limit Break star (+{HUNTER.starStatBonus * 100}% all stats, passives at ★1/★3/★5).</span>
    </Panel>
  );
}
