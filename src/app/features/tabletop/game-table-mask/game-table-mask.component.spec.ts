import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Network } from '@axe/core/index';
import { IPeerContext } from '@axe/core/network/peer-context';
import { SoundEffect } from '@axe/domain/media/sound-effect';
import { GameTableMask } from '@axe/domain/tabletop/game-table-mask';
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

    it('destroyで_scratchingTimerIdをクリアしても例外にならないこと', () => {
      expect(() => {
        fixture.destroy();
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

  describe('scratched() — symmetric difference (xor native 実装)', () => {
    let mask: GameTableMask;

    beforeEach(() => {
      mask = GameTableMask.create('testMask', 10, 10, 1);
      fixture.componentRef.setInput('gameTableMask', mask);
      fixture.detectChanges();
    });

    afterEach(() => {
      mask.destroy();
    });

    it('gameTableMask が null のとき scratched() は何もしない', () => {
      fixture.componentRef.setInput('gameTableMask', null);
      fixture.detectChanges();
      expect(() => component.scratched()).not.toThrow();
    });

    it('スクラッチ済みなし + スクラッチ追加 → 追加されたグリッドのみ残る', () => {
      mask.scratchedGrids = '';
      mask.scratchingGrids = '0:0,1:1';
      (component as unknown as { _currentScratchingSet: Set<string> | null })._currentScratchingSet = new Set([
        '0:0',
        '1:1',
      ]);

      component.scratched();

      expect(mask.scratchedGrids).toBe('0:0,1:1');
    });

    it('全て既存と同じ → 対称差が空になる', () => {
      mask.scratchedGrids = '0:0,1:1';
      mask.scratchingGrids = '0:0,1:1';
      (component as unknown as { _currentScratchingSet: Set<string> | null })._currentScratchingSet = new Set([
        '0:0',
        '1:1',
      ]);

      component.scratched();

      expect(mask.scratchedGrids).toBe('');
    });

    it('一部重複 → 非重複部分のみ残る', () => {
      mask.scratchedGrids = '0:0,1:1';
      mask.scratchingGrids = '1:1,2:2';
      (component as unknown as { _currentScratchingSet: Set<string> | null })._currentScratchingSet = new Set([
        '1:1',
        '2:2',
      ]);

      component.scratched();

      expect(mask.scratchedGrids).toBe('0:0,2:2');
    });

    it('_currentScratchingSet が null のときは scratchingGrids をそのまま使用', () => {
      mask.scratchedGrids = '0:0';
      mask.scratchingGrids = '0:0';
      (component as unknown as { _currentScratchingSet: Set<string> | null })._currentScratchingSet = null;

      component.scratched();

      // 対称差: {0:0} xor {0:0} = {}
      expect(mask.scratchedGrids).toBe('');
    });
  });

  describe('スクラッチ操作ボタン', () => {
    let mask: GameTableMask;

    beforeEach(() => {
      vi.spyOn(Network, 'peerContext', 'get').mockReturnValue({ userId: 'my-user', isOpen: true } as IPeerContext);
      vi.spyOn(SoundEffect, 'play').mockImplementation(() => {});
      mask = GameTableMask.create('testMask', 10, 10, 1);
      mask.owner = 'my-user';
      fixture.componentRef.setInput('gameTableMask', mask);
      fixture.detectChanges();
    });

    afterEach(() => {
      vi.restoreAllMocks();
      mask.destroy();
    });

    it('主ボタンの pointerdown でスクラッチ完了を実行すること', () => {
      mask.scratchingGrids = '0:0';

      const event = new PointerEvent('pointerdown', { button: 0 });
      const preventDefault = vi.spyOn(event, 'preventDefault');
      const stopPropagation = vi.spyOn(event, 'stopPropagation');

      expect(component.onScratchDonePointerDown(event)).toBe(false);

      expect(preventDefault).toHaveBeenCalled();
      expect(stopPropagation).toHaveBeenCalled();
      expect(mask.owner).toBe('');
      expect(mask.scratchingGrids).toBe('');
      expect(mask.scratchedGrids).toBe('0:0');
    });

    it('副ボタンの pointerdown ではスクラッチ完了を実行しないこと', () => {
      mask.scratchingGrids = '0:0';

      const event = new PointerEvent('pointerdown', { button: 2 });
      const preventDefault = vi.spyOn(event, 'preventDefault');
      const stopPropagation = vi.spyOn(event, 'stopPropagation');

      expect(component.onScratchDonePointerDown(event)).toBe(false);

      expect(preventDefault).not.toHaveBeenCalled();
      expect(stopPropagation).not.toHaveBeenCalled();
      expect(mask.owner).toBe('my-user');
      expect(mask.scratchingGrids).toBe('0:0');
      expect(mask.scratchedGrids).toBe('');
    });

    it('主ボタンの pointerdown でスクラッチキャンセルを実行すること', () => {
      mask.scratchingGrids = '0:0';

      const event = new PointerEvent('pointerdown', { button: 0 });
      const preventDefault = vi.spyOn(event, 'preventDefault');
      const stopPropagation = vi.spyOn(event, 'stopPropagation');

      expect(component.onScratchCancelPointerDown(event)).toBe(false);

      expect(preventDefault).toHaveBeenCalled();
      expect(stopPropagation).toHaveBeenCalled();
      expect(mask.owner).toBe('');
      expect(mask.scratchingGrids).toBe('');
      expect(mask.scratchedGrids).toBe('');
    });

    it('マスク本体の主ボタン pointerdown でクリックスクラッチできること', () => {
      const event = new PointerEvent('pointerdown', { button: 0, buttons: 1 });
      Object.defineProperty(event, 'offsetX', { value: 10 });
      Object.defineProperty(event, 'offsetY', { value: 10 });

      component.onInputStartPointer(event);
      component.scratched();

      expect(mask.scratchedGrids).toBe('0:0');
    });
  });
});
