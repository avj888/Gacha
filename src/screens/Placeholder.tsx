import { ScreenHead, SystemPanel } from '../ui/kit';

export function Placeholder({ title, phase }: { title: string; phase: number }) {
  return (
    <>
      <ScreenHead title={title} />
      <SystemPanel title="SYSTEM // NOTICE">
        <p>This sector is still sealed. It opens in build phase {phase}.</p>
      </SystemPanel>
    </>
  );
}
