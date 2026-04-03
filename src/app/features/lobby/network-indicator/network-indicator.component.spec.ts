import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NetworkIndicatorComponent } from '@axe/features/lobby/network-indicator/network-indicator.component';

describe('NetworkIndicatorComponent', () => {
  let component: NetworkIndicatorComponent;
  let fixture: ComponentFixture<NetworkIndicatorComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [NetworkIndicatorComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NetworkIndicatorComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('破棄クリーンアップ', () => {
    it('timer が clearTimeout でクリアされ null になる', () => {
      const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
      const priv = component as unknown as { timer: NodeJS.Timeout | null };
      priv.timer = setTimeout(() => {}, 999_999);

      fixture.destroy();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      expect(priv.timer).toBeNull();
    });
  });
});
