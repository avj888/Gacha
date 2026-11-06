import { memo } from 'react';
import type { Element, Rarity, UnitClass } from '../types';
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

function PortraitImpl({ id, cls, element, rarity = 'R', size = 96, frame = true, dim = false, className }: Props) {
  const h = hash(id);
  const c = ELEMENT_COLOR[element];
  const frameColor = rarity === 'boss' ? '#ff4d6a' : rarity === 'player' ? '#46f0c8' : RARITY_COLOR[rarity];
  const uid = `p${h.toString(36)}`;
  const headX = 50 + ((h % 7) - 3) * 0.6;
  const headY = 40 + ((h >> 3) % 5) - 2;
  const headR = cls === 'tank' || cls === 'boss' ? 13 : cls === 'beast' ? 14 : 11.5;
  const shoulder = cls === 'tank' || cls === 'boss' ? 36 : cls === 'assassin' ? 26 : 30;
  const hood = cls === 'assassin' || ((h >> 5) % 4 === 0 && cls === 'mage');
  const hairSpikes = (h >> 7) % 3;
  const eyeY = headY + 1;
  const eyeGap = 4.2;
  const bodyPath = `M${50 - shoulder} 120 Q${50 - shoulder} ${headY + 26} ${50 - 10} ${headY + 18} L${50 + 10} ${headY + 18} Q${50 + shoulder} ${headY + 26} ${50 + shoulder} 120 Z`;
  const w = size;
  const ht = Math.round(size * 1.2);
  return (
    <svg
      className={className}
      width={w}
      height={ht}
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
          <stop offset="0" stopColor="#151a36" />
          <stop offset="1" stopColor="#070810" />
        </linearGradient>
        <linearGradient id={`${uid}s`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1b2040" />
          <stop offset="1" stopColor="#05060c" />
        </linearGradient>
        <clipPath id={`${uid}c`}>
          <rect x="2" y="2" width="96" height="116" rx="8" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${uid}c)`}>
        <rect width="100" height="120" fill={`url(#${uid}b)`} />
        {/* scan lines */}
        <g opacity=".08" stroke={c}>
          {[...Array(12)].map((_, i) => (
            <line key={i} x1="0" x2="100" y1={i * 10 + 4} y2={i * 10 + 4} />
          ))}
        </g>
        <ellipse cx="50" cy="62" rx="52" ry="58" fill={`url(#${uid}a)`} />
        <Aura element={element} c={c} h={h} />
        <Prop cls={cls} c={c} />
        {/* body */}
        <path d={bodyPath} fill={`url(#${uid}s)`} stroke={c} strokeOpacity=".55" strokeWidth="1.2" />
        {/* neck */}
        <rect x={headX - 4.5} y={headY + 8} width="9" height="12" fill="#0c0e1d" />
        {/* hood or hair */}
        {hood ? (
          <path d={`M${headX - 17} ${headY + 16} Q${headX - 18} ${headY - 22} ${headX} ${headY - 18} Q${headX + 18} ${headY - 22} ${headX + 17} ${headY + 16} Z`} fill="#0a0c18" stroke={c} strokeOpacity=".6" strokeWidth="1" />
        ) : null}
        <circle cx={headX} cy={headY} r={headR} fill="#0d1022" stroke={c} strokeOpacity=".7" strokeWidth="1.2" />
        {!hood && hairSpikes > 0 ? (
          <path
            d={
              hairSpikes === 1
                ? `M${headX - headR} ${headY - 2} Q${headX - 6} ${headY - headR - 10} ${headX + headR + 2} ${headY - 4} Q${headX} ${headY - headR + 2} ${headX - headR} ${headY - 2}Z`
                : `M${headX - headR} ${headY} L${headX - 8} ${headY - headR - 7} L${headX - 2} ${headY - headR + 1} L${headX + 4} ${headY - headR - 8} L${headX + 8} ${headY - headR + 1} L${headX + headR + 2} ${headY - headR - 3} L${headX + headR} ${headY} Z`
            }
            fill="#090b16"
            stroke={c}
            strokeOpacity=".5"
            strokeWidth=".8"
          />
        ) : null}
        {/* eyes */}
        <g fill={c}>
          <rect x={headX - eyeGap - 2.6} y={eyeY - 0.9} width="4" height="1.8" rx=".9" />
          <rect x={headX + eyeGap - 1.4} y={eyeY - 0.9} width="4" height="1.8" rx=".9" />
        </g>
        {/* chest sigil */}
        <path d={`M50 ${headY + 34} l5 6 l-5 6 l-5 -6z`} fill={c} opacity=".85" />
      </g>
      {frame ? (
        <g fill="none">
          <rect x="2" y="2" width="96" height="116" rx="8" stroke={frameColor} strokeWidth="2.2" />
          <rect x="5" y="5" width="90" height="110" rx="6" stroke={frameColor} strokeOpacity=".3" strokeWidth="1" />
          {rarity === 'SSR' || rarity === 'boss' ? (
            <g fill={frameColor}>
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
