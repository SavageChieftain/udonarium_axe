/**
 * 編集で選べる道具と、その道具ごとの描き方の種類。
 *
 * 画面の状態ではなく**語彙**なので、model 側に置く。render も model もここだけを見れば済む。
 */

export type EditorTool =
  | 'settings'
  | 'select'
  | 'cellPaint'
  | 'cellErase'
  | 'fill'
  | 'shape'
  | 'line'
  | 'polygon'
  | 'freehand'
  | 'text'
  | 'stamp'
  | 'image';

export type LineKind = 'straight' | 'polyline' | 'curve' | 'closedCurve';

export type ShapeGeneratorKind = 'rect' | 'ellipse' | 'triangle' | 'pentagon' | 'hexagon' | 'star5' | 'star6';
