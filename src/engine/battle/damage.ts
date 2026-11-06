import { BATTLE, ELEMENT_ADVANTAGE, ELEMENT_MOD } from '../../config/balance';
import type { Element } from '../../types';
import { range, type Rng } from '../rng';

export function elementMod(att: Element, def: Element): { mod: number; adv: boolean } {
  if (ELEMENT_ADVANTAGE[att].includes(def)) return { mod: ELEMENT_MOD.advantage, adv: true };
  if (ELEMENT_ADVANTAGE[def].includes(att)) return { mod: ELEMENT_MOD.disadvantage, adv: false };
  return { mod: ELEMENT_MOD.neutral, adv: false };
}

export interface DamageInput {
  atk: number;
  mult: number;
  def: number;
  attElement: Element;
  defElement: Element;
  critRate: number;
  critDmg: number;
  ignoreDef?: number;
}

/**
 * Damage = ATK * multiplier * (100 / (100 + DEF)) * element mod * crit mod * random(0.95–1.05)
 */
export function computeDamage(i: DamageInput, rng: Rng) {
  const def = Math.max(0, i.def * (1 - (i.ignoreDef ?? 0)));
  const defMod = BATTLE.defConstant / (BATTLE.defConstant + def);
  const el = elementMod(i.attElement, i.defElement);
  const crit = rng.next() < Math.max(0, Math.min(1, i.critRate));
  const critMod = crit ? 1 + i.critDmg : 1;
  const rand = range(rng, BATTLE.randMin, BATTLE.randMax);
  const amount = Math.max(1, Math.round(i.atk * i.mult * defMod * el.mod * critMod * rand));
  return { amount, crit, adv: el.adv };
}
