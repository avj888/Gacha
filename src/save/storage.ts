import { SAVE } from '../config/balance';
import { migrate } from './migrations';
import { defaultSave, type Save } from './schema';

const BACKUP_KEY = SAVE.key + '.backup';

function getStorage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

export function loadSave(now = Date.now()): Save {
  const ls = getStorage();
  const raw = ls?.getItem(SAVE.key);
  if (!raw) return defaultSave(now);
  try {
    return migrate(JSON.parse(raw));
  } catch (e) {
    console.warn('[save] failed to load, starting fresh (old save kept as backup)', e);
    ls?.setItem(BACKUP_KEY, raw);
    return defaultSave(now);
  }
}

export function writeSave(s: Save) {
  try {
    getStorage()?.setItem(SAVE.key, JSON.stringify(s));
  } catch (e) {
    console.warn('[save] write failed', e);
  }
}

export function clearSave() {
  getStorage()?.removeItem(SAVE.key);
}

// -------------------------------------------------- export / import

/** FNV-1a 32-bit, hex */
export function checksum(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

function toBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

function fromBase64(b64: string): string {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/** Format: RIFT1.<base64 json>.<checksum> */
export function exportSave(s: Save): string {
  const json = JSON.stringify(s);
  return `${SAVE.exportPrefix}.${toBase64(json)}.${checksum(json)}`;
}

export function importSave(code: string): Save {
  const trimmed = code.replace(/\s+/g, '');
  const parts = trimmed.split('.');
  if (parts.length !== 3 || parts[0] !== SAVE.exportPrefix) throw new Error('Not a RIFTBORN save code.');
  let json: string;
  try {
    json = fromBase64(parts[1]);
  } catch {
    throw new Error('Save code is corrupted (bad encoding).');
  }
  if (checksum(json) !== parts[2]) throw new Error('Save code is corrupted (checksum mismatch).');
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error('Save code is corrupted (bad data).');
  }
  if (typeof data !== 'object' || data === null) throw new Error('Save code is empty.');
  return migrate(data as Record<string, unknown>);
}
