import { memo } from 'react';
import type { Element, Figure, Rarity, UnitClass } from '../types';
import { HUNTER_MAP } from '../data/hunters';
import { useGame } from '../store/gameStore';
import { ELEMENT_COLOR, RARITY_COLOR } from '../ui/meta';

interface Props {
  id: string;
  cls: UnitClass;
  element: Element;
  rarity?: Rarity | 'boss' | 'player';
  size?: number;
  /** show rarity frame */
  frame?: boolean;
  dim?: boolean;
  className?: string;
  /** override body type (defaults: hunter data, or the player's avatar setting) */
  figure?: Figure;
}

function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Element-specific pattern behind the silhouette. */
function Aura({ element, c, h }: { element: Element; c: string; h: number }) {
  const j = (k: number) => ((h >> k) % 9) - 4;
  switch (element) {
    case 'flame':
      return (
        <g fill={c} opacity=".28">
          {[12, 30, 50, 70, 88].map((x, i) => (
            <path key={i} d={`M${x - 8} 120 Q${x - 6 + j(i)} ${80 - i * 3} ${x + j(i + 2)} ${46 + ((i * 13) % 20)} Q${x + 6} ${82} ${x + 8} 120Z`} />
          ))}
        </g>
      );
    case 'frost':
      return (
        <g fill="none" stroke={c} strokeWidth="1.2" opacity=".35">
          {[[18, 30], [82, 26], [12, 80], [88, 76], [50, 14]].map(([x, y], i) => (
            <path key={i} d={`M${x} ${y - 8} L${x + 4} ${y} L${x} ${y + 8} L${x - 4} ${y}Z M${x} ${y - 12} V${y + 12} M${x - 9} ${y} H${x + 9}`} />
          ))}
        </g>
      );
    case 'storm':
      return (
        <g fill="none" stroke={c} strokeWidth="1.6" strokeLinejoin="round" opacity=".4">
          <path d={`M14 6 L24 30 L16 32 L28 58`} />
          <path d={`M86 10 L76 36 L84 38 L72 66`} />
          <path d={`M50 0 L46 12 L52 14 L48 24`} strokeWidth="1" />
        </g>
      );
    case 'void':
      return (
        <g fill="none" stroke={c} opacity=".3">
          {[16, 28, 40, 54].map((r, i) => (
            <circle key={r} cx="50" cy="52" r={r} strokeWidth={i % 2 ? 0.6 : 1.2} strokeDasharray={i % 2 ? '2 4' : undefined} />
          ))}
        </g>
      );
    case 'radiant':
      return (
        <g stroke={c} strokeWidth="1.2" opacity=".32">
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * Math.PI * 2;
            return <line key={i} x1={50 + Math.cos(a) * 18} y1={46 + Math.sin(a) * 18} x2={50 + Math.cos(a) * 70} y2={46 + Math.sin(a) * 70} />;
          })}
        </g>
      );
    case 'rift':
      return (
        <g fill="none" stroke={c} strokeWidth=".8" opacity=".3">
          {[0, 1, 2, 3].map((i) => (
            <path key={i} d={`M${10 + i * 26} ${10 + (i % 2) * 8} l10 6 v12 l-10 6 l-10 -6 v-12z`} />
          ))}
          <path d="M8 96 L30 74 L42 84 L64 60 L92 88" strokeWidth="1.2" />
        </g>
      );
  }
}

