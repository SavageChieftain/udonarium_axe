import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { TabletopService } from '@axe/application/tabletop/tabletop.service';
import { PanelService } from '@axe/application/ui/panel.service';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { ObjectStore } from '@axe/core/sync/object-store';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { PeerRole } from '@axe/domain/peer/peer-role';
import { GridType } from '@axe/domain/tabletop/game-table';
import { MapMakerPanelComponent } from '@axe/features/map-maker/editor/map-maker-panel.component';
import { pointToCell } from '@axe/features/map-maker/model/grid-cells';
import { cellKey, ImageLayer, ShapeLayer } from '@axe/features/map-maker/model/scene';
import { exportSceneToBlob } from '@axe/features/map-maker/render/export-image';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('MapMakerPanelComponent', () => {
  let fixture: ComponentFixture<MapMakerPanelComponent>;
  let component: MapMakerPanelComponent;
  let imageStorage: { addAsync: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn> };
  let table: { imageIdentifier: string; width: number; height: number; gridSize: number; gridType: GridType };

  beforeEach(async () => {
    imageStorage = { addAsync: vi.fn(), get: vi.fn() };
    table = { imageIdentifier: '', width: 0, height: 0, gridSize: 0, gridType: GridType.SQUARE };
    await TestBed.configureTestingModule({
      imports: [MapMakerPanelComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
    TestBed.overrideProvider(PanelService, { useValue: { title: '' } });
    TestBed.overrideProvider(ImageStorage, { useValue: imageStorage });
    TestBed.overrideProvider(TabletopService, { useValue: { currentTable: table } });
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
});
