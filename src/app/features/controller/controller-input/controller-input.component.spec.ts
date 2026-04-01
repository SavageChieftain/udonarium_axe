import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResettableTimeout } from '@axe/core/util/resettable-timeout';
import { ControllerInputComponent } from '@axe/features/controller/controller-input/controller-input.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('ControllerInputComponent', () => {
  let component: ControllerInputComponent;
  let fixture: ComponentFixture<ControllerInputComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [ControllerInputComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ControllerInputComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('signal-driven CD', () => {
    it('writingPeerNamesがsignalであること', () => {
      expect(typeof component.writingPeerNames).toBe('function');
      expect(component.writingPeerNames()).toEqual([]);
    });
  });

  describe('ngOnDestroy', () => {
    it('writingEventInterval が clearTimeout でクリアされ null になる', () => {
      const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
      const priv = component as unknown as { writingEventInterval: NodeJS.Timeout | null };
      priv.writingEventInterval = setTimeout(() => {}, 999_999);

      component.ngOnDestroy();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      expect(priv.writingEventInterval).toBeNull();
    });

    it('writingPeers の ResettableTimeout が全て stop され Map がクリアされる', () => {
      const timeout1 = new ResettableTimeout(() => {}, 999_999);
      const timeout2 = new ResettableTimeout(() => {}, 999_999);
      vi.spyOn(timeout1, 'stop');
      vi.spyOn(timeout2, 'stop');
      component.writingPeers.set('peer-1', timeout1);
      component.writingPeers.set('peer-2', timeout2);

      component.ngOnDestroy();

      expect(timeout1.stop).toHaveBeenCalled();
      expect(timeout2.stop).toHaveBeenCalled();
      expect(component.writingPeers.size).toBe(0);
    });
  });
});
