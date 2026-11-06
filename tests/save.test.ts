import { describe, expect, it } from 'vitest';
import { migrate } from '../src/save/migrations';
import { CURRENT_VERSION, defaultSave } from '../src/save/schema';
import { exportSave, importSave } from '../src/save/storage';

describe('save system', () => {
  it('round-trips through export/import', () => {
    const s = defaultSave(1700000000000);
    s.player.name = 'Ünïcødé Hunter ✦';
    s.currency.crystals = 12345;
    const code = exportSave(s);
    expect(code.startsWith('RIFT1.')).toBe(true);
    expect(importSave(code)).toEqual(s);
  });

  it('tolerates whitespace/newlines in pasted codes', () => {
    const s = defaultSave(1);
    const code = exportSave(s);
    const messy = code.slice(0, 20) + '\n  ' + code.slice(20);
    expect(importSave(messy)).toEqual(s);
  });

  it('rejects tampered codes', () => {
    const code = exportSave(defaultSave(1));
    const [p, b, c] = code.split('.');
    const tampered = `${p}.${b.slice(0, -4)}AAAA.${c}`;
    expect(() => importSave(tampered)).toThrow();
    expect(() => importSave('hello')).toThrow(/Not a RIFTBORN/);
  });

  it('migrates a v0 prototype save to the current version', () => {
    const s = migrate({ crystals: 999, roster: ['r-wren', 'sr-lumi'], createdAt: 5 });
    expect(s.version).toBe(CURRENT_VERSION);
    expect(s.currency.crystals).toBe(999);
    expect(Object.keys(s.hunters).sort()).toEqual(['r-wren', 'sr-lumi']);
  });

  it('repairs saves missing newer keys', () => {
    const s = defaultSave(1) as Record<string, any>;
    delete s.settings;
    delete s.stats.playMs;
    const fixed = migrate(s);
    expect(fixed.settings.sound).toBe(true);
    expect(fixed.stats.playMs).toBe(0);
  });

  it('refuses saves from the future', () => {
    expect(() => migrate({ ...defaultSave(1), version: 999 })).toThrow(/newer/);
  });
});
