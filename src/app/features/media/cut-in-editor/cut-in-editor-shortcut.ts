export { isTypingTarget } from '@axe/core/input/typing-target';

/**
 * The keys of the cut-in editor.
 *
 * It decides only what to do from the key pressed; the editor does it. Nothing happens
 * while something is being typed — a layer being renamed would lose its letters otherwise.
 */

export type CutInEditorCommand =
  | 'undo'
  | 'redo'
  | 'deleteSelection'
  | 'togglePlaying'
  | 'stepBack'
  | 'stepForward'
  | 'jumpBack'
  | 'jumpForward'
  | 'toStart'
  | 'toEnd'
  | 'copyPose'
  | 'pastePose';

export interface CutInEditorKeyContext {
  /** The focus is in a field. */
  typing: boolean;
  /** The control or command key is held. */
  chord: boolean;
  shift: boolean;
  /** Whether there is a layer to delete. */
  hasSelection: boolean;
}

export interface CutInEditorKeyAction {
  command: CutInEditorCommand;
  /** Whether to stop what the browser would otherwise do, such as scrolling. */
  preventDefault: boolean;
}

export function cutInEditorKeyDown(key: string, context: CutInEditorKeyContext): CutInEditorKeyAction | null {
  if (context.typing) return null;

  const letter = key.toLowerCase();
  if (context.chord && letter === 'z' && !context.shift) return { command: 'undo', preventDefault: true };
  if (context.chord && (letter === 'y' || (context.shift && letter === 'z'))) {
    return { command: 'redo', preventDefault: true };
  }
  // The moment a layer is holding, taken and laid down again.
  if (context.chord && letter === 'c' && context.hasSelection) {
    return { command: 'copyPose', preventDefault: true };
  }
  if (context.chord && letter === 'v' && context.hasSelection) {
    return { command: 'pastePose', preventDefault: true };
  }
  if (context.chord) return null;

  if ((key === 'Delete' || key === 'Backspace') && context.hasSelection) {
    return { command: 'deleteSelection', preventDefault: true };
  }
  if (key === ' ') return { command: 'togglePlaying', preventDefault: true };

  // Along the scene: a step at a time, or from one key to the next where shift is held.
  if (key === 'ArrowLeft') {
    return { command: context.shift ? 'jumpBack' : 'stepBack', preventDefault: true };
  }
  if (key === 'ArrowRight') {
    return { command: context.shift ? 'jumpForward' : 'stepForward', preventDefault: true };
  }
  if (key === 'Home') return { command: 'toStart', preventDefault: true };
  if (key === 'End') return { command: 'toEnd', preventDefault: true };

  return null;
}
