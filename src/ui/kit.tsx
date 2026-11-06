import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { STAMINA } from '../config/balance';
import { currentStamina, msToNextStamina } from '../engine/stamina';
import { back } from '../store/router';
import { useGame } from '../store/gameStore';
import { useUi } from '../store/uiStore';
import type { Element, Rarity } from '../types';
import { sfx } from '../audio/sfx';
import { haptic } from '../fx/haptics';
import { ELEMENT_COLOR, ELEMENT_LABEL, MYTHIC_GRADIENT, RARITY_COLOR, RARITY_LABEL, fmt } from './meta';
import s from './ui.module.css';

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'gold' | 'ghost' | 'danger';
  block?: boolean;
  small?: boolean;
};
export function Button({ variant = 'ghost', block, small, className = '', onClick, ...rest }: BtnProps) {
  return (
    <button
      type="button"
      className={`${s.btn} ${s[variant]} ${block ? s.block : ''} ${small ? s.small : ''} ${className}`}
      onClick={(e) => {
        sfx('tap');
        haptic('tap');
        onClick?.(e);
      }}
      {...rest}
    />
  );
}

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`${s.panel} ${className}`}>{children}</div>;
}

export function SystemPanel({ title = 'SYSTEM', children, className = '' }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <div className={`${s.system} ${className}`} role="region" aria-label={title}>
      <div className={s.systemHead}>{title}</div>
      {children}
    </div>
  );
}

export function Stars({ count, max = 5, size }: { count: number; max?: number; size?: number }) {
  return (
    <span className={s.stars} style={size ? { fontSize: size } : undefined} aria-label={`${count} of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < count ? s.star : s.starOff}>
          ★
        </span>
      ))}
    </span>
  );
}

export function ElementTag({ element }: { element: Element }) {
  return (
    <span className={s.tag} style={{ color: ELEMENT_COLOR[element] }}>
      <span className={s.dot} />
      {ELEMENT_LABEL[element]}
    </span>
  );
}

export function RarityTag({ rarity }: { rarity: Rarity }) {
  return (
    <span
      className={s.tag}
      style={rarity === 'MR' ? { color: '#fff', borderColor: 'transparent', background: MYTHIC_GRADIENT } : { color: RARITY_COLOR[rarity] }}
    >
      {RARITY_LABEL[rarity]}
    </span>
  );
}

export const CrystalIcon = () => (
  <svg className={s.chipIcon} viewBox="0 0 16 16"><path d="M8 1 L14 6 L8 15 L2 6Z" fill="#7fd7ff" /><path d="M8 1 L10 6 L8 15 L6 6Z" fill="#c9f1ff" /></svg>
);
export const GoldIcon = () => (
  <svg className={s.chipIcon} viewBox="0 0 16 16"><circle cx="8" cy="8" r="6.5" fill="#ffc23d" /><circle cx="8" cy="8" r="4" fill="none" stroke="#a86b00" strokeWidth="1.2" /></svg>
);
export const EssenceIcon = () => (
  <svg className={s.chipIcon} viewBox="0 0 16 16"><path d="M8 1 C12 6 13 9 13 10.5 A5 5 0 0 1 3 10.5 C3 9 4 6 8 1Z" fill="#c58bff" /></svg>
);
export const StaminaIcon = () => (
  <svg className={s.chipIcon} viewBox="0 0 16 16"><path d="M9 1 L3 9 H8 L7 15 L13 7 H8Z" fill="#5cf08a" /></svg>
);

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function StaminaChip() {
  const st = useGame((g) => g.save.stamina);
  const now = useNow(1000);
  const cur = currentStamina(st, now);
  const ms = msToNextStamina(st, now);
  const mm = Math.floor(ms / 60000);
  const ss = Math.floor((ms % 60000) / 1000);
  return (
    <span className={s.chip} title={cur.value < STAMINA.max ? `+1 in ${mm}:${String(ss).padStart(2, '0')}` : 'Full'}>
      <StaminaIcon />
      {cur.value}/{STAMINA.max}
    </span>
  );
}

export function CurrencyBar({ stamina = true, gold = true }: { stamina?: boolean; gold?: boolean }) {
  const c = useGame((g) => g.save.currency);
  return (
    <div className={s.topbar}>
      {stamina ? <StaminaChip /> : null}
      {gold ? (
        <span className={s.chip}>
          <GoldIcon />
          {fmt(c.gold)}
        </span>
      ) : null}
      <span className={s.chip} data-testid="crystals">
        <CrystalIcon />
        {fmt(c.crystals)}
      </span>
    </div>
  );
}

export function ScreenHead({ title, backable = true, right }: { title: string; backable?: boolean; right?: ReactNode }) {
  return (
    <header className={s.screenHead}>
      {backable ? (
        <button type="button" className={s.iconBtn} onClick={back} aria-label="Back">
          <svg width="20" height="20" viewBox="0 0 20 20"><path d="M12.5 4 L6.5 10 L12.5 16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>
        </button>
      ) : null}
      <h1 className={s.screenTitle}>{title}</h1>
      {right}
    </header>
  );
}

export function Modal({ open, onClose, children, label }: { open: boolean; onClose: () => void; children: ReactNode; label: string }) {
  if (!open) return null;
  return (
    <div className={s.modalBack} onClick={onClose} role="dialog" aria-modal="true" aria-label={label}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export function Toasts() {
  const toasts = useUi((u) => u.toasts);
  return (
    <div className={s.toasts} aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={s.toast} data-tone={t.tone}>
          {t.text}
        </div>
      ))}
    </div>
  );
}

export function Bar({ value, color }: { value: number; color?: string }) {
  return (
    <div className={s.bar}>
      <div className={s.barFill} style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, background: color }} />
    </div>
  );
}

export function Segmented<T extends string>({ options, value, onChange, label }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div className={s.seg} role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" className={s.segBtn} aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const IconBtnClass = s.iconBtn;
