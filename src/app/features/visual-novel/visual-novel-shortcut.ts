export { isTypingTarget } from '@axe/core/input/typing-target';

/**
 * ノベルモードのキー割り当て。
 *
 * 押されたキーから「何をするか」だけを決める。実際に動かすのは画面側。
 * 文字を打っている最中は何も起きない — 名前を入力しながら送りが進むと、書けない。
 */

export type VisualNovelCommand =
  | 'advance'
  | 'back'
  | 'toStart'
  | 'toLatest'
  | 'startSkip'
  | 'stopSkip'
  | 'toggleBacklog'
  | 'toggleAutoPlay'
  | 'toggleSlotGuide'
  | 'toggleShortcutHelp'
  | 'closePopovers'
  | 'exit';

export interface VisualNovelKeyContext {
  /** 変換中。確定のための Enter を送りに使わない。 */
  composing: boolean;
  /** 入力欄に居る。 */
  typing: boolean;
  /** 何かが開いている。Escape の行き先が変わる。 */
  popoverOpen: boolean;
  /** Ctrl / Cmd / Alt が押されている。ブラウザや OS の組み合わせを横取りしない。 */
  chord: boolean;
}

export interface VisualNovelKeyAction {
  command: VisualNovelCommand;
  /** 画面の既定の動き（送り・選択）を止めるか。 */
  preventDefault: boolean;
}

const ADVANCE_KEYS = new Set(['Enter', ' ', 'ArrowRight', 'ArrowDown']);
const BACK_KEYS = new Set(['ArrowLeft', 'ArrowUp']);

export function visualNovelKeyDown(key: string, context: VisualNovelKeyContext): VisualNovelKeyAction | null {
  if (context.composing || context.typing) return null;
  // Ctrl+A は「全部選ぶ」であって自動再生ではない。修飾キーとの組み合わせには手を出さない。
  // ただし Ctrl 単独は早送りなので通す。
  if (context.chord && key !== 'Control') return null;

  if (ADVANCE_KEYS.has(key)) return { command: 'advance', preventDefault: true };
  if (BACK_KEYS.has(key)) return { command: 'back', preventDefault: true };
  if (key === 'Home') return { command: 'toStart', preventDefault: true };
  if (key === 'End') return { command: 'toLatest', preventDefault: true };
  // 押しっぱなしで早送り。離すまで続くので、ここでは既定の動きを止めない。
  if (key === 'Control') return { command: 'startSkip', preventDefault: false };
  if (key === '?') return { command: 'toggleShortcutHelp', preventDefault: true };
  if (key === 'l' || key === 'L') return { command: 'toggleBacklog', preventDefault: true };
  if (key === 'a' || key === 'A') return { command: 'toggleAutoPlay', preventDefault: true };
  if (key === 's' || key === 'S') return { command: 'toggleSlotGuide', preventDefault: true };
  // 開いているものがあれば、まずそれを閉じる。1 回で卓へ戻さない。
  if (key === 'Escape') return { command: context.popoverOpen ? 'closePopovers' : 'exit', preventDefault: false };
  return null;
}

export function visualNovelKeyUp(key: string): VisualNovelKeyAction | null {
  return key === 'Control' ? { command: 'stopSkip', preventDefault: false } : null;
}
