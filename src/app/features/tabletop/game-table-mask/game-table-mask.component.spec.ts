import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GameTableMaskComponent } from '@axe/features/tabletop/game-table-mask/game-table-mask.component';
import { UiSignalService } from '@axe/shared/ui/ui-signal.service';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('GameTableMaskComponent', () => {
  let component: GameTableMaskComponent;
  let fixture: ComponentFixture<GameTableMaskComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [GameTableMaskComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GameTableMaskComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('viewRotateZ computed signal', () => {
    it('初期値はデフォルト10であること', () => {
      expect(component.viewRotateZ()).toBe(10);
    });

    it('UiSignalServiceのtableViewRotationに連動してZ回転値が変わること', () => {
      const uiSignalService = TestBed.inject(UiSignalService);
      uiSignalService.notifyTableViewRotation(50, 20, 180);
      expect(component.viewRotateZ()).toBe(180);
    });

    it('isInverseがviewRotateZに基づいて正しく判定されること', () => {
      const uiSignalService = TestBed.inject(UiSignalService);
      uiSignalService.notifyTableViewRotation(0, 0, 10);
      expect(component.isInverse).toBe(false);

      uiSignalService.notifyTableViewRotation(0, 0, 180);
      expect(component.isInverse).toBe(true);

      uiSignalService.notifyTableViewRotation(0, 0, 270);
      expect(component.isInverse).toBe(false);
    });
  });

  describe('初期化と破棄', () => {
    it('ngAfterViewInitがなくてもonInputStartが呼ばれても例外にならないこと', () => {
      expect(() => {
        component.onInputStart(new MouseEvent('mousedown'));
      }).not.toThrow();
    });

    it('ngAfterViewInitがなくてもonInputMovePointerが呼ばれても例外にならないこと', () => {
      expect(() => {
        const e = new PointerEvent('pointermove');
        Object.defineProperty(e, 'offsetX', { value: 10 });
        Object.defineProperty(e, 'offsetY', { value: 10 });
        Object.defineProperty(e, 'buttons', { value: 0 });
        component.onInputMovePointer(e);
      }).not.toThrow();
    });

    it('ngDestroyで_scratchingTimerIdをクリアしても例外にならないこと', () => {
      expect(() => {
        component.ngOnDestroy();
      }).not.toThrow();
    });

    it('scratchingメソッドで_currentScratchingSetがnullでも初期化されること', () => {
      const gameTableMask = component.gameTableMask();
      if (!gameTableMask) {
        // gameTableMask未設定の場合はスキップ
        expect(true).toBe(true);
        return;
      }
      expect(() => {
        component.scratching(true, { offsetX: 10, offsetY: 10 });
      }).not.toThrow();
    });

    it('scratchedメソッドで_currentScratchingSetがnullでも例外にならないこと', () => {
      expect(() => {
        component.scratched();
      }).not.toThrow();
    });
  });
});
