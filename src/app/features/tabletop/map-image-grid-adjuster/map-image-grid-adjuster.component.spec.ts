import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalService } from '@axe/application/ui/modal.service';
import { ImageFile } from '@axe/core/storage/image-file';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { GridType } from '@axe/domain/tabletop/game-table';
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
    fixture.detectChanges();
  }

  function frame() {
    return (component as unknown as { frame: () => { fx: number; fy: number; fw: number; fh: number } }).frame();
  }

  it('画像が見つからないときはエラー状態にすること', async () => {
    await setup({ imageIdentifier: 'missing', gridSize: 50 });

    expect(component.loadState()).toBe('error');
  });

  it('読み込み時にgridSizeから初期マス数を決めること', async () => {
    await setup({ imageIdentifier: 'x', gridSize: 48 });
    makeReady(480, 240);

    expect(component.cols()).toBe(10);
    expect(component.rows()).toBe(5);
  });

  it('初期マス数は1〜100にクランプされること', async () => {
    await setup({ imageIdentifier: 'x', gridSize: 1 });
    makeReady(8000, 20);

    expect(component.cols()).toBe(100);
    expect(component.rows()).toBe(20);
  });

  it('フレームは中央配置後にスナップされること（スクエア）', async () => {
    await setup({ imageIdentifier: 'x', gridSize: 48 });
    makeReady(480, 240);

    const f = frame();
    expect(f.fx % DISPLAY_CELL).toBe(0);
    expect(f.fy % DISPLAY_CELL).toBe(0);
    expect(f.fw).toBe(component.cols() * DISPLAY_CELL);
    expect(f.fh).toBe(component.rows() * DISPLAY_CELL);
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

  it('マス数変更でフレームが動いても画像とフレームの相対位置が保たれること', async () => {
    await setup({ imageIdentifier: 'x', gridSize: 48 });
    makeReady(480, 240);

    const before = component.tx() - frame().fx;
    component.setCols(7);
    fixture.detectChanges();
    const after = component.tx() - frame().fx;

    expect(after).toBeCloseTo(before, 5);
  });

  it('リンク時のフィットはカバーフィットで両軸スケールが等しくなること', async () => {
    await setup({ imageIdentifier: 'x', gridSize: 48 });
    makeReady(480, 240);
    component.linked.set(true);

    component.fit();

    const f = frame();
    const expected = Math.max(f.fw / 480, f.fh / 240);
    expect(component.scaleX()).toBeCloseTo(expected, 5);
    expect(component.scaleY()).toBeCloseTo(expected, 5);
    expect(component.scaleX()).toBeCloseTo(component.scaleY(), 5);
  });

  it('非リンク時のフィットは厳密ストレッチで枠ぴったりになること', async () => {
    await setup({ imageIdentifier: 'x', gridSize: 48 });
    makeReady(480, 240);
    component.linked.set(false);

    component.fit();

    const f = frame();
    expect(component.scaleX()).toBeCloseTo(f.fw / 480, 5);
    expect(component.scaleY()).toBeCloseTo(f.fh / 240, 5);
    expect(component.tx()).toBeCloseTo(f.fx, 5);
    expect(component.ty()).toBeCloseTo(f.fy, 5);
  });

  it('リンク時の角ハンドルリサイズはscaleXとscaleYが等しいまま保たれること', async () => {
    await setup({ imageIdentifier: 'x', gridSize: 48 });
    makeReady(480, 240);
    component.linked.set(true);
    component.scaleX.set(1);
    component.scaleY.set(1);
    component.tx.set(0);
    component.ty.set(0);

    const c = component as unknown as {
      onPointerDown: (e: PointerEvent) => void;
      onPointerMove: (e: PointerEvent) => void;
      onPointerUp: (e: PointerEvent) => void;
      stagePoint: (e: PointerEvent) => { x: number; y: number };
    };
    const target = { setPointerCapture() {}, releasePointerCapture() {}, focus() {} };
    vi.spyOn(c, 'stagePoint').mockReturnValue({ x: 480, y: 240 });
    c.onPointerDown({ clientX: 480, clientY: 240, pointerId: 1, currentTarget: target } as unknown as PointerEvent);
    c.onPointerMove({ clientX: 600, clientY: 280, pointerId: 1 } as unknown as PointerEvent);
    c.onPointerUp({ pointerId: 1, currentTarget: target } as unknown as PointerEvent);

    expect(component.scaleX()).toBeCloseTo(component.scaleY(), 5);
    expect(component.scaleX()).toBeGreaterThan(1);
  });

  it('辺ハンドルは非リンク時のみ有効であること', async () => {
    await setup({ imageIdentifier: 'x', gridSize: 48 });
    makeReady(480, 240);
    component.tx.set(0);
    component.ty.set(0);
    component.scaleX.set(1);
    component.scaleY.set(1);

    const c = component as unknown as { hitTest: (x: number, y: number) => { kind: string; handle?: string } };
    component.linked.set(true);
    expect(c.hitTest(240, 0).handle).not.toBe('n');
    component.linked.set(false);
    expect(c.hitTest(240, 0)).toEqual({ kind: 'image', handle: 'n' });
  });

  it('画像をフレーム外へ完全に出すと確定不可にすること', async () => {
    await setup({ imageIdentifier: 'x', gridSize: 48 });
    makeReady(480, 240);

    expect(component.canApply()).toBe(true);
    component.tx.set(component.stageW() + 1000);
    fixture.detectChanges();

    expect(component.canApply()).toBe(false);
  });

  it('確定時は逆写像した矩形でクロップし行列数とグリッドタイプで解決すること', async () => {
    await setup({ imageIdentifier: 'x', gridSize: 48 });
    makeReady(480, 240);
    component.linked.set(false);
    component.fit();
    fixture.detectChanges();

    const fakeBlob = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/webp' });
    const cropFn = vi.fn().mockResolvedValue(fakeBlob);
    (component as unknown as { cropFn: typeof cropImageRegion }).cropFn = cropFn;
    const fakeImage = ImageFile.createEmpty('new-id');
    imageStorage.addAsync.mockResolvedValue(fakeImage);

    const f = frame();
    const sx = component.scaleX();
    const sy = component.scaleY();
    const expectX = (f.fx - component.tx()) / sx;
    const expectY = (f.fy - component.ty()) / sy;
    const expectW = f.fw / sx;
    const expectH = f.fh / sy;

    await component.apply();

    expect(cropFn).toHaveBeenCalledOnce();
    const args = cropFn.mock.calls[0];
    expect(args[1]).toBeCloseTo(expectX, 5);
    expect(args[2]).toBeCloseTo(expectY, 5);
    expect(args[3]).toBeCloseTo(expectW, 5);
    expect(args[4]).toBeCloseTo(expectH, 5);
    expect(imageStorage.addAsync).toHaveBeenCalledWith(fakeBlob);
    expect(modalService.resolve).toHaveBeenCalledWith({
      imageIdentifier: 'new-id',
      width: component.cols(),
      height: component.rows(),
      gridType: GridType.SQUARE,
    });
  });

  it('キャンセル時はnullで解決すること', async () => {
    await setup({ imageIdentifier: 'x', gridSize: 50 });

    component.cancel();

    expect(modalService.resolve).toHaveBeenCalledWith(null);
  });
});
