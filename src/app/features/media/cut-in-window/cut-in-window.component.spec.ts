import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CutInWindowComponent } from '@axe/features/media/cut-in-window/cut-in-window.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('CutInWindowComponent', () => {
  let component: CutInWindowComponent;
  let fixture: ComponentFixture<CutInWindowComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [CutInWindowComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CutInWindowComponent);
    component = fixture.componentInstance;
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnDestroy', () => {
    it('cutInTimeOut が clearTimeout でクリアされる', () => {
      const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
      const priv = component as unknown as { cutInTimeOut: ReturnType<typeof setTimeout> | null };
      priv.cutInTimeOut = setTimeout(() => {}, 999_999);

      component.ngOnDestroy();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      expect(priv.cutInTimeOut).toBeNull();
    });

    it('timerCheckWindowSize が clearTimeout でクリアされる', () => {
      const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
      component.timerCheckWindowSize = setTimeout(() => {}, 999_999);

      component.ngOnDestroy();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      expect(component.timerCheckWindowSize).toBeNull();
    });

    it('_timeoutIdVideo が clearTimeout でクリアされる', () => {
      const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
      const priv = component as unknown as { _timeoutIdVideo: ReturnType<typeof setTimeout> | null };
      priv._timeoutIdVideo = setTimeout(() => {}, 999_999);

      component.ngOnDestroy();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      expect(priv._timeoutIdVideo).toBeNull();
    });
  });
});
