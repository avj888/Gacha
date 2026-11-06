import { useState } from 'react';
import { exportSave, importSave } from '../save/storage';
import { useGame, flushSave } from '../store/gameStore';
import { toast } from '../store/uiStore';
import { Button, Modal, Panel, ScreenHead, Segmented } from '../ui/kit';
import type { Settings as SettingsT } from '../save/schema';
import s from './screens.module.css';

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className={s.setRow}>
      <span>{label}</span>
      <button type="button" role="switch" aria-checked={value} aria-label={label} className={s.toggle} onClick={() => onChange(!value)} />
    </div>
  );
}

export function Settings() {
  const save = useGame((g) => g.save);
  const update = useGame((g) => g.update);
  const replaceSave = useGame((g) => g.replaceSave);
  const resetSave = useGame((g) => g.resetSave);
  const [code, setCode] = useState('');
  const [mode, setMode] = useState<'export' | 'import' | 'reset' | null>(null);
  const set = <K extends keyof SettingsT>(k: K, v: SettingsT[K]) => update((d) => void (d.settings[k] = v));

  const openExport = () => {
    setCode(exportSave(save));
    setMode('export');
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast('Save code copied', 'good');
    } catch {
      toast('Copy failed. Select the text and copy it manually.', 'bad');
    }
  };
  const doImport = () => {
    try {
      const s2 = importSave(code);
      replaceSave(s2);
      flushSave();
      toast('Save imported', 'good');
      setMode(null);
      setCode('');
    } catch (e) {
      toast((e as Error).message, 'bad');
    }
  };

  return (
    <div className={s.stack}>
      <ScreenHead title="Settings" />
      <Panel>
        <Toggle label="Sound effects" value={save.settings.sound} onChange={(v) => set('sound', v)} />
        <Toggle label="Haptics" value={save.settings.haptics} onChange={(v) => set('haptics', v)} />
        <div className={s.setRow} style={{ flexDirection: 'column', alignItems: 'stretch', padding: '10px 0', gap: 8 }}>
          <span>Reduced motion</span>
          <Segmented
            label="Reduced motion"
            value={save.settings.reducedMotion}
            onChange={(v) => set('reducedMotion', v)}
            options={[{ value: 'system', label: 'System' }, { value: 'on', label: 'On' }, { value: 'off', label: 'Off' }]}
          />
        </div>
        <div className={s.setRow}>
          <span>Hunter name</span>
          <input
            aria-label="Hunter name"
            value={save.player.name}
            maxLength={16}
            onChange={(e) => update((d) => void (d.player.name = e.target.value))}
            style={{ background: 'rgba(0,0,0,.3)', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px', width: 160, minHeight: 44 }}
          />
        </div>
      </Panel>
      <Panel className="col">
        <h3 style={{ fontSize: 12, letterSpacing: '.14em' }}>SAVE DATA</h3>
        <p className="dim" style={{ fontSize: 13 }}>Your progress is stored on this device. Export a code to back it up or move it to another device.</p>
        <div className="row">
          <Button block onClick={openExport}>Export save</Button>
          <Button block onClick={() => { setCode(''); setMode('import'); }}>Import save</Button>
        </div>
        <Button variant="danger" block onClick={() => setMode('reset')}>Reset progress</Button>
      </Panel>
      <p className="faint" style={{ fontSize: 11, textAlign: 'center' }}>RIFTBORN v{__APP_VERSION__} · offline · no accounts · no purchases</p>

      <Modal open={mode === 'export'} onClose={() => setMode(null)} label="Export save">
        <h3 style={{ marginBottom: 10 }}>Export Save</h3>
        <textarea className={s.code} readOnly value={code} onFocus={(e) => e.currentTarget.select()} aria-label="Save code" />
        <div style={{ height: 10 }} />
        <div className="row">
          <Button variant="primary" block onClick={copy}>Copy</Button>
          <Button block onClick={() => setMode(null)}>Close</Button>
        </div>
      </Modal>
      <Modal open={mode === 'import'} onClose={() => setMode(null)} label="Import save">
        <h3 style={{ marginBottom: 6 }}>Import Save</h3>
        <p className="dim" style={{ fontSize: 13, marginBottom: 10 }}>This replaces your current progress.</p>
        <textarea className={s.code} value={code} onChange={(e) => setCode(e.target.value)} placeholder="Paste a RIFT1.… code" aria-label="Paste save code" />
        <div style={{ height: 10 }} />
        <div className="row">
          <Button variant="primary" block disabled={!code.trim()} onClick={doImport}>Import</Button>
          <Button block onClick={() => setMode(null)}>Cancel</Button>
        </div>
      </Modal>
      <Modal open={mode === 'reset'} onClose={() => setMode(null)} label="Reset progress">
        <h3 style={{ marginBottom: 6 }}>Reset all progress?</h3>
        <p className="dim" style={{ fontSize: 13, marginBottom: 12 }}>This can't be undone. Export your save first if you might want it back.</p>
        <div className="row">
          <Button variant="danger" block onClick={() => { resetSave(); setMode(null); toast('Progress reset', 'system'); }}>Reset</Button>
          <Button block onClick={() => setMode(null)}>Cancel</Button>
        </div>
      </Modal>
    </div>
  );
}
