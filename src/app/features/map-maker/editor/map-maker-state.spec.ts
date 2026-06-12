import { GridType } from '@axe/domain/tabletop/game-table';
import { MapMakerState } from '@axe/features/map-maker/editor/map-maker-state';
import {
  CellLayer,
  DEFAULT_SCENE_BACKGROUND,
  DEFAULT_SCENE_GRID_COLOR,
  FreehandLayer,
  ImageItem,
  ImageLayer,
  ShapeLayer,
  StampLayer,
  WallLayer,
} from '@axe/features/map-maker/model/scene';

describe('MapMakerState', () => {
  let state: MapMakerState;

  beforeEach(() => {
    state = new MapMakerState();
  });

  it('ツールの初期値は select でスナップが有効', () => {
    expect(state.tool()).toBe('select');
    expect(state.snapEnabled()).toBe(true);
    expect(state.zoom()).toBe(1);
  });

  it('ensureLayerFor は無ければ作成し、同種があれば再利用する', () => {
    const first = state.ensureLayerFor('cell');
    expect(first.kind).toBe('cell');
    expect(state.current.layers.length).toBe(1);

    const again = state.ensureLayerFor('cell');
    expect(again).toBe(first);
    expect(state.current.layers.length).toBe(1);
  });

  it('ensureLayerFor はロックされたアクティブレイヤーを使わず新規作成する', () => {
    const locked = state.ensureLayerFor('cell');
    locked.locked = true;
    locked.visible = false;
    const created = state.ensureLayerFor('cell');
    expect(created).not.toBe(locked);
    expect(state.current.layers.length).toBe(2);
  });

  it('セル塗りジェスチャは1回の履歴として undo される', () => {
    state.beginGesture();
    state.paintCell(0, 0);
    state.paintCell(1, 0);
    state.paintCell(2, 0);
    state.endGesture();

    const layer = state.current.layers[0] as CellLayer;
    expect(Object.keys(layer.cells).length).toBe(3);
    expect(state.canUndo()).toBe(true);

    state.undo();
    expect(state.current.layers.length).toBe(0);
  });

  it('floodFill は確定され undo できる', () => {
    state.floodFillAt(0, 0);
    const layer = state.current.layers[0] as CellLayer;
    expect(Object.keys(layer.cells).length).toBe(state.current.cols * state.current.rows);
    expect(state.canUndo()).toBe(true);
  });

  it('undo/redo は canUndo/canRedo シグナルを更新し往復する', () => {
    state.beginGesture();
    state.paintCell(0, 0);
    state.endGesture();
    expect(state.canUndo()).toBe(true);
    expect(state.canRedo()).toBe(false);

    state.undo();
    expect(state.canUndo()).toBe(false);
    expect(state.canRedo()).toBe(true);

    state.redo();
    expect(state.canRedo()).toBe(false);
    const layer = state.current.layers[0] as CellLayer;
    expect(Object.keys(layer.cells).length).toBe(1);
  });

  it('newScene は履歴をリセットする', () => {
    state.beginGesture();
    state.paintCell(0, 0);
    state.endGesture();
    expect(state.canUndo()).toBe(true);

    state.newScene(10, 8, 50, '#000000');
    expect(state.canUndo()).toBe(false);
    expect(state.current.cols).toBe(10);
    expect(state.current.rows).toBe(8);
    expect(state.current.cellPx).toBe(50);
    expect(state.current.layers.length).toBe(0);
  });

  it('resize は確定される', () => {
    state.resize(5, 5);
    expect(state.current.cols).toBe(5);
    expect(state.current.rows).toBe(5);
    expect(state.canUndo()).toBe(true);
  });

  it('スタンプの hitTest と deleteSelection が動く', () => {
    state.stampId.set('door-single');
    state.stampSize.set(64);
    state.placeStamp(100, 100);
    const layer = state.current.layers.find((l) => l.kind === 'stamp') as StampLayer;
    expect(layer.items.length).toBe(1);

    const hit = state.hitTest(100, 100);
    expect(hit).not.toBeNull();
    expect(hit!.itemId).toBe(layer.items[0].id);

    expect(state.hitTest(400, 400)).toBeNull();

    state.selection.set(hit);
    state.deleteSelection();
    expect(layer.items.length).toBe(0);
    expect(state.selection()).toBeNull();
  });

  it('新規シーンは視認できる紙色の既定値を持つ', () => {
    expect(state.current.background).toBe(DEFAULT_SCENE_BACKGROUND);
    expect(state.current.gridColor).toBe(DEFAULT_SCENE_GRID_COLOR);
  });

  it('壁セグメントの hitTest / move / delete が動く', () => {
    state.wallThickness.set(8);
    state.addWall([0, 0, 100, 0]);
    const layer = state.current.layers.find((l) => l.kind === 'wall') as WallLayer;
    expect(layer.segments.length).toBe(1);

    const hit = state.hitTest(50, 2);
    expect(hit).not.toBeNull();
    expect(hit!.itemId).toBe(layer.segments[0].id);
    expect(state.hitTest(50, 200)).toBeNull();

    state.selection.set(hit);
    state.moveSelection(10, 20);
    expect(layer.segments[0].points).toEqual([10, 20, 110, 20]);

    state.deleteSelection();
    expect(layer.segments.length).toBe(0);
    expect(state.selection()).toBeNull();
  });

  it('フリーハンドの hitTest / move / delete が動く', () => {
    state.freehandWidth.set(4);
    state.addFreehand([0, 0, 100, 0]);
    const layer = state.current.layers.find((l) => l.kind === 'freehand') as FreehandLayer;
    expect(layer.strokes.length).toBe(1);

    const hit = state.hitTest(50, 1);
    expect(hit).not.toBeNull();
    expect(hit!.itemId).toBe(layer.strokes[0].id);
    expect(state.hitTest(50, 200)).toBeNull();

    state.selection.set(hit);
    state.moveSelection(5, 7);
    expect(layer.strokes[0].points).toEqual([5, 7, 105, 7]);

    state.deleteSelection();
    expect(layer.strokes.length).toBe(0);
    expect(state.selection()).toBeNull();
  });

  it('snap はスナップ有効時にセル半分単位へ丸める', () => {
    state.snapEnabled.set(true);
    expect(state.snap(40)).toBe(32);
    expect(state.snap(50)).toBe(64);
    state.snapEnabled.set(false);
    expect(state.snap(40.4)).toBe(40);
  });

  it('矩形の moveSelection は位置のみ平行移動し w/h を変えない', () => {
    state.addShapeItem('rect', [10, 20, 30, 40], { type: 'solid', color: '#fff' });
    const layer = state.current.layers.find((l) => l.kind === 'shape') as ShapeLayer;
    const item = layer.items[0];
    state.selection.set({ layerId: layer.id, itemId: item.id });
    state.moveSelection(5, 7);
    expect(layer.items[0].points).toEqual([15, 27, 30, 40]);
  });

  it('図形は1つごとに専用レイヤーを作る', () => {
    state.addShapeItem('rect', [0, 0, 10, 10], { type: 'solid', color: '#fff' }, 'rect 1');
    state.addShapeItem('rect', [20, 20, 10, 10], { type: 'solid', color: '#fff' }, 'rect 2');
    const shapeLayers = state.current.layers.filter((l) => l.kind === 'shape');
    expect(shapeLayers.length).toBe(2);
  });

  it('setGridType は確定され setGridType の値を反映する', () => {
    state.setGridType(GridType.HEX_VERTICAL);
    expect(state.current.gridType).toBe(GridType.HEX_VERTICAL);
    expect(state.canUndo()).toBe(true);
  });

  it('snapPoint はヘクスでセル中心へスナップする', () => {
    state.setGridType(GridType.HEX_VERTICAL);
    state.snapEnabled.set(true);
    const p = state.snapPoint(100, 100);
    expect(Number.isFinite(p.x)).toBe(true);
    expect(Number.isFinite(p.y)).toBe(true);
    state.snapEnabled.set(false);
    expect(state.snapPoint(40.4, 50.6)).toEqual({ x: 40, y: 51 });
  });

  it('画像アイテムの hitTest / move / delete が動く', () => {
    const item: ImageItem = { id: '', imageIdentifier: 'img', x: 100, y: 100, w: 80, h: 60, rotation: 0, opacity: 1 };
    state.placeImage(item, '画像 1');
    const layer = state.current.layers.find((l) => l.kind === 'image') as ImageLayer;
    expect(layer.items.length).toBe(1);

    const hit = state.hitTest(100, 100);
    expect(hit).not.toBeNull();
    expect(hit!.itemId).toBe(layer.items[0].id);
    expect(state.hitTest(500, 500)).toBeNull();

    state.selection.set(hit);
    state.moveSelection(10, 20);
    expect(layer.items[0].x).toBe(110);
    expect(layer.items[0].y).toBe(120);
    expect(layer.items[0].w).toBe(80);

    state.deleteSelection();
    expect(layer.items.length).toBe(0);
    expect(state.selection()).toBeNull();
  });
});
