import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalService } from '@axe/application/ui/modal.service';
import { ImageFile } from '@axe/core/storage/image-file';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { GridType } from '@axe/domain/tabletop/game-table';
import { hexSpacing } from '@axe/domain/tabletop/hex-geometry';
import {
  MapImageGridAdjusterComponent,
  MapImageGridAdjusterOption,
} from '@axe/features/tabletop/map-image-grid-adjuster/map-image-grid-adjuster.component';
import { cropImageRegion } from '@axe/features/tabletop/map-image-grid-adjuster/map-image-grid-region';

const DISPLAY_CELL = 48;

describe('MapImageGridAdjusterComponent', () => {
  let fixture: ComponentFixture<MapImageGridAdjusterComponent>;
  let component: MapImageGridAdjusterComponent;
  let modalService: { option: unknown; title: string; resolve: ReturnType<typeof vi.fn> };
  let imageStorage: { get: ReturnType<typeof vi.fn>; addAsync: ReturnType<typeof vi.fn> };

  async function setup(option: MapImageGridAdjusterOption) {
    modalService = { option, title: '', resolve: vi.fn() };
    imageStorage = { get: vi.fn().mockReturnValue(null), addAsync: vi.fn() };
    TestBed.configureTestingModule({
      imports: [MapImageGridAdjusterComponent],
    });
    TestBed.overrideProvider(ModalService, { useValue: modalService });
    TestBed.overrideProvider(ImageStorage, { useValue: imageStorage });
    await TestBed.compileComponents();
    fixture = TestBed.createComponent(MapImageGridAdjusterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function makeReady(imageW: number, imageH: number) {
    component.imageWidth.set(imageW);
    component.imageHeight.set(imageH);
    (component as unknown as { initTransform: () => void }).initTransform();
    component.loadState.set('ready');
    (component as unknown as { loadedImage: unknown }).loadedImage = {} as HTMLImageElement;
  }

  it('画像が見つからないときはエラー状態にすること', async () => {
    await setup({ imageIdentifier: 'missing', gridSize: 50 });

    expect(component.loadState()).toBe('error');
  });

  it('読み込み時にgridSizeから初期スケールを決め中央へスナップ配置すること', async () => {
    await setup({ imageIdentifier: 'x', gridSize: 48 });
    makeReady(400, 300);

    expect(component.scale()).toBeCloseTo(1, 5);
    expect(component.tx() % DISPLAY_CELL).toBe(0);
    expect(component.ty() % DISPLAY_CELL).toBe(0);
  });

  it('既定のグリッドタイプはオプションから取ること', async () => {
    await setup({ imageIdentifier: 'x', gridSize: 50, gridType: GridType.HEX_VERTICAL });
    expect(component.gridType()).toBe(GridType.HEX_VERTICAL);
  });

  it('オプションのNONEはSQUAREに矯正すること', async () => {
    await setup({ imageIdentifier: 'x', gridSize: 50, gridType: GridType.NONE });
    expect(component.gridType()).toBe(GridType.SQUARE);
  });

  it('グリッドタイプ未指定の既定はSQUAREであること', async () => {
    await setup({ imageIdentifier: 'x', gridSize: 50 });
    expect(component.gridType()).toBe(GridType.SQUARE);
  });

  it('グリッドタイプ変更で有効なアンカーへ再スナップすること', async () => {
    await setup({ imageIdentifier: 'x', gridSize: 48 });
    makeReady(2000, 2000);

    component.setGridType(GridType.HEX_VERTICAL);

    expect(component.gridType()).toBe(GridType.HEX_VERTICAL);
    const { colSpacing } = hexSpacing(DISPLAY_CELL, true);
    const s3 = DISPLAY_CELL / Math.sqrt(3);
    const i = (component.tx() + s3) / colSpacing;
    expect(i).toBeCloseTo(Math.round(i), 6);
    expect(Math.abs(Math.round(i) % 2)).toBe(0);
  });

  it('横マス数指定でスケールが算出されスナップ後に指定マス数になること', async () => {
    await setup({ imageIdentifier: 'x', gridSize: 50 });
    makeReady(800, 600);

    component.setCols(16);

    expect(component.scale()).toBeCloseTo(0.96, 5);
    expect(component.cols()).toBe(16);
  });

  it('ヘクス縦でも横マス数指定で指定マス数になること', async () => {
    await setup({ imageIdentifier: 'x', gridSize: 50, gridType: GridType.HEX_VERTICAL });
    makeReady(800, 4000);

    component.setCols(7);

    expect(component.cols()).toBe(7);
  });

  it('縦マス数指定でスケールが算出されること', async () => {
    await setup({ imageIdentifier: 'x', gridSize: 50 });
    makeReady(600, 800);

    component.setRows(16);

    expect(component.scale()).toBeCloseTo(0.96, 5);
    expect(component.rows()).toBe(16);
  });

  it('ドラッグ相当のtx/ty変更でcols/rowsが再計算されること', async () => {
    await setup({ imageIdentifier: 'x', gridSize: 48 });
    makeReady(480, 240);
    component.scale.set(1);
    component.tx.set(0);
    component.ty.set(0);

    expect(component.cols()).toBe(10);
    expect(component.rows()).toBe(5);

    component.tx.set(24);
    expect(component.cols()).toBe(9);
  });

  it('カーソル位置を固定したままズームすること', async () => {
    await setup({ imageIdentifier: 'x', gridSize: 48 });
    makeReady(480, 240);
    component.scale.set(1);
    component.tx.set(0);
    component.ty.set(0);

    (component as unknown as { zoomAt: (px: number, py: number, factor: number) => void }).zoomAt(100, 100, 2);

    expect(component.scale()).toBeCloseTo(2, 5);
    expect(component.tx()).toBeCloseTo(-100, 5);
    expect(component.ty()).toBeCloseTo(-100, 5);
  });

  it('リセットで初期スケールに戻し中央へスナップ配置すること', async () => {
    await setup({ imageIdentifier: 'x', gridSize: 48 });
    makeReady(480, 240);
    component.scale.set(3);
    component.tx.set(500);
    component.ty.set(400);

    component.reset();

    expect(component.scale()).toBeCloseTo(1, 5);
    expect(component.tx() % DISPLAY_CELL).toBe(0);
    expect(component.ty() % DISPLAY_CELL).toBe(0);
  });

  it('画像をグリッド外へ完全に出すと確定不可にすること', async () => {
    await setup({ imageIdentifier: 'x', gridSize: 48 });
    makeReady(480, 240);
    component.scale.set(1);
    component.tx.set(component.stageW() + 100);

    expect(component.hasWholeCell()).toBe(false);
    expect(component.canApply()).toBe(false);
  });

  it('確定時は矩形クロップ指定で保存し行列数とグリッドタイプで解決すること', async () => {
    await setup({ imageIdentifier: 'x', gridSize: 48 });
    makeReady(480, 240);
    component.scale.set(1);
    component.tx.set(0);
    component.ty.set(0);

    const fakeBlob = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/webp' });
    const cropFn = vi.fn().mockResolvedValue(fakeBlob);
    (component as unknown as { cropFn: typeof cropImageRegion }).cropFn = cropFn;
    const fakeImage = ImageFile.createEmpty('new-id');
    imageStorage.addAsync.mockResolvedValue(fakeImage);

    const c = component.covered();
    await component.apply();

    expect(cropFn).toHaveBeenCalledOnce();
    const args = cropFn.mock.calls[0];
    expect(args[1]).toBe(c.imageX);
    expect(args[2]).toBe(c.imageY);
    expect(args[3]).toBe(c.imageW);
    expect(args[4]).toBe(c.imageH);
    expect(imageStorage.addAsync).toHaveBeenCalledWith(fakeBlob);
    expect(modalService.resolve).toHaveBeenCalledWith({
      imageIdentifier: 'new-id',
      width: 10,
      height: 5,
      gridType: GridType.SQUARE,
    });
  });

  it('キャンセル時はnullで解決すること', async () => {
    await setup({ imageIdentifier: 'x', gridSize: 50 });

    component.cancel();

    expect(modalService.resolve).toHaveBeenCalledWith(null);
  });
});
