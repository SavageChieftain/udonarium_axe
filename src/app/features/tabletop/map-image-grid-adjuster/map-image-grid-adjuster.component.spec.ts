import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalService } from '@axe/application/ui/modal.service';
import { ImageFile } from '@axe/core/storage/image-file';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { cropAlignedRegion } from '@axe/features/tabletop/map-image-grid-adjuster/map-image-crop';
import {
  MapImageGridAdjusterComponent,
  MapImageGridAdjusterOption,
} from '@axe/features/tabletop/map-image-grid-adjuster/map-image-grid-adjuster.component';

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
    component.loadState.set('ready');
    (component as unknown as { loadedImage: unknown }).loadedImage = {} as HTMLImageElement;
  }

  it('画像が見つからないときはエラー状態にすること', async () => {
    await setup({ imageIdentifier: 'missing', gridSize: 50 });

    expect(component.loadState()).toBe('error');
  });

  it('cellPxとoffsetの変更でcols/rowsが再計算されること', async () => {
    await setup({ imageIdentifier: 'x', gridSize: 50 });
    makeReady(500, 300);

    component.cellPx.set(50);
    component.offsetX.set(0);
    component.offsetY.set(0);
    expect(component.cols()).toBe(10);
    expect(component.rows()).toBe(6);

    component.offsetX.set(60);
    expect(component.cols()).toBe(8);

    component.cellPx.set(100);
    expect(component.cols()).toBe(4);
    expect(component.rows()).toBe(3);
  });

  it('1マスも入らないときは確定不可にすること', async () => {
    await setup({ imageIdentifier: 'x', gridSize: 50 });
    makeReady(40, 40);
    component.cellPx.set(50);

    expect(component.hasWholeCell()).toBe(false);
    expect(component.canApply()).toBe(false);
  });

  it('確定時はクロップ画像を保存し正しい幅・高さで解決すること', async () => {
    await setup({ imageIdentifier: 'x', gridSize: 50 });
    makeReady(500, 300);
    component.cellPx.set(50);
    component.offsetX.set(0);
    component.offsetY.set(0);

    const fakeBlob = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/webp' });
    const cropFn = vi.fn().mockResolvedValue(fakeBlob);
    (component as unknown as { cropFn: typeof cropAlignedRegion }).cropFn = cropFn;
    const fakeImage = ImageFile.createEmpty('new-id');
    imageStorage.addAsync.mockResolvedValue(fakeImage);

    await component.apply();

    expect(cropFn).toHaveBeenCalledOnce();
    expect(imageStorage.addAsync).toHaveBeenCalledWith(fakeBlob);
    expect(modalService.resolve).toHaveBeenCalledWith({
      imageIdentifier: 'new-id',
      width: 10,
      height: 6,
    });
  });

  it('キャンセル時はnullで解決すること', async () => {
    await setup({ imageIdentifier: 'x', gridSize: 50 });

    component.cancel();

    expect(modalService.resolve).toHaveBeenCalledWith(null);
  });
});