/** Class props drawn behind/around the silhouette. Coordinates in a 100x120 box. */
function Prop({ cls, c }: { cls: UnitClass; c: string }) {
  switch (cls) {
    case 'striker':
      return (
        <g>
          <circle cx="22" cy="78" r="9" fill="#0b0d1a" stroke={c} strokeWidth="1.5" />
          <circle cx="78" cy="78" r="9" fill="#0b0d1a" stroke={c} strokeWidth="1.5" />
          <path d="M16 74h12M72 74h12" stroke={c} strokeWidth="1.2" opacity=".7" />
        </g>
      );
    case 'assassin':
      return (
        <g>
          <path d="M80 50 L92 86 L86 88 Z" fill={c} opacity=".9" />
          <path d="M20 50 L8 86 L14 88 Z" fill={c} opacity=".9" />
        </g>
      );
    case 'ranger':
      return (
        <g fill="none" stroke={c} strokeWidth="2">
          <path d="M86 22 Q104 62 86 102" />
          <path d="M86 22 L86 102" strokeWidth=".7" opacity=".7" />
          <path d="M60 62 L94 62" strokeWidth="1.2" />
        </g>
      );
    case 'mage':
      return (
        <g>
          <path d="M14 30 L14 110" stroke={c} strokeWidth="2.2" />
          <circle cx="14" cy="24" r="7" fill={c} opacity=".9" />
          <circle cx="84" cy="34" r="4" fill={c} opacity=".7" />
          <circle cx="90" cy="48" r="2.5" fill={c} opacity=".5" />
        </g>
      );
    case 'tank':
      return (
        <g>
          <path d="M60 58 h30 v26 q0 18 -15 26 q-15 -8 -15 -26z" fill="#0b0d1a" stroke={c} strokeWidth="2" />
          <path d="M75 66 v34 M64 78 h22" stroke={c} strokeWidth="1.2" opacity=".6" />
        </g>
      );
    case 'healer':
      return (
        <g>
          <ellipse cx="50" cy="14" rx="18" ry="4.5" fill="none" stroke={c} strokeWidth="2" />
          <path d="M84 36 L84 112" stroke={c} strokeWidth="2" />
          <path d="M78 42 h12 M84 36 v12" stroke={c} strokeWidth="2" />
        </g>
      );
    case 'awakened':
      return (
        <g fill="none" stroke={c} strokeWidth="1.4" opacity=".9">
          <path d="M50 4 L58 18 L50 14 L42 18 Z" fill={c} />
          <path d="M18 100 L30 70 M82 100 L70 70" />
        </g>
      );
    case 'beast':
      return (
        <g fill={c} opacity=".85">
          <path d="M30 24 L36 8 L42 26 Z" />
          <path d="M70 24 L64 8 L58 26 Z" />
        </g>
      );
    case 'boss':
      return (
        <g fill={c} opacity=".9">
          <path d="M26 30 L18 4 L38 24 Z" />
          <path d="M74 30 L82 4 L62 24 Z" />
          <path d="M44 20 L50 2 L56 20 Z" />
        </g>
      );
  }
}

const SKIN = ['#f6dcc8', '#efc6a8', '#d9a57f', '#b07a55', '#7d5238'];
const HAIR = ['#1a1b2b', '#3b2620', '#d9b95a', '#e6e6f2', '#8c2f3d', '#2f4f9e', '#5e3a9e', '#2d6b5a'];

