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
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('コンポーネント破棄時にエラーにならないこと（タイマー未設定時）', () => {
    expect(() => fixture.destroy()).not.toThrow();
  });

  describe('破棄クリーンアップ', () => {
    it('updateInterval が clearTimeout でクリアされ null になる', () => {
      const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
      const priv = component as unknown as { updateInterval: NodeJS.Timeout | null };
      priv.updateInterval = setTimeout(() => {}, 999_999);

      fixture.destroy();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      expect(priv.updateInterval).toBeNull();
    });

    it('timestampInterval が clearTimeout でクリアされ null になる', () => {
      const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
      const priv = component as unknown as {
        timestampInterval: NodeJS.Timeout | null;
        timestampIntervalEnable: boolean;
      };
      priv.timestampInterval = setTimeout(() => {}, 999_999);

      fixture.destroy();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      expect(priv.timestampInterval).toBeNull();
    });
  });
});
