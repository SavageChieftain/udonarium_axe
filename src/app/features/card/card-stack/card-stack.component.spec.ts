import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CardStack } from '@axe/domain/card/card-stack';
import { CardStackComponent } from '@axe/features/card/card-stack/card-stack.component';
import { ObjectChangeService } from '@axe/shared/sync/object-change.service';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('CardStackComponent', () => {
  let component: CardStackComponent;
  let fixture: ComponentFixture<CardStackComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [CardStackComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CardStackComponent);
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
      const cardStack = CardStack.create('テストスタック');
      fixture.componentRef.setInput('cardStack', cardStack);
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

    it('ChangeDetectorRefを使用していないこと', () => {
      // Batch A+Bで全markForCheckを除去後、CDRefは不要
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((component as any).changeDetector).toBeUndefined();
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
