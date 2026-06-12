import { MapMakerState } from '@axe/features/map-maker/editor/map-maker-state';
import { CellLayer, StampLayer } from '@axe/features/map-maker/model/scene';

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

  it('snap はスナップ有効時にセル半分単位へ丸める', () => {
    state.snapEnabled.set(true);
    expect(state.snap(40)).toBe(32);
    expect(state.snap(50)).toBe(64);
    state.snapEnabled.set(false);
    expect(state.snap(40.4)).toBe(40);
  });
});
