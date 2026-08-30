export { isTypingTarget } from '@axe/core/input/typing-target';

export type HotbarCommand = 'fireSlot' | 'gotoPage' | 'turnPage';

export interface HotbarKeyContext {
  typing: boolean;
  composing: boolean;
  /** Ctrl, meta or alt is down, so the key belongs to the browser or another shortcut. */
  chord: boolean;
  shift: boolean;
  slotCount: number;
  pageCount: number;
}

export interface HotbarKeyAction {
  command: HotbarCommand;
  /** The slot or page asked for, or which way to turn when the command is to turn one. */
  index: number;
  preventDefault: boolean;
}

const DIGIT_CODES: readonly string[] = [
  'Digit1',
  'Digit2',
  'Digit3',
  'Digit4',
  'Digit5',
  'Digit6',
  'Digit7',
  'Digit8',
  'Digit9',
  'Digit0',
];

const NUMPAD_CODES: readonly string[] = [
  'Numpad1',
  'Numpad2',
  'Numpad3',
  'Numpad4',
  'Numpad5',
  'Numpad6',
  'Numpad7',
  'Numpad8',
  'Numpad9',
  'Numpad0',
];

/**
 * Which slot, or which page, a key press is asking for.
 *
 * A digit is read by where it sits on the board rather than what it prints, so a Japanese
 * layout and a shifted digit both reach the slot the reader is looking at. The brackets are
 * read the other way round, by what they print: they sit in different places on a Japanese
 * board than on an American one, and it is the keycap the reader is looking for.
 */
export function hotbarKeyDown(code: string, context: HotbarKeyContext, key = ''): HotbarKeyAction | null {
  if (context.typing || context.composing || context.chord) return null;

  const bracket = turnsPage(code, key);
  if (bracket !== null) return { command: 'turnPage', index: bracket, preventDefault: true };

  const index = digitIndexOf(code);
  if (index === null) return null;

  if (context.shift) {
    return index < context.pageCount ? { command: 'gotoPage', index, preventDefault: true } : null;
  }
  return index < context.slotCount ? { command: 'fireSlot', index, preventDefault: true } : null;
}

/** Which way the brackets turn a page, by the keycap first and by the place as a fallback. */
function turnsPage(code: string, key: string): number | null {
  if (key === '[' || key === '「') return -1;
  if (key === ']' || key === '」') return 1;
  if (key.length > 0) return null;

  if (code === 'BracketLeft') return -1;
  if (code === 'BracketRight') return 1;
  return null;
}

function digitIndexOf(code: string): number | null {
  const digit = DIGIT_CODES.indexOf(code);
  if (digit >= 0) return digit;
  const numpad = NUMPAD_CODES.indexOf(code);
  return numpad >= 0 ? numpad : null;
}

/**
 * Whether a press with these keys down means to empty the slot.
 *
 * Holding ctrl and pressing empties one, as it does in the bar this was learned from. On an
 * Apple keyboard that same press is how a reader opens a menu, so there it is command that
 * empties and ctrl is left to the menu.
 */
export function pressEmptiesSlot(keys: { ctrlKey: boolean; metaKey: boolean }, onApple: boolean): boolean {
  return onApple ? keys.metaKey : keys.ctrlKey || keys.metaKey;
}

/** Whether the reader is at an Apple keyboard, where ctrl and a press opens a menu. */
export function isApplePlatform(): boolean {
  const platform = navigator.platform || '';
  const agent = navigator.userAgent || '';
  return /Mac|iPhone|iPad|iPod/.test(platform) || /Mac OS X|iPhone|iPad/.test(agent);
}
