import { GATE_MAP, gateWaves } from '../data/gates';
import { buildAllies, buildEchoes } from '../engine/team';
import { randomSeed } from '../engine/rng';
import { useBattle } from '../store/battleStore';
import { useGame } from '../store/gameStore';
import { Button, ScreenHead, SystemPanel } from '../ui/kit';

/** Phase 2: training simulation only. The full gate map arrives in phase 3. */
export function Gates() {
  const save = useGame((g) => g.save);
  const start = useBattle((b) => b.start);
  const launch = () => {
    const gate = GATE_MAP['E-1'];
    start({
      kind: 'training',
      title: 'Training Simulation',
      subtitle: gate.name,
      canRetreat: true,
      setup: { allies: buildAllies(save), waves: gateWaves(gate), echoes: buildEchoes(save), seed: randomSeed() },
    });
  };
  return (
    <>
      <ScreenHead title="Gates" backable={false} />
      <SystemPanel title="SYSTEM // SIMULATION">
        <p style={{ marginBottom: 12 }}>Real gates are still sealed. Practice against simulated Rift creatures. No rewards.</p>
        <Button variant="primary" block onClick={launch}>Enter Simulation</Button>
      </SystemPanel>
    </>
  );
}
