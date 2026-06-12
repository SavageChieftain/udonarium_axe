import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { TabletopService } from '@axe/application/tabletop/tabletop.service';
import { ModalService } from '@axe/application/ui/modal.service';
import { PanelService } from '@axe/application/ui/panel.service';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { ObjectStore } from '@axe/core/sync/object-store';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { PeerRole } from '@axe/domain/peer/peer-role';
import { GridType } from '@axe/domain/tabletop/game-table';
import { MapMakerPanelComponent } from '@axe/features/map-maker/editor/map-maker-panel.component';
import { pointToCell } from '@axe/features/map-maker/model/grid-cells';
import { cellKey, ImageLayer, ShapeLayer } from '@axe/features/map-maker/model/scene';
import { addLayer } from '@axe/features/map-maker/model/scene-ops';
import { exportSceneToBlob } from '@axe/features/map-maker/render/export-image';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('MapMakerPanelComponent', () => {
  let fixture: ComponentFixture<MapMakerPanelComponent>;
  let component: MapMakerPanelComponent;
  let imageStorage: { addAsync: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn> };
  let table: { imageIdentifier: string; width: number; height: number; gridSize: number; gridType: GridType };
  let modalService: {
    option: unknown;
    title: string;
    resolve: ReturnType<typeof vi.fn>;
    open: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    imageStorage = { addAsync: vi.fn(), get: vi.fn() };
    table = { imageIdentifier: '', width: 0, height: 0, gridSize: 0, gridType: GridType.SQUARE };
    modalService = { option: undefined, title: '', resolve: vi.fn(), open: vi.fn().mockResolvedValue(null) };
    await TestBed.configureTestingModule({
      imports: [MapMakerPanelComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
    TestBed.overrideProvider(PanelService, { useValue: { title: '' } });
    TestBed.overrideProvider(ImageStorage, { useValue: imageStorage });
    TestBed.overrideProvider(TabletopService, { useValue: { currentTable: table } });
    TestBed.overrideProvider(ModalService, { useValue: modalService });
    fixture = TestBed.createComponent(MapMakerPanelComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    const store = ObjectStore.instance;
    store.getObjects().forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
    PeerCursor.myCursor = null!;
  });

  it('生成できる', () => {
    expect(component).toBeTruthy();
  });

  it('GM でないときは gmOnly のみ表示する', () => {
    TestBed.inject(ObjectChangeService);
    PeerCursor.createMyCursor();
    PeerCursor.myCursor.role = PeerRole.Player;
    fixture.detectChanges();
    expect((component as unknown as { isGameMaster: () => boolean }).isGameMaster()).toBe(false);
    expect(fixture.nativeElement.querySelector('canvas')).toBeNull();
  });

  it('GM のときキャンバスを表示する', () => {
    TestBed.inject(ObjectChangeService);
    PeerCursor.createMyCursor();
    PeerCursor.myCursor.role = PeerRole.GameMaster;
    fixture.detectChanges();
    expect((component as unknown as { isGameMaster: () => boolean }).isGameMaster()).toBe(true);
    expect(fixture.nativeElement.querySelector('canvas')).not.toBeNull();
  });

  it('setAsTable で書き出し画像をテーブル背景へ設定する', async () => {
    const blob = new Blob([new Uint8Array([1])], { type: 'image/webp' });
    const exportStub = vi.fn().mockResolvedValue(blob);
    (component as unknown as { exportFn: typeof exportSceneToBlob }).exportFn = exportStub;
    imageStorage.addAsync.mockResolvedValue({ identifier: 'img-1' });

    await (component as unknown as { setAsTable: () => Promise<void> }).setAsTable();

    expect(exportStub).toHaveBeenCalledOnce();
    expect(imageStorage.addAsync).toHaveBeenCalledWith(blob);
    expect(table.imageIdentifier).toBe('img-1');
    expect(table.width).toBe(component['state'].current.cols);
    expect(table.height).toBe(component['state'].current.rows);
    expect(table.gridSize).toBe(component['state'].current.cellPx);
  });

  it('saveImage で書き出した画像を保存する', async () => {
    const blob = new Blob([new Uint8Array([1])], { type: 'image/webp' });
    const exportStub = vi.fn().mockResolvedValue(blob);
    (component as unknown as { exportFn: typeof exportSceneToBlob }).exportFn = exportStub;
    imageStorage.addAsync.mockResolvedValue({ identifier: 'img-2' });

    await (component as unknown as { saveImage: () => Promise<void> }).saveImage();

    expect(imageStorage.addAsync).toHaveBeenCalledWith(blob);
  });

  it('既定ツールは select のまま', () => {
    expect(component['state'].tool()).toBe('select');
  });

  it('setAsTable は scene.gridType をテーブルへ書き込む', async () => {
    const blob = new Blob([new Uint8Array([1])], { type: 'image/webp' });
    (component as unknown as { exportFn: typeof exportSceneToBlob }).exportFn = vi.fn().mockResolvedValue(blob);
    imageStorage.addAsync.mockResolvedValue({ identifier: 'img-3' });
    component['state'].setGridType(GridType.HEX_VERTICAL);

    await (component as unknown as { setAsTable: () => Promise<void> }).setAsTable();

    expect(table.gridType).toBe(GridType.HEX_VERTICAL);
  });

  it('五角形ドラッグは 5 頂点へスケールされた polygon を作る', () => {
    component['state'].shapeKind.set('pentagon');
    (component as unknown as { draftStart: { x: number; y: number } }).draftStart = { x: 0, y: 0 };
    (component as unknown as { draftCurrent: { x: number; y: number } }).draftCurrent = { x: 100, y: 80 };
    (component as unknown as { commitShape: (x: number, y: number, w: number, h: number) => void }).commitShape(
      0,
      0,
      100,
      80
    );
    const layer = component['state'].current.layers.find((l) => l.kind === 'shape') as ShapeLayer;
    expect(layer.items[0].shape).toBe('polygon');
    expect(layer.items[0].points.length).toBe(10);
  });

  it('折れ線は3頂点で専用レイヤーへ stroke のみの polyline を作る', () => {
    component['state'].tool.set('line');
    component['state'].lineKind.set('polyline');
    component['state'].strokeDash.set('dashed');
    (component as unknown as { draftPoints: number[] }).draftPoints = [0, 0, 50, 0, 50, 50];
    (component as unknown as { commitDraftPolyline: () => void }).commitDraftPolyline();
    const shapeLayers = component['state'].current.layers.filter((l) => l.kind === 'shape') as ShapeLayer[];
    expect(shapeLayers.length).toBe(1);
    const item = shapeLayers[0].items[0];
    expect(item.shape).toBe('polyline');
    expect(item.fill).toBeNull();
    expect(item.stroke!.dash).toBe('dashed');
    expect(item.points).toEqual([0, 0, 50, 0, 50, 50]);
  });

  it('lineKind を切り替えるとドラフトがキャンセルされる', () => {
    component['state'].tool.set('line');
    component['state'].lineKind.set('polyline');
    (component as unknown as { draftPoints: number[] }).draftPoints = [0, 0, 50, 0];
    (component as unknown as { setLineKind: (k: string) => void }).setLineKind('straight');
    expect((component as unknown as { draftPoints: number[] }).draftPoints.length).toBe(0);
    expect(component['state'].lineKind()).toBe('straight');
  });

  it('画像のコーナードラッグは反対コーナー基準でリサイズし1履歴にまとまる', () => {
    component['state'].placeImage(
      { id: '', imageIdentifier: 'img', x: 100, y: 100, w: 80, h: 60, rotation: 0, opacity: 1 },
      '画像 1'
    );
    const layer = component['state'].current.layers.find((l) => l.kind === 'image') as ImageLayer;
    const id = layer.items[0].id;
    component['state'].selection.set({ layerId: layer.id, itemId: id });

    const c = component as unknown as {
      imageResize: { item: unknown; anchorX: number; anchorY: number } | null;
      resizeImageTo: (x: number, y: number) => void;
    };
    component['state'].beginGesture();
    c.imageResize = { item: layer.items[0], anchorX: 60, anchorY: 70 };
    c.resizeImageTo(200, 170);
    c.resizeImageTo(260, 270);
    component['state'].endGesture();
    c.imageResize = null;

    expect(layer.items[0].w).toBe(200);
    expect(layer.items[0].h).toBe(200);
    expect(layer.items[0].x).toBe(160);
    expect(layer.items[0].y).toBe(170);

    component['state'].undo();
    const after = (component['state'].current.layers.find((l) => l.kind === 'image') as ImageLayer).items[0];
    expect(after.w).toBe(80);
    expect(after.h).toBe(60);
  });

  it('リサイズは min 8px へクランプする', () => {
    component['state'].placeImage(
      { id: '', imageIdentifier: 'img', x: 100, y: 100, w: 80, h: 60, rotation: 0, opacity: 1 },
      '画像 1'
    );
    const layer = component['state'].current.layers.find((l) => l.kind === 'image') as ImageLayer;
    component['state'].selection.set({ layerId: layer.id, itemId: layer.items[0].id });
    const c = component as unknown as {
      imageResize: { item: unknown; anchorX: number; anchorY: number } | null;
      resizeImageTo: (x: number, y: number) => void;
    };
    c.imageResize = { item: layer.items[0], anchorX: 60, anchorY: 70 };
    c.resizeImageTo(62, 71);
    expect(layer.items[0].w).toBe(8);
    expect(layer.items[0].h).toBe(8);
  });

  it('saveImage は常に drawGrid:false で書き出す', async () => {
    const blob = new Blob([new Uint8Array([1])], { type: 'image/webp' });
    const exportStub = vi.fn().mockResolvedValue(blob);
    (component as unknown as { exportFn: typeof exportSceneToBlob }).exportFn = exportStub;
    imageStorage.addAsync.mockResolvedValue({ identifier: 'img-grid' });

    await (component as unknown as { saveImage: () => Promise<void> }).saveImage();

    expect(exportStub).toHaveBeenCalledOnce();
    expect(exportStub.mock.calls[0][2]).toMatchObject({ drawGrid: false });
  });

  it('画像配置フローは専用レイヤーへ画像を置きペンディングを保持する', async () => {
    imageStorage.get.mockReturnValue({ url: 'blob:test' });
    const image = { naturalWidth: 256, naturalHeight: 128, width: 256, height: 128 } as HTMLImageElement;
    (component as unknown as { loadImageFn: (url: string) => Promise<HTMLImageElement> }).loadImageFn = vi
      .fn()
      .mockResolvedValue(image);
    component['state'].pendingImageId.set('img-id');

    await (component as unknown as { placeImageAt: (x: number, y: number) => Promise<void> }).placeImageAt(200, 150);

    const layer = component['state'].current.layers.find((l) => l.kind === 'image') as ImageLayer;
    expect(layer.items.length).toBe(1);
    expect(layer.items[0].imageIdentifier).toBe('img-id');
    expect(layer.items[0].x).toBe(200);
    expect(layer.items[0].y).toBe(150);
    expect(component['state'].pendingImageId()).toBe('img-id');
  });

  it('ヘクスのセル塗りは pointToCell が示すセルを塗る', () => {
    component['state'].setGridType(GridType.HEX_VERTICAL);
    const scene = component['state'].current;
    const cell = pointToCell(scene.gridType, 130, 110, scene.cellPx);
    (component as unknown as { paintSampleAt: (x: number, y: number, tool: string) => void }).paintSampleAt(
      130,
      110,
      'cellPaint'
    );
    const layer = component['state'].current.layers.find((l) => l.kind === 'cell') as {
      cells: Record<string, unknown>;
    };
    expect(Object.keys(layer.cells)).toEqual([cellKey(cell.col, cell.row)]);
  });

  it('deleteLayer: モーダルが true を返すとレイヤーが削除される', async () => {
    modalService.open.mockResolvedValue(true);
    component['state'].applyCommitted(() =>
      addLayer(component['state'].current, {
        id: 'layer-1',
        kind: 'shape',
        name: 'S',
        visible: true,
        locked: false,
        opacity: 1,
        items: [],
      })
    );
    const before = component['state'].current.layers.length;

    (component as unknown as { deleteLayer: (layer: { id: string }) => void }).deleteLayer({ id: 'layer-1' });
    await Promise.resolve();

    expect(component['state'].current.layers.length).toBe(before - 1);
    expect(component['state'].current.layers.find((l) => l.id === 'layer-1')).toBeUndefined();
  });

  it('deleteLayer: モーダルが false を返すとレイヤーが保持される', async () => {
    modalService.open.mockResolvedValue(false);
    component['state'].applyCommitted(() =>
      addLayer(component['state'].current, {
        id: 'layer-2',
        kind: 'shape',
        name: 'S',
        visible: true,
        locked: false,
        opacity: 1,
        items: [],
      })
    );
    const before = component['state'].current.layers.length;

    (component as unknown as { deleteLayer: (layer: { id: string }) => void }).deleteLayer({ id: 'layer-2' });
    await Promise.resolve();

    expect(component['state'].current.layers.length).toBe(before);
  });

  it('deleteLayer: モーダルが null を返すとレイヤーが保持される', async () => {
    modalService.open.mockResolvedValue(null);
    component['state'].applyCommitted(() =>
      addLayer(component['state'].current, {
        id: 'layer-3',
        kind: 'shape',
        name: 'S',
        visible: true,
        locked: false,
        opacity: 1,
        items: [],
      })
    );
    const before = component['state'].current.layers.length;

    (component as unknown as { deleteLayer: (layer: { id: string }) => void }).deleteLayer({ id: 'layer-3' });
    await Promise.resolve();

    expect(component['state'].current.layers.length).toBe(before);
  });

  it('deleteLayer: ロック中のレイヤーは確認モーダルも開かず削除されない', async () => {
    component['state'].applyCommitted(() =>
      addLayer(component['state'].current, {
        id: 'layer-4',
        kind: 'shape',
        name: 'S',
        visible: true,
        locked: true,
        opacity: 1,
        items: [],
      })
    );
    const before = component['state'].current.layers.length;

    (component as unknown as { deleteLayer: (layer: { id: string; locked: boolean }) => void }).deleteLayer({
      id: 'layer-4',
      locked: true,
    });
    await Promise.resolve();

    expect(modalService.open).not.toHaveBeenCalled();
    expect(component['state'].current.layers.length).toBe(before);
  });
});
