import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { UiSignalService } from '@axe/application/ui/ui-signal.service';
import { DiceSymbol } from '@axe/domain/dice/dice-symbol';
import { DiceSymbolComponent } from '@axe/features/dice/dice-symbol/dice-symbol.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('DiceSymbolComponent', () => {
  let component: DiceSymbolComponent;
  let fixture: ComponentFixture<DiceSymbolComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [DiceSymbolComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DiceSymbolComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('signal-driven CD', () => {
    it('animeStateがsignalであること', () => {
      expect(typeof component.animeState).toBe('function');
      expect(component.animeState()).toBe('inactive');
    });

    it('nameゲッターがnetworkVersionを参照していること', () => {
      const diceSymbol = DiceSymbol.create('テストダイス', 1, 1);
      fixture.componentRef.setInput('diceSymbol', diceSymbol);
      const objectChangeService = TestBed.inject(ObjectChangeService);
      const original = objectChangeService.networkVersion;
      const spy = vi.fn(() => original());
      Object.defineProperty(objectChangeService, 'networkVersion', { value: spy, configurable: true });
      void component.name();
      expect(spy).toHaveBeenCalled();
    });

    it('isIconHiddenがsignalであること', () => {
      expect(typeof component.isIconHidden).toBe('function');
      expect(component.isIconHidden()).toBe(false);
    });
  });

  describe('billboardTransform カメラ追従', () => {
    it('tableViewRotation の変化に応じて transform 文字列が更新されること', () => {
      const diceSymbol = DiceSymbol.create('ビルボードテスト', 1, 1);
      fixture.componentRef.setInput('diceSymbol', diceSymbol);
      const ui = TestBed.inject(UiSignalService);

      ui.notifyTableViewRotation(50, 0, 10);
      const before = component.billboardTransform();

      ui.notifyTableViewRotation(60, 20, 120);
      const after = component.billboardTransform();

      expect(before).not.toBe(after);
      expect(after).toContain('rotateZ(-120deg)');
      expect(after).toContain('rotateX(-60deg)');
      expect(after).toContain('rotateY(-20deg)');
    });

    it('ダイス自身の rotate を打ち消す回転が含まれること', () => {
      const diceSymbol = DiceSymbol.create('rotateテスト', 1, 1);
      diceSymbol.rotate = 45;
      fixture.componentRef.setInput('diceSymbol', diceSymbol);
      TestBed.inject(UiSignalService).notifyTableViewRotation(50, 0, 10);

      expect(component.billboardTransform()).toContain('rotateZ(-45deg)');
    });

    it('オーナー名用のビルボード変換が名前用より大きいオフセットを持つこと', () => {
      const diceSymbol = DiceSymbol.create('オフセットテスト', 1, 1);
      fixture.componentRef.setInput('diceSymbol', diceSymbol);
      TestBed.inject(UiSignalService).notifyTableViewRotation(50, 0, 10);

      const match = (s: string) => Number(s.match(/translateZ\((-?[\d.]+)px\)/)?.[1] ?? 0);
      expect(match(component.billboardTransformOwner())).toBeLessThan(match(component.billboardTransform()));
    });
  });

  describe('timer cleanup on destroy', () => {
    it('doubleClickTimer が clearTimeout でクリアされる', () => {
      const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
      const priv = component as unknown as { doubleClickTimer: NodeJS.Timeout | null };
      priv.doubleClickTimer = setTimeout(() => {}, 999_999);

      fixture.destroy();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('iconHiddenTimer が clearTimeout でクリアされる', () => {
      const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
      const priv = component as unknown as { iconHiddenTimer: NodeJS.Timeout | null };
      priv.iconHiddenTimer = setTimeout(() => {}, 999_999);

      fixture.destroy();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });
});
