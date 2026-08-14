import { ImageItem } from '@axe/features/map-editor/model/scene';

/**
 * いま行っている手つき。
 *
 * 道具の名前とは 1 対 1 にならない。線は種類によって「引いて離す」にも
 * 「点を置いていく」にもなり、消しゴムは相手がマスか図形かで振る舞いが変わる。
 */
export type GestureKind =
  'none' | 'select' | 'paint' | 'vectorErase' | 'fill' | 'box' | 'path' | 'stamp' | 'image' | 'freehand' | 'text';

/**
 * 押してから離すまでの 1 手。
 *
 * 引きかけの線、掴んでいる画像の角、塗った最後のマス——どれも手を離せば消える
 * 値で、地図そのものには残らない。道具ごとに使う組が違うので、使っていない項目は
 * 空のままになる。
 */
export class MapEditorGesture {
  /** 押した時点で決めた手つき。離すまでは道具を切り替えても変わらない。 */
  kind: GestureKind = 'none';
  /** 押している最中か。置いた瞬間に完結する道具（はんこ等）では立てない。 */
  dragging = false;
  /** 直前に指が居た場所（地図の座標）。次の一手との差分を取るのに使う。 */
  lastMove: { x: number; y: number } | null = null;
  lastPointerScene: { x: number; y: number } | null = null;

  /** 引きかけの形。始点と、いま指が居るところ。 */
  draftStart: { x: number; y: number } | null = null;
  draftCurrent: { x: number; y: number } | null = null;
  /** 折れ線・多角形で置いてきた点。x, y の順に並べる。 */
  draftPoints: number[] = [];
  /** なぞり描きの軌跡。同じく x, y の順。 */
  freehandPoints: number[] = [];

  /** 塗り・消しで、同じマスを二度塗りしないための覚え。 */
  lastPaintedCell: string | null = null;
  lastPaintPx: { x: number; y: number } | null = null;
  /** マスではなく図形を消している最中か。 */
  vectorErasing = false;
  lastErasePx: { x: number; y: number } | null = null;

  /** 画面を掴んで動かしているときの、前回の指の位置（画面の座標）。 */
  panLast: { x: number; y: number } | null = null;

  /** 画像の角を掴んで伸ばしている最中。anchor は掴んだ角の対角。 */
  imageResize: { item: ImageItem; anchorX: number; anchorY: number } | null = null;
  /** 曲線の節を掴んでいる最中。 */
  curveDrag: { index: number } | null = null;

  /** 選んだ物を運んでいる最中の位置と、実際に動かしたかどうか。 */
  lastMoveStored: { x: number; y: number } | null = null;
  selectionMoved = false;
}