/** Anime-style hunter / player figure. Coordinates in a 100x120 box. */
function AnimeFigure({ cls, c, h, figure, uid }: { cls: UnitClass; c: string; h: number; figure: Figure; uid: string }) {
  const f = figure === 'f';
  const cx = 50 + ((h % 5) - 2) * 0.5;
  const hy = 40;
  const hw = f ? 10.5 : 11.2;
  const skin = SKIN[h % SKIN.length];
  const hairPick = (h >> 4) % (HAIR.length + 2);
  const hair = hairPick >= HAIR.length ? c : HAIR[hairPick];
  const style = (h >> 9) % (f ? 4 : 3);
  const hood = cls === 'assassin';
  const outfit = `url(#${uid}o)`;

  // torso: broad straight shoulders (m) / narrower shoulders, defined waist (f)
  const torso = f
    ? `M20 120 Q22 102 28 96 Q30 86 41 82 L59 82 Q70 86 72 96 Q78 102 80 120 Z`
    : `M14 120 Q16 98 24 91 Q30 84 40 81 L60 81 Q70 84 76 91 Q84 98 86 120 Z`;

  // back hair (behind head/body)
  let backHair: string | null = null;
  if (f && style === 0) backHair = `M${cx - 15} ${hy - 6} Q${cx - 20} ${hy + 30} ${cx - 17} ${hy + 58} L${cx + 17} ${hy + 58} Q${cx + 20} ${hy + 30} ${cx + 15} ${hy - 6} Z`;
  if (f && style === 3) backHair = `M${cx + 8} ${hy - 12} Q${cx + 26} ${hy - 6} ${cx + 22} ${hy + 22} Q${cx + 20} ${hy + 40} ${cx + 26} ${hy + 52} Q${cx + 12} ${hy + 40} ${cx + 12} ${hy + 14} Z`;
  if (f && style === 2) backHair = `M${cx - 14} ${hy - 6} Q${cx - 16} ${hy + 12} ${cx - 12} ${hy + 16} L${cx + 12} ${hy + 16} Q${cx + 16} ${hy + 12} ${cx + 14} ${hy - 6} Z`;
  const twinTails = f && style === 1;

  // fringe / top hair
  const fringe = f
    ? `M${cx - hw - 2} ${hy + 2} Q${cx - hw - 3} ${hy - 16} ${cx} ${hy - 16} Q${cx + hw + 3} ${hy - 16} ${cx + hw + 2} ${hy + 2}
       L${cx + hw - 1} ${hy - 4} L${cx + 6} ${hy - 7} L${cx + 3} ${hy - 2} L${cx - 1} ${hy - 8} L${cx - 4} ${hy - 3} L${cx - 7} ${hy - 7} L${cx - hw + 1} ${hy - 4} Z`
    : style === 0
      ? `M${cx - hw - 1} ${hy - 1} L${cx - hw - 5} ${hy - 12} L${cx - 7} ${hy - 13} L${cx - 9} ${hy - 22} L${cx - 2} ${hy - 15} L${cx + 1} ${hy - 25} L${cx + 5} ${hy - 15} L${cx + 12} ${hy - 21} L${cx + 10} ${hy - 12} L${cx + hw + 5} ${hy - 10} L${cx + hw + 1} ${hy - 1}
         L${cx + hw - 1} ${hy - 5} L${cx + 5} ${hy - 6} L${cx + 2} ${hy - 1} L${cx - 2} ${hy - 7} L${cx - 6} ${hy - 3} L${cx - hw + 1} ${hy - 5} Z`
      : style === 1
        ? `M${cx - hw - 1} ${hy + 1} L${cx - hw - 3} ${hy - 9} Q${cx - hw} ${hy - 18} ${cx} ${hy - 17} L${cx + 6} ${hy - 21} L${cx + 7} ${hy - 16} L${cx + 15} ${hy - 17} L${cx + 12} ${hy - 12} L${cx + hw + 6} ${hy - 9} L${cx + hw + 1} ${hy - 4} L${cx + hw + 2} ${hy + 1}
           L${cx + hw - 1} ${hy - 3} L${cx + 8} ${hy - 7} L${cx + 6} ${hy - 1} L${cx + 2} ${hy - 7} L${cx - 2} ${hy - 2} L${cx - 3} ${hy - 8} L${cx - 8} ${hy - 4} L${cx - hw + 1} ${hy - 4} Z`
        : `M${cx - hw - 1} ${hy + 1} Q${cx - hw - 2} ${hy - 16} ${cx} ${hy - 16} Q${cx + hw + 2} ${hy - 16} ${cx + hw + 1} ${hy + 1}
           L${cx + hw - 1} ${hy - 5} L${cx + 7} ${hy - 4} L${cx + 4} ${hy - 9} L${cx + 1} ${hy - 4} L${cx - 3} ${hy - 9} L${cx - 6} ${hy - 4} L${cx - hw + 1} ${hy - 5} Z`;

  const face = `M${cx - hw} ${hy - 4} Q${cx - hw} ${hy + 9} ${cx - 4} ${hy + 14} Q${cx} ${hy + 16.5} ${cx + 4} ${hy + 14} Q${cx + hw} ${hy + 9} ${cx + hw} ${hy - 4} Q${cx + hw} ${hy - 14} ${cx} ${hy - 14} Q${cx - hw} ${hy - 14} ${cx - hw} ${hy - 4} Z`;
  const eyeY = hy + 2;
  const eyeRy = f ? 3.3 : 2.7;
  const eye = (ex: number, dir: 1 | -1) => (
    <g>
      <ellipse cx={ex} cy={eyeY} rx="2.7" ry={eyeRy} fill="#fff" />
      <ellipse cx={ex + 0.2 * dir} cy={eyeY + 0.3} rx="2" ry={eyeRy - 0.5} fill={c} />
      <ellipse cx={ex + 0.2 * dir} cy={eyeY + 0.6} rx="1" ry={eyeRy - 1.4} fill="#0b0c18" />
      <circle cx={ex - 0.7} cy={eyeY - 0.9} r="0.75" fill="#fff" />
      <path d={`M${ex - 3.1} ${eyeY - eyeRy + 0.6} Q${ex} ${eyeY - eyeRy - 1} ${ex + 3.1} ${eyeY - eyeRy + 0.4}${f ? ` L${ex + 3.1 * dir * dir + 1.2 * dir} ${eyeY - eyeRy - 0.6}` : ''}`} stroke="#14121c" strokeWidth={f ? 1.1 : 0.8} fill="none" strokeLinecap="round" />
      <path d={`M${ex - 2.6} ${eyeY - eyeRy - 2.6} Q${ex} ${eyeY - eyeRy - (f ? 3.6 : 3.2)} ${ex + 2.6} ${eyeY - eyeRy - 2.4}`} stroke={hair} strokeWidth={f ? 0.6 : 0.9} fill="none" strokeLinecap="round" />
    </g>
  );

  return (
    <g>
      {twinTails ? (
        <g fill={hair}>
          <path d={`M${cx - 12} ${hy - 10} Q${cx - 28} ${hy} ${cx - 24} ${hy + 30} Q${cx - 22} ${hy + 44} ${cx - 28} ${hy + 54} Q${cx - 14} ${hy + 40} ${cx - 15} ${hy + 6} Z`} />
          <path d={`M${cx + 12} ${hy - 10} Q${cx + 28} ${hy} ${cx + 24} ${hy + 30} Q${cx + 22} ${hy + 44} ${cx + 28} ${hy + 54} Q${cx + 14} ${hy + 40} ${cx + 15} ${hy + 6} Z`} />
        </g>
      ) : null}
      {backHair ? <path d={backHair} fill={hair} /> : null}
      {hood ? <path d={`M${cx - 24} ${hy + 56} Q${cx - 22} ${hy + 30} ${cx - 19} ${hy + 22} Q${cx - 22} ${hy - 22} ${cx} ${hy - 22} Q${cx + 22} ${hy - 22} ${cx + 19} ${hy + 22} Q${cx + 22} ${hy + 30} ${cx + 24} ${hy + 56} Z`} fill="#11132a" stroke={c} strokeOpacity=".5" strokeWidth="1" /> : null}

      {/* torso / outfit */}
      <path d={torso} fill={outfit} stroke={c} strokeOpacity=".55" strokeWidth="1" />
      <Outfit cls={cls} c={c} f={f} cx={cx} />

      {/* neck */}
      <path d={`M${cx - 4} ${hy + 11} L${cx - 4.5} ${hy + 22} Q${cx} ${hy + 25} ${cx + 4.5} ${hy + 22} L${cx + 4} ${hy + 11} Z`} fill={skin} />
      <path d={`M${cx - 4} ${hy + 15} Q${cx} ${hy + 18} ${cx + 4} ${hy + 15}`} stroke="#000" strokeOpacity=".18" strokeWidth="2" fill="none" />
      {cls === 'striker' || cls === 'awakened' ? (
        <path d={`M${cx - 9} ${hy + 22} Q${cx} ${hy + 28} ${cx + 9} ${hy + 22} L${cx + 7} ${hy + 30} Q${cx} ${hy + 33} ${cx - 7} ${hy + 30} Z`} fill={c} opacity=".85" />
      ) : null}

      {/* face */}
      <path d={face} fill={skin} />
      <path d={`M${cx - hw} ${hy + 1} Q${cx - hw + 1} ${hy + 9} ${cx - 4} ${hy + 14}`} stroke="#000" strokeOpacity=".08" strokeWidth="2" fill="none" />
      {eye(cx - 4.7, -1)}
      {eye(cx + 4.7, 1)}
      <path d={`M${cx + 0.4} ${hy + 6} l-0.6 1.6 h1`} stroke="#000" strokeOpacity=".25" strokeWidth=".6" fill="none" />
      {hood ? (
        <path d={`M${cx - hw + 0.5} ${hy + 6.5} Q${cx} ${hy + 5} ${cx + hw - 0.5} ${hy + 6.5} Q${cx + hw - 1} ${hy + 11} ${cx + 4} ${hy + 14} Q${cx} ${hy + 16.5} ${cx - 4} ${hy + 14} Q${cx - hw + 1} ${hy + 11} ${cx - hw + 0.5} ${hy + 6.5} Z`} fill="#161830" stroke={c} strokeOpacity=".5" strokeWidth=".6" />
      ) : (
        <path d={f ? `M${cx - 1.6} ${hy + 10.2} Q${cx} ${hy + 11.2} ${cx + 1.6} ${hy + 10.2}` : `M${cx - 2} ${hy + 10.4} L${cx + 2} ${hy + 10.4}`} stroke="#8a3b3b" strokeWidth=".8" fill="none" strokeLinecap="round" />
      )}
      {f && !hood ? (
        <g fill="#ff7a9a" opacity=".28">
          <ellipse cx={cx - 7} cy={hy + 7} rx="2" ry="1" />
          <ellipse cx={cx + 7} cy={hy + 7} rx="2" ry="1" />
        </g>
      ) : null}

      {/* hair front */}
      {!hood ? (
        <>
          <path d={fringe} fill={hair} />
          <path d={fringe} fill="none" stroke="#fff" strokeOpacity=".12" strokeWidth=".6" />
          {f && (style === 0 || style === 3) ? (
            <g fill={hair}>
              <path d={`M${cx - hw - 2} ${hy - 2} Q${cx - hw - 3} ${hy + 10} ${cx - hw + 1} ${hy + 18} L${cx - hw + 2} ${hy + 4} Z`} />
              <path d={`M${cx + hw + 2} ${hy - 2} Q${cx + hw + 3} ${hy + 10} ${cx + hw - 1} ${hy + 18} L${cx + hw - 2} ${hy + 4} Z`} />
            </g>
          ) : null}
          {/* hair shine */}
          <path d={`M${cx - 6} ${hy - 12} Q${cx} ${hy - 14} ${cx + 6} ${hy - 12}`} stroke="#fff" strokeOpacity=".35" strokeWidth="1" fill="none" />
        </>
      ) : (
        <path d={`M${cx - hw - 1} ${hy - 2} Q${cx} ${hy - 10} ${cx + hw + 1} ${hy - 2}`} fill="none" stroke={hair} strokeWidth="2.4" />
      )}
      {cls === 'healer' ? <ellipse cx={cx} cy={hy - 20} rx="12" ry="3" fill="none" stroke={c} strokeWidth="1.6" /> : null}
    </g>
  );
}

