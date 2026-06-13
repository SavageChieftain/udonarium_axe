import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { TabletopService } from '@axe/application/tabletop/tabletop.service';
import { ModalService } from '@axe/application/ui/modal.service';
import { PanelService } from '@axe/application/ui/panel.service';
import { ImageFile } from '@axe/core/storage/image-file';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { ObjectStore } from '@axe/core/sync/object-store';
import { ImageTag } from '@axe/domain/media/image-tag';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { PeerRole } from '@axe/domain/peer/peer-role';
import { GridType } from '@axe/domain/tabletop/game-table';
import {
  buildShapeKindPoints,
  MapEditorPanelComponent,
} from '@axe/features/map-editor/editor/map-editor-panel.component';
import { pointToCell } from '@axe/features/map-editor/model/grid-cells';
import {
  cellKey,
  createScene,
  ImageLayer,
  ShapeLayer,
  StampLayer,
  TextLayer,
} from '@axe/features/map-editor/model/scene';
import { addLayer } from '@axe/features/map-editor/model/scene-ops';
import { serializeScene } from '@axe/features/map-editor/model/serialize';
import { exportSceneToBlob } from '@axe/features/map-editor/render/export-image';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('MapEditorPanelComponent', () => {
  let fixture: ComponentFixture<MapEditorPanelComponent>;
  let component: MapEditorPanelComponent;
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
      imports: [MapEditorPanelComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
    TestBed.overrideProvider(PanelService, { useValue: { title: '' } });
    TestBed.overrideProvider(ImageStorage, { useValue: imageStorage });
    TestBed.overrideProvider(TabletopService, { useValue: { currentTable: table } });
    TestBed.overrideProvider(ModalService, { useValue: modalService });
    fixture = TestBed.createComponent(MapEditorPanelComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    const store = ObjectStore.instance;
    store.getObjects().forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
    ImageStorage.instance.images.forEach((image) => ImageStorage.instance.delete(image.identifier));
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

  it('新規シーンの既定背景は transparent', () => {
    expect(component['state'].current.background).toBe('transparent');
  });

  it('透明トグルは背景と直前の色を往復させる', () => {
    const c = component as unknown as {
      toggleBackgroundTransparent: (transparent: boolean) => void;
      backgroundTransparent: () => boolean;
      backgroundColorValue: () => string;
    };
    component['state'].setBackground('#445566');
    expect(c.backgroundTransparent()).toBe(false);

    c.toggleBackgroundTransparent(true);
    expect(component['state'].current.background).toBe('transparent');
    expect(c.backgroundTransparent()).toBe(true);
    expect(c.backgroundColorValue()).toBe('#445566');

    c.toggleBackgroundTransparent(false);
    expect(component['state'].current.background).toBe('#445566');
    expect(c.backgroundTransparent()).toBe(false);
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

  it('線ツールの種類ピッカーは 4 つのボタンを表示する', () => {
    TestBed.inject(ObjectChangeService);
    PeerCursor.createMyCursor();
    PeerCursor.myCursor.role = PeerRole.GameMaster;
    component['state'].tool.set('line');
    fixture.detectChanges();
    const t = (component as unknown as { t: (k: string) => string }).t;
    const expected = ['straight', 'polyline', 'curve', 'closedCurve'].map((k) =>
      t('feature.mapEditor.props.lineKinds.' + k)
    );
    const titles = Array.from(fixture.nativeElement.querySelectorAll('button[title]')).map((b) =>
      (b as HTMLElement).getAttribute('title')
    );
    const kindTitles = titles.filter((title) => expected.includes(title as string));
    expect(kindTitles.length).toBe(4);
  });

  it('curve は頂点クリックと Enter で curve シェイプを作る', () => {
    component['state'].tool.set('line');
    component['state'].lineKind.set('curve');
    (component as unknown as { draftPoints: number[] }).draftPoints = [0, 0, 50, 0, 50, 50];
    (component as unknown as { commitDraftPolyline: () => void }).commitDraftPolyline();
    const shapeLayers = component['state'].current.layers.filter((l) => l.kind === 'shape') as ShapeLayer[];
    const item = shapeLayers[0].items[0];
    expect(item.shape).toBe('curve');
    expect(item.fill).toBeNull();
    expect(item.points).toEqual([0, 0, 50, 0, 50, 50]);
  });

  it('closedCurve は現在の塗りを受け取り 3 頂点で作られる', () => {
    component['state'].tool.set('line');
    component['state'].lineKind.set('closedCurve');
    component['state'].fillMode.set('solid');
    component['state'].solidColor.set('#123456');
    (component as unknown as { draftPoints: number[] }).draftPoints = [0, 0, 50, 0, 50, 50];
    (component as unknown as { commitDraftPolyline: () => void }).commitDraftPolyline();
    const shapeLayers = component['state'].current.layers.filter((l) => l.kind === 'shape') as ShapeLayer[];
    const item = shapeLayers[0].items[0];
    expect(item.shape).toBe('closedCurve');
    expect(item.fill).toEqual({ type: 'solid', color: '#123456' });
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

  it('updateSelectedStamp で色を変更できる', () => {
    component['state'].stampId.set('door-single');
    component['state'].stampColor.set(null);
    component['state'].placeStamp(100, 100);
    const layer = component['state'].current.layers.find((l) => l.kind === 'stamp') as StampLayer;
    const id = layer.items[0].id;
    component['state'].selection.set({ layerId: layer.id, itemId: id });

    component['state'].updateSelectedStamp({ color: '#ff0000' });

    expect(layer.items[0].color).toBe('#ff0000');
  });

  it('updateSelectedStamp で色を null（自動）に戻せる', () => {
    component['state'].stampId.set('door-single');
    component['state'].stampColor.set('#ff0000');
    component['state'].placeStamp(100, 100);
    const layer = component['state'].current.layers.find((l) => l.kind === 'stamp') as StampLayer;
    const id = layer.items[0].id;
    component['state'].selection.set({ layerId: layer.id, itemId: id });

    component['state'].updateSelectedStamp({ color: null });

    expect(layer.items[0].color).toBeNull();
  });

  it('imageTextures は テクスチャ タグの ImageTag を列挙する', () => {
    TestBed.inject(ObjectChangeService);
    ImageStorage.instance.add('tex-1');
    ImageStorage.instance.add('other');
    const tag = ImageTag.create('tex-1');
    tag.tag = 'テクスチャ';
    ImageTag.create('other').tag = 'スタンプ';

    const list = (component as unknown as { imageTextures: () => { identifier: string }[] }).imageTextures();

    expect(list.map((f) => f.identifier)).toEqual(['tex-1']);
  });

  it('selectImageTexture は textureId を image: 接頭辞でセットしテクスチャモードへ', () => {
    const file = ImageFile.create('tex-9');
    (component as unknown as { selectImageTexture: (f: ImageFile) => void }).selectImageTexture(file);
    expect(component['state'].textureId()).toBe('image:tex-9');
    expect(component['state'].fillMode()).toBe('texture');
  });

  it('テクスチャ追加フローは切り抜き Blob を保存し テクスチャ タグの ImageTag を作る', async () => {
    TestBed.inject(ObjectChangeService);
    const blob = new Blob([new Uint8Array([1])], { type: 'image/webp' });
    modalService.open.mockResolvedValue(blob);
    imageStorage.addAsync.mockResolvedValue({ identifier: 'cropped-1' });
    const input = { files: [new File([new Uint8Array([1])], 'x.png', { type: 'image/png' })], value: 'x' };
    const event = { target: input } as unknown as Event;

    await (component as unknown as { onTextureFileSelected: (e: Event) => Promise<void> }).onTextureFileSelected(event);

    expect(imageStorage.addAsync).toHaveBeenCalledWith(blob);
    const created = ImageTag.get('cropped-1');
    expect(created).toBeTruthy();
    expect(created.tag).toBe('テクスチャ');
    expect(component['state'].textureId()).toBe('image:cropped-1');
    expect(component['state'].fillMode()).toBe('texture');
  });

  it('テクスチャ追加でモーダルが null を返すと保存しない', async () => {
    modalService.open.mockResolvedValue(null);
    const input = { files: [new File([new Uint8Array([1])], 'x.png', { type: 'image/png' })], value: 'x' };
    const event = { target: input } as unknown as Event;

    await (component as unknown as { onTextureFileSelected: (e: Event) => Promise<void> }).onTextureFileSelected(event);

    expect(imageStorage.addAsync).not.toHaveBeenCalled();
  });

  it('strokeFillMode texture で線をコミットすると stroke.fill に現在の textureId が入る', () => {
    component['state'].strokeFillMode.set('texture');
    component['state'].textureId.set('image:stroke-tex');
    component['state'].addShapeItem('line', [0, 0, 40, 40], null);
    const layer = component['state'].current.layers.find((l) => l.kind === 'shape') as ShapeLayer;
    expect(layer.items[0].stroke?.fill).toEqual({
      type: 'texture',
      textureId: 'image:stroke-tex',
      scale: component['state'].textureScale(),
      rotation: component['state'].textureRotation(),
    });
  });

  it('strokeFillMode color で線をコミットすると stroke.fill は null', () => {
    component['state'].strokeFillMode.set('color');
    component['state'].addShapeItem('line', [0, 0, 40, 40], null);
    const layer = component['state'].current.layers.find((l) => l.kind === 'shape') as ShapeLayer;
    expect(layer.items[0].stroke?.fill).toBeNull();
  });

  it('文字ツールの pointerdown で editingText が itemId なしで開始する', () => {
    component['state'].tool.set('text');
    const c = component as unknown as {
      onPointerDown: (e: PointerEvent) => void;
      editingText: () => { itemId: string | null } | null;
      board: () => { nativeElement: HTMLCanvasElement } | undefined;
    };
    (c as unknown as { board: () => { nativeElement: HTMLCanvasElement } }).board = () => ({
      nativeElement: { setPointerCapture: () => {}, getBoundingClientRect: () => ({ left: 0, top: 0 }) } as never,
    });
    c.onPointerDown({ button: 0, pointerId: 1, clientX: 64, clientY: 64 } as unknown as PointerEvent);
    expect(c.editingText()).not.toBeNull();
    expect(c.editingText()!.itemId).toBeNull();
  });

  it('commitTextEdit はテキストがあれば TextItem を追加する', () => {
    const c = component as unknown as {
      startTextEdit: (x: number, y: number, l: string | null, i: string | null, t: string) => void;
      commitTextEdit: () => void;
    };
    c.startTextEdit(40, 50, null, null, '');
    component['textDraft'].set('hello');
    c.commitTextEdit();
    const layer = component['state'].current.layers.find((l) => l.kind === 'text') as TextLayer;
    expect(layer.items.length).toBe(1);
    expect(layer.items[0].text).toBe('hello');
    expect(layer.items[0].x).toBe(40);
    expect(layer.items[0].y).toBe(50);
  });

  it('commitTextEdit は複数行の改行を保持して TextItem を追加する', () => {
    const c = component as unknown as {
      startTextEdit: (x: number, y: number, l: string | null, i: string | null, t: string) => void;
      commitTextEdit: () => void;
    };
    c.startTextEdit(0, 0, null, null, '');
    component['textDraft'].set('line1\nline2\nline3');
    c.commitTextEdit();
    const layer = component['state'].current.layers.find((l) => l.kind === 'text') as TextLayer;
    expect(layer.items[0].text).toBe('line1\nline2\nline3');
  });

  it('editingText 設定中はインラインエディターを描画する', () => {
    TestBed.inject(ObjectChangeService);
    PeerCursor.createMyCursor();
    PeerCursor.myCursor.role = PeerRole.GameMaster;
    component['state'].tool.set('text');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[contenteditable]')).toBeNull();
    (
      component as unknown as {
        startTextEdit: (x: number, y: number, l: string | null, i: string | null, t: string) => void;
      }
    ).startTextEdit(10, 20, null, null, '');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[contenteditable]')).not.toBeNull();
  });

  it('commitTextEdit は空ドラフトなら何も追加しない', () => {
    const c = component as unknown as {
      startTextEdit: (x: number, y: number, l: string | null, i: string | null, t: string) => void;
      commitTextEdit: () => void;
    };
    c.startTextEdit(40, 50, null, null, '');
    component['textDraft'].set('   ');
    c.commitTextEdit();
    const layer = component['state'].current.layers.find((l) => l.kind === 'text');
    expect(layer).toBeUndefined();
  });

  it('既存テキストの編集で text を更新できる', () => {
    component['state'].addTextItem(10, 20, 'old');
    const layer = component['state'].current.layers.find((l) => l.kind === 'text') as TextLayer;
    const item = layer.items[0];
    const c = component as unknown as {
      startTextEdit: (x: number, y: number, l: string | null, i: string | null, t: string) => void;
      commitTextEdit: () => void;
    };
    c.startTextEdit(item.x, item.y, layer.id, item.id, item.text);
    component['textDraft'].set('new');
    c.commitTextEdit();
    const after = component['state'].current.layers.find((l) => l.kind === 'text') as TextLayer;
    expect(after.items[0].text).toBe('new');
  });

  it('既存テキストの編集で空にすると削除される', () => {
    component['state'].addTextItem(10, 20, 'old');
    const layer = component['state'].current.layers.find((l) => l.kind === 'text') as TextLayer;
    const item = layer.items[0];
    const c = component as unknown as {
      startTextEdit: (x: number, y: number, l: string | null, i: string | null, t: string) => void;
      commitTextEdit: () => void;
    };
    c.startTextEdit(item.x, item.y, layer.id, item.id, item.text);
    component['textDraft'].set('');
    c.commitTextEdit();
    const after = component['state'].current.layers.find((l) => l.kind === 'text') as TextLayer;
    expect(after.items.length).toBe(0);
  });

  it('cancelTextEdit は編集を破棄する', () => {
    component['state'].addTextItem(10, 20, 'keep');
    const layer = component['state'].current.layers.find((l) => l.kind === 'text') as TextLayer;
    const item = layer.items[0];
    const c = component as unknown as {
      startTextEdit: (x: number, y: number, l: string | null, i: string | null, t: string) => void;
      cancelTextEdit: () => void;
      editingText: () => unknown;
    };
    c.startTextEdit(item.x, item.y, layer.id, item.id, item.text);
    component['textDraft'].set('changed');
    c.cancelTextEdit();
    expect(c.editingText()).toBeNull();
    const after = component['state'].current.layers.find((l) => l.kind === 'text') as TextLayer;
    expect(after.items[0].text).toBe('keep');
  });

  it('レガシー JSON ファイルを読み込める', async () => {
    const json = serializeScene(createScene(7, 6, 48));
    const file = { arrayBuffer: () => Promise.resolve(new TextEncoder().encode(json).buffer) };
    const input = { files: [file], value: 'x' };
    const event = { target: input } as unknown as Event;

    await (component as unknown as { onFileSelected: (e: Event) => Promise<void> }).onFileSelected(event);

    expect(component['state'].current.cols).toBe(7);
    expect(component['state'].current.rows).toBe(6);
  });
});

describe('buildShapeKindPoints', () => {
  function vertexCount(pts: string): number {
    return pts.trim() === '' ? 0 : pts.trim().split(' ').length;
  }

  it('7 種すべてに対して点列文字列を返す', () => {
    const kinds = ['rect', 'ellipse', 'triangle', 'pentagon', 'hexagon', 'star5', 'star6'] as const;
    for (const kind of kinds) {
      if (kind === 'rect' || kind === 'ellipse') {
        expect(buildShapeKindPoints(kind as never)).toBe('');
      } else {
        expect(buildShapeKindPoints(kind)).not.toBe('');
      }
    }
  });

  it('triangle は 3 頂点を返す', () => {
    expect(vertexCount(buildShapeKindPoints('triangle'))).toBe(3);
  });

  it('pentagon は 5 頂点を返す', () => {
    expect(vertexCount(buildShapeKindPoints('pentagon'))).toBe(5);
  });

  it('hexagon は 6 頂点を返す', () => {
    expect(vertexCount(buildShapeKindPoints('hexagon'))).toBe(6);
  });

  it('star5 は 10 頂点（5点星）を返す', () => {
    expect(vertexCount(buildShapeKindPoints('star5'))).toBe(10);
  });

  it('star6 は 12 頂点（6点星）を返す', () => {
    expect(vertexCount(buildShapeKindPoints('star6'))).toBe(12);
  });

  it('star5 の点列は中心 12,12・半径 9 の外周と内周を交互に含む', () => {
    const pts = buildShapeKindPoints('star5')
      .trim()
      .split(' ')
      .map((p) => p.split(',').map(Number));
    for (let i = 0; i < pts.length; i += 1) {
      const d = Math.hypot(pts[i][0] - 12, pts[i][1] - 12);
      if (i % 2 === 0) {
        expect(d).toBeCloseTo(9, 1);
      } else {
        expect(d).toBeCloseTo(9 * 0.382, 1);
      }
    }
  });
});
