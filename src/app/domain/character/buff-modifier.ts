import { DataElement, DataElementAttribute } from '@axe/domain/data/data-element';

/** Which half of a resource a buff writes to. */
export type BuffModifierSlot = 'now' | 'max';

export type BuffModifierOperator = 'add' | 'set';

export interface BuffModifier {
  /** The status the buff moves, by the name it has on the sheet. */
  target: string;
  slot: BuffModifierSlot;
  operator: BuffModifierOperator;
  /** How far it moved the status, so taking the buff away can move it back. */
  applied: number;
}

const OPERATOR_TOKENS: Record<string, { operator: BuffModifierOperator; sign: number }> = {
  '+': { operator: 'add', sign: 1 },
  '＋': { operator: 'add', sign: 1 },
  加算: { operator: 'add', sign: 1 },
  '-': { operator: 'add', sign: -1 },
  '−': { operator: 'add', sign: -1 },
  '－': { operator: 'add', sign: -1 },
  減算: { operator: 'add', sign: -1 },
  '=': { operator: 'set', sign: 1 },
  '＝': { operator: 'set', sign: 1 },
  固定: { operator: 'set', sign: 1 },
};

const SLOT_SUFFIX = /[\^＾]$/;

export interface ParsedBuffModifierRequest {
  target: string;
  slot: BuffModifierSlot;
  operator: BuffModifierOperator;
  /** What was asked for: an amount to move by, or the value to hold the status at. */
  amount: number;
}

/** Reads the status, the operator and the amount out of a `&!` command. */
export function parseBuffModifierRequest(
  target: string,
  operator: string,
  amount: string
): ParsedBuffModifierRequest | null {
  const name = (target ?? '').trim();
  if (name.length < 1) return null;

  const resolved = OPERATOR_TOKENS[(operator ?? '').trim()];
  if (!resolved) return null;

  const value = Number((amount ?? '').trim().replace(/[−－]/, '-').replace('＋', '+'));
  if (!Number.isFinite(value)) return null;

  return {
    target: name.replace(SLOT_SUFFIX, ''),
    slot: SLOT_SUFFIX.test(name) ? 'max' : 'now',
    operator: resolved.operator,
    amount: resolved.operator === 'add' ? value * resolved.sign : value,
  };
}

/** How the buff reads on the badge and in the chat line that granted it. */
export function describeBuffModifier(request: ParsedBuffModifierRequest): string {
  const slot = request.slot === 'max' ? '最大' : '';
  if (request.operator === 'set') return `${slot}${request.target}=${request.amount}`;
  const sign = request.amount >= 0 ? '+' : '';
  return `${slot}${request.target}${sign}${request.amount}`;
}

export function readBuffModifier(element: DataElement): BuffModifier | null {
  const target = (element.getAttribute(DataElementAttribute.BUFF_MOD_TARGET) ?? '').trim();
  if (target.length < 1) return null;

  const applied = Number(element.getAttribute(DataElementAttribute.BUFF_MOD_APPLIED) ?? '');
  if (!Number.isFinite(applied)) return null;

  return {
    target,
    slot: element.getAttribute(DataElementAttribute.BUFF_MOD_SLOT) === 'max' ? 'max' : 'now',
    operator: element.getAttribute(DataElementAttribute.BUFF_MOD_OPERATOR) === 'set' ? 'set' : 'add',
    applied,
  };
}

export function writeBuffModifier(element: DataElement, modifier: BuffModifier): void {
  element.setAttribute(DataElementAttribute.BUFF_MOD_TARGET, modifier.target);
  element.setAttribute(DataElementAttribute.BUFF_MOD_SLOT, modifier.slot);
  element.setAttribute(DataElementAttribute.BUFF_MOD_OPERATOR, modifier.operator);
  element.setAttribute(DataElementAttribute.BUFF_MOD_APPLIED, String(modifier.applied));
}

export function clearBuffModifier(element: DataElement): void {
  element.removeAttribute(DataElementAttribute.BUFF_MOD_TARGET);
  element.removeAttribute(DataElementAttribute.BUFF_MOD_SLOT);
  element.removeAttribute(DataElementAttribute.BUFF_MOD_OPERATOR);
  element.removeAttribute(DataElementAttribute.BUFF_MOD_APPLIED);
}