/** Class outfit details drawn over the torso. */
function Outfit({ cls, c, f, cx }: { cls: UnitClass; c: string; f: boolean; cx: number }) {
  const sh = f ? 22 : 27;
  switch (cls) {
    case 'striker':
      return (
        <g>
          <path d={`M${cx - 10} 82 L${cx - 3} 120 M${cx + 10} 82 L${cx + 3} 120`} stroke={c} strokeOpacity=".7" strokeWidth="1.4" />
          <path d={`M${cx - sh} 96 Q${cx - sh + 4} 90 ${cx - 12} 86`} stroke={c} strokeOpacity=".5" strokeWidth="1" fill="none" />
        </g>
      );
    case 'assassin':
      return <path d={`M${cx - 14} 86 L${cx} 104 L${cx + 14} 86`} stroke={c} strokeOpacity=".7" strokeWidth="1.2" fill="none" />;
    case 'ranger':
      return (
        <g>
          <path d={`M${cx - sh + 4} 92 L${cx + sh - 2} 118`} stroke="#5a3b22" strokeWidth="3" />
          <path d={`M${cx - sh + 4} 92 L${cx + sh - 2} 118`} stroke={c} strokeOpacity=".5" strokeWidth=".8" />
          <path d={`M${cx - 13} 83 Q${cx} 92 ${cx + 13} 83`} stroke={c} strokeOpacity=".6" strokeWidth="1.2" fill="none" />
        </g>
      );
    case 'mage':
      return (
        <g>
          <path d={`M${cx - 12} 80 L${cx - 8} 92 L${cx} 86 L${cx + 8} 92 L${cx + 12} 80`} fill="#1d1d3d" stroke={c} strokeWidth="1" />
          <path d={`M${cx} 98 l3 4 l-3 4 l-3 -4z`} fill={c} />
          <path d={`M${cx} 106 V120`} stroke={c} strokeOpacity=".5" strokeWidth="1" />
        </g>
      );
    case 'tank':
      return (
        <g fill="#232846" stroke={c} strokeWidth="1.2">
          <path d={`M${cx - sh - 6} 100 Q${cx - sh - 6} 84 ${cx - 12} 84 L${cx - 10} 96 Q${cx - sh} 94 ${cx - sh - 6} 100Z`} />
          <path d={`M${cx + sh + 6} 100 Q${cx + sh + 6} 84 ${cx + 12} 84 L${cx + 10} 96 Q${cx + sh} 94 ${cx + sh + 6} 100Z`} />
          <rect x={cx - 9} y="94" width="18" height="16" rx="3" />
        </g>
      );
    case 'healer':
      return (
        <g>
          <path d={`M${cx - 12} 82 Q${cx} 96 ${cx + 12} 82`} fill="#e9ecff" opacity=".85" />
          <path d={`M${cx} 100 v8 M${cx - 4} 104 h8`} stroke={c} strokeWidth="1.8" />
        </g>
      );
    case 'awakened':
      return (
        <g fill="none" stroke={c} strokeWidth="1.1" opacity=".9">
          <path d={`M${cx - 10} 82 L${cx - 4} 120 M${cx + 10} 82 L${cx + 4} 120`} />
          <path d={`M${cx - 22} 104 L${cx - 14} 98 L${cx - 16} 110 M${cx + 22} 104 L${cx + 14} 98 L${cx + 16} 110`} />
        </g>
      );
    default:
      return null;
  }
}

