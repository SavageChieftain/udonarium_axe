import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ObjectStore } from '@axe/core/sync/object-store';
import { CutIn } from '@axe/domain/media/cut-in';
import { CutInWindowComponent } from '@axe/features/media/cut-in-window/cut-in-window.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('CutInWindowComponent', () => {
  let component: CutInWindowComponent;
  let fixture: ComponentFixture<CutInWindowComponent>;
  let store: ObjectStore;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [CutInWindowComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    store = ObjectStore.instance;
    const allObjects = store.getObjects();
    allObjects.forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
    fixture = TestBed.createComponent(CutInWindowComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    const allObjects = store.getObjects();
    allObjects.forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
    vi.restoreAllMocks();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  describe('videoVolume', () => {
    it('カットイン個別音量をそのままYouTube API音量として返す', () => {
      const cutIn = new CutIn('volume-test');
      cutIn.initialize();
      cutIn.videoVolume = 75;
      component.cutIn = cutIn;

      expect(component.videoVolume).toBe(75);
    });

    it('テスト再生時も個別音量をそのまま返す', () => {
      const cutIn = new CutIn('audition-volume-test');
      cutIn.initialize();
      cutIn.videoVolume = 50;
      component.cutIn = cutIn;
      component.isTest = true;

      expect(component.videoVolume).toBe(50);
    });
  });

  describe('ngOnDestroy', () => {
    it('cutInTimeOut が clearTimeout でクリアされる', () => {
      const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
      const priv = component as unknown as { cutInTimeOut: ReturnType<typeof setTimeout> | null };
      priv.cutInTimeOut = setTimeout(() => {}, 999_999);

      fixture.destroy();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      expect(priv.cutInTimeOut).toBeNull();
    });

    it('timerCheckWindowSize が clearTimeout でクリアされる', () => {
      const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
      component.timerCheckWindowSize = setTimeout(() => {}, 999_999);

      fixture.destroy();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      expect(component.timerCheckWindowSize).toBeNull();
    });

    it('_timeoutIdVideo が clearTimeout でクリアされる', () => {
      const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
      const priv = component as unknown as { _timeoutIdVideo: ReturnType<typeof setTimeout> | null };
      priv._timeoutIdVideo = setTimeout(() => {}, 999_999);

      fixture.destroy();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      expect(priv._timeoutIdVideo).toBeNull();
    });
  });
});
