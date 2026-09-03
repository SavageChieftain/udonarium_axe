import { BoardTool } from '@axe/features/tabletop/white-board/white-board-scene';

export type BoardCommand =
  | 'panStart'
  | 'undo'
  | 'redo'
  | 'finishPath'
  | 'dropPath'
  | 'deleteSelection'
  | 'zoomReset'
  | 'zoomIn'
  | 'zoomOut'
  | 'zoomFit'
  | 'selectAll'
  | 'duplicate'
  | 'copy'
  | 'paste'
  | 'bringForward'
  | 'sendBackward';

export type BoardKeyAction = { command: BoardCommand } | { command: 'pickTool'; tool: BoardTool };

export interface BoardKeyContext {
  chord: boolean;
  shift: boolean;
  laying: boolean;
}

export const TOOL_KEYS: Readonly<Record<string, BoardTool>> = {
  v: 'select',
  p: 'pen',
  m: 'marker',
  e: 'eraser',
  l: 'line',
  a: 'arrow',
  r: 'shape',
  t: 'text',
  n: 'note',
  i: 'sticker',
};

const CHORDS: Readonly<Record<string, BoardCommand>> = {
  '0': 'zoomReset',
  '=': 'zoomIn',
  '+': 'zoomIn',
  '-': 'zoomOut',
  '9': 'zoomFit',
  a: 'selectAll',
  d: 'duplicate',
  c: 'copy',
  v: 'paste',
  ']': 'bringForward',
  '[': 'sendBackward',
};

export function boardKeyDown(key: string, context: BoardKeyContext): BoardKeyAction | null {
  if (key === ' ') return { command: 'panStart' };
  const letter = key.toLowerCase();
  if (context.chord && letter === 'z') return { command: context.shift ? 'redo' : 'undo' };
  if (context.chord && letter === 'y') return { command: 'redo' };
  if (context.laying && (key === 'Enter' || key === 'Escape')) {
    return { command: key === 'Enter' ? 'finishPath' : 'dropPath' };
  }
  if (key === 'Delete' || key === 'Backspace') return { command: 'deleteSelection' };
  if (context.chord) {
    const command = CHORDS[letter];
    return command ? { command } : null;
  }
  const tool = TOOL_KEYS[letter];
  return tool ? { command: 'pickTool', tool } : null;
}