function MonsterFigure({ cls, c, h, uid }: { cls: UnitClass; c: string; h: number; uid: string }) {
  const headX = 50 + ((h % 7) - 3) * 0.6;
  const headY = 40 + ((h >> 3) % 5) - 2;
  const headR = cls === 'boss' ? 13 : 14;
  const shoulder = cls === 'boss' ? 36 : 30;
  const bodyPath = `M${50 - shoulder} 120 Q${50 - shoulder} ${headY + 26} ${50 - 10} ${headY + 18} L${50 + 10} ${headY + 18} Q${50 + shoulder} ${headY + 26} ${50 + shoulder} 120 Z`;
  return (
    <g>
      <path d={bodyPath} fill={`url(#${uid}s)`} stroke={c} strokeOpacity=".55" strokeWidth="1.2" />
      <circle cx={headX} cy={headY} r={headR} fill="#0d1022" stroke={c} strokeOpacity=".7" strokeWidth="1.2" />
      <g fill={c}>
        <path d={`M${headX - 8} ${headY - 1} l5 2 l-5 1.5z`} />
        <path d={`M${headX + 8} ${headY - 1} l-5 2 l5 1.5z`} />
      </g>
      <path d={`M${headX - 5} ${headY + 7} l2 2 l2 -2 l2 2 l2 -2`} stroke={c} strokeWidth=".9" fill="none" />
      <path d={`M50 ${headY + 34} l5 6 l-5 6 l-5 -6z`} fill={c} opacity=".85" />
    </g>
  );
}

