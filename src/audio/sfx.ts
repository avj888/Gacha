/**
 * Synthesized SFX via WebAudio — no audio files. The context is created lazily on
 * the first user gesture (browsers block audio before that).
 */
export type SfxName = 'tap' | 'hit' | 'crit' | 'skill' | 'ult' | 'heal' | 'ko' | 'win' | 'lose' | 'pullR' | 'pullSR' | 'pullSSR' | 'gate' | 'levelup' | 'error';

let enabled = true;
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
const last: Partial<Record<SfxName, number>> = {};

export function setSoundEnabled(on: boolean) {
  enabled = on;
}

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    try {
      ctx = new C();
    } catch {
      return null;
    }
    master = ctx.createGain();
    master.gain.value = 0.32;
    master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
  return ctx;
}

/** Call from a user gesture to unlock audio on iOS. */
export function unlockAudio() {
  if (enabled) ac();
}

function tone(c: AudioContext, o: { type?: OscillatorType; f: number; f2?: number; t?: number; dur: number; vol?: number; attack?: number }) {
  const t0 = c.currentTime + (o.t ?? 0);
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.f, t0);
  if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t0 + o.dur);
  const v = o.vol ?? 0.3;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(v, t0 + (o.attack ?? 0.008));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
  osc.connect(g).connect(master!);
  osc.start(t0);
  osc.stop(t0 + o.dur + 0.02);
}

function noise(c: AudioContext, o: { t?: number; dur: number; vol?: number; freq?: number; freq2?: number; q?: number; type?: BiquadFilterType }) {
  const t0 = c.currentTime + (o.t ?? 0);
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  const f = c.createBiquadFilter();
  f.type = o.type ?? 'bandpass';
  f.frequency.setValueAtTime(o.freq ?? 1200, t0);
  if (o.freq2) f.frequency.exponentialRampToValueAtTime(o.freq2, t0 + o.dur);
  f.Q.value = o.q ?? 1;
  const g = c.createGain();
  const v = o.vol ?? 0.3;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(v, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
  src.connect(f).connect(g).connect(master!);
  src.start(t0);
  src.stop(t0 + o.dur + 0.02);
}

const arp = (c: AudioContext, notes: number[], step: number, type: OscillatorType, vol: number, dur = 0.25) =>
  notes.forEach((f, i) => tone(c, { type, f, t: i * step, dur, vol }));

export function sfx(name: SfxName) {
  if (!enabled) return;
  const c = ac();
  if (!c || !master) return;
  const now = performance.now();
  if ((last[name] ?? 0) > now - 45) return; // throttle bursts
  last[name] = now;
  switch (name) {
    case 'tap':
      tone(c, { f: 1500, f2: 900, dur: 0.05, vol: 0.08, type: 'triangle' });
      break;
    case 'hit':
      noise(c, { dur: 0.09, vol: 0.25, freq: 1800, freq2: 400 });
      tone(c, { f: 160, f2: 60, dur: 0.12, vol: 0.3 });
      break;
    case 'crit':
      noise(c, { dur: 0.18, vol: 0.35, freq: 3000, freq2: 300, q: 0.7 });
      tone(c, { f: 220, f2: 40, dur: 0.25, vol: 0.4, type: 'square' });
      break;
    case 'skill':
      tone(c, { f: 300, f2: 1200, dur: 0.18, vol: 0.12, type: 'sawtooth' });
      noise(c, { dur: 0.15, vol: 0.12, freq: 2500, type: 'highpass' });
      break;
    case 'ult':
      noise(c, { dur: 0.6, vol: 0.25, freq: 200, freq2: 4000, q: 0.8 });
      [220, 277, 330, 440].forEach((f) => tone(c, { f, dur: 0.8, vol: 0.09, type: 'sawtooth', attack: 0.1 }));
      tone(c, { f: 80, f2: 40, dur: 0.6, vol: 0.4, t: 0.15 });
      break;
    case 'heal':
      arp(c, [660, 880, 1320], 0.06, 'triangle', 0.1, 0.3);
      break;
    case 'ko':
      tone(c, { f: 400, f2: 60, dur: 0.45, vol: 0.2, type: 'triangle' });
      noise(c, { dur: 0.3, vol: 0.12, freq: 600, freq2: 100 });
      break;
    case 'win':
      arp(c, [523, 659, 784, 1047], 0.09, 'triangle', 0.16, 0.4);
      break;
    case 'lose':
      arp(c, [392, 330, 262, 196], 0.14, 'sine', 0.16, 0.5);
      break;
    case 'gate':
      noise(c, { dur: 0.9, vol: 0.18, freq: 150, freq2: 1800, q: 1.5 });
      tone(c, { f: 55, f2: 110, dur: 0.9, vol: 0.25, attack: 0.2 });
      break;
    case 'pullR':
      arp(c, [523, 784], 0.08, 'sine', 0.14, 0.5);
      break;
    case 'pullSR':
      arp(c, [523, 659, 988, 1319], 0.08, 'triangle', 0.14, 0.6);
      break;
    case 'pullSSR':
      noise(c, { dur: 1.2, vol: 0.12, freq: 6000, type: 'highpass' });
      arp(c, [523, 659, 784, 1047, 1319, 1568], 0.07, 'triangle', 0.16, 0.9);
      [262, 330, 392].forEach((f) => tone(c, { f, dur: 1.5, vol: 0.08, type: 'sawtooth', attack: 0.3, t: 0.4 }));
      break;
    case 'levelup':
      arp(c, [784, 988, 1175, 1568], 0.06, 'square', 0.06, 0.2);
      break;
    case 'error':
      tone(c, { f: 140, dur: 0.18, vol: 0.18, type: 'square' });
      break;
  }
}
