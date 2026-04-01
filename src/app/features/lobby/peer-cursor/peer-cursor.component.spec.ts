import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PeerCursorComponent } from '@axe/features/lobby/peer-cursor/peer-cursor.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('PeerCursorComponent', () => {
  let component: PeerCursorComponent;
  let fixture: ComponentFixture<PeerCursorComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [PeerCursorComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PeerCursorComponent);
    component = fixture.componentInstance;
    vi.spyOn(component, 'ngOnDestroy').mockImplementation(() => undefined);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnDestroy を直接呼び出してもエラーにならないこと（タイマー未設定時）', () => {
    // タイマーフィールドが null の状態で ngOnDestroy を呼んでも安全であることを確認
    vi.mocked(component.ngOnDestroy).mockRestore();
    expect(() => component.ngOnDestroy()).not.toThrow();
  });

  describe('ngOnDestroy', () => {
    it('updateInterval が clearTimeout でクリアされ null になる', () => {
      vi.mocked(component.ngOnDestroy).mockRestore();
      const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
      const priv = component as unknown as { updateInterval: NodeJS.Timeout | null };
      priv.updateInterval = setTimeout(() => {}, 999_999);

      component.ngOnDestroy();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      expect(priv.updateInterval).toBeNull();
    });

    it('timestampInterval が clearTimeout でクリアされ null になる', () => {
      vi.mocked(component.ngOnDestroy).mockRestore();
      const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
      const priv = component as unknown as {
        timestampInterval: NodeJS.Timeout | null;
        timestampIntervalEnable: boolean;
      };
      priv.timestampInterval = setTimeout(() => {}, 999_999);

      component.ngOnDestroy();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      expect(priv.timestampInterval).toBeNull();
    });
  });
});