function PortraitImpl({ id, cls, element, rarity = 'R', size = 96, frame = true, dim = false, className, figure }: Props) {
  const avatar = useGame((g) => g.save.settings.avatar);
  const h = hash(id);
  const c = ELEMENT_COLOR[element];
  const frameColor = rarity === 'boss' ? '#ff4d6a' : rarity === 'player' ? '#46f0c8' : RARITY_COLOR[rarity];
  const uid = `p${h.toString(36)}${rarity}`;
  const monster = cls === 'boss' || cls === 'beast';
  const fig: Figure = figure ?? (id === 'player' ? avatar : HUNTER_MAP[id]?.figure ?? 'm');
  const mythic = rarity === 'MR';
  return (
    <svg
      className={className}
      width={size}
      height={Math.round(size * 1.2)}
      viewBox="0 0 100 120"
      role="img"
      aria-hidden="true"
      style={{ opacity: dim ? 0.35 : 1, filter: dim ? 'grayscale(1)' : undefined }}
    >
      <defs>
        <radialGradient id={`${uid}a`} cx="50%" cy="45%" r="60%">
          <stop offset="0" stopColor={c} stopOpacity=".75" />
          <stop offset=".45" stopColor={c} stopOpacity=".22" />
          <stop offset="1" stopColor={c} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={mythic ? '#2a1640' : '#151a36'} />
          <stop offset="1" stopColor="#070810" />
        </linearGradient>
        <linearGradient id={`${uid}s`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1b2040" />
          <stop offset="1" stopColor="#05060c" />
        </linearGradient>
        <linearGradient id={`${uid}o`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#262c52" />
          <stop offset="1" stopColor="#0b0d1c" />
        </linearGradient>
        <linearGradient id={`${uid}r`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff5c8a" />
          <stop offset=".25" stopColor="#ffc23d" />
          <stop offset=".5" stopColor="#5cf08a" />
          <stop offset=".75" stopColor="#46c8f0" />
          <stop offset="1" stopColor="#c46bff" />
          <animateTransform attributeName="gradientTransform" type="rotate" from="0 .5 .5" to="360 .5 .5" dur="4s" repeatCount="indefinite" />
        </linearGradient>
        <clipPath id={`${uid}c`}>
          <rect x="2" y="2" width="96" height="116" rx="8" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${uid}c)`}>
        <rect width="100" height="120" fill={`url(#${uid}b)`} />
        <g opacity=".08" stroke={c}>
          {[...Array(12)].map((_, i) => (
            <line key={i} x1="0" x2="100" y1={i * 10 + 4} y2={i * 10 + 4} />
          ))}
        </g>
        <ellipse cx="50" cy="62" rx="52" ry="58" fill={`url(#${uid}a)`} />
        <Aura element={element} c={c} h={h} />
        <Prop cls={cls} c={c} />
        {monster ? (
          <MonsterFigure cls={cls} c={c} h={h} uid={uid} />
        ) : (
          <g transform="translate(50 62) scale(1.22) translate(-50 -58)">
            <AnimeFigure cls={cls} c={c} h={h} figure={fig} uid={uid} />
          </g>
        )}
        {mythic ? (
          <g fill="#fff">
            {[[14, 20], [86, 30], [20, 98], [82, 90]].map(([x, y], i) => (
              <path key={i} d={`M${x} ${y - 4} L${x + 1} ${y - 1} L${x + 4} ${y} L${x + 1} ${y + 1} L${x} ${y + 4} L${x - 1} ${y + 1} L${x - 4} ${y} L${x - 1} ${y - 1}Z`} opacity=".85">
                <animate attributeName="opacity" values=".2;1;.2" dur={`${1.6 + i * 0.4}s`} repeatCount="indefinite" />
              </path>
            ))}
          </g>
        ) : null}
      </g>
      {frame ? (
        <g fill="none">
          <rect x="2" y="2" width="96" height="116" rx="8" stroke={mythic ? `url(#${uid}r)` : frameColor} strokeWidth={mythic ? 3 : 2.2} />
          <rect x="5" y="5" width="90" height="110" rx="6" stroke={mythic ? `url(#${uid}r)` : frameColor} strokeOpacity=".35" strokeWidth="1" />
          {rarity === 'SSR' || rarity === 'MR' || rarity === 'boss' ? (
            <g fill={mythic ? `url(#${uid}r)` : frameColor}>
              <path d="M2 18 L2 2 L18 2 L14 6 L6 6 L6 14Z" />
              <path d="M98 18 L98 2 L82 2 L86 6 L94 6 L94 14Z" />
              <path d="M2 102 L2 118 L18 118 L14 114 L6 114 L6 106Z" />
              <path d="M98 102 L98 118 L82 118 L86 114 L94 114 L94 106Z" />
            </g>
          ) : null}
        </g>
      ) : null}
    </svg>
  );
}

export const Portrait = memo(PortraitImpl);
