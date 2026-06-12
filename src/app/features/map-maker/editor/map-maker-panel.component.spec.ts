import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { TabletopService } from '@axe/application/tabletop/tabletop.service';
import { PanelService } from '@axe/application/ui/panel.service';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { ObjectStore } from '@axe/core/sync/object-store';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { PeerRole } from '@axe/domain/peer/peer-role';
import { MapMakerPanelComponent } from '@axe/features/map-maker/editor/map-maker-panel.component';
import { exportSceneToBlob } from '@axe/features/map-maker/render/export-image';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('MapMakerPanelComponent', () => {
  let fixture: ComponentFixture<MapMakerPanelComponent>;
  let component: MapMakerPanelComponent;
  let imageStorage: { addAsync: ReturnType<typeof vi.fn> };
  let table: { imageIdentifier: string; width: number; height: number; gridSize: number };

  beforeEach(async () => {
    imageStorage = { addAsync: vi.fn() };
    table = { imageIdentifier: '', width: 0, height: 0, gridSize: 0 };
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
});
