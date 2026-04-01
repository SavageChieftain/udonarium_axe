import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DiceSymbol } from '@axe/domain/dice/dice-symbol';
import { DiceSymbolComponent } from '@axe/features/dice/dice-symbol/dice-symbol.component';
import { ObjectChangeService } from '@axe/shared/sync/object-change.service';
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
      void component.name;
      expect(spy).toHaveBeenCalled();
    });

    it('isIconHiddenがsignalであること', () => {
      expect(typeof component.isIconHidden).toBe('function');
      expect(component.isIconHidden()).toBe(false);
    });
  });

  describe('ngOnDestroy', () => {
    it('doubleClickTimer が clearTimeout でクリアされる', () => {
      const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
      const priv = component as unknown as { doubleClickTimer: NodeJS.Timeout | null };
      priv.doubleClickTimer = setTimeout(() => {}, 999_999);

      component.ngOnDestroy();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('iconHiddenTimer が clearTimeout でクリアされる', () => {
      const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
      const priv = component as unknown as { iconHiddenTimer: NodeJS.Timeout | null };
      priv.iconHiddenTimer = setTimeout(() => {}, 999_999);

      component.ngOnDestroy();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });
});
