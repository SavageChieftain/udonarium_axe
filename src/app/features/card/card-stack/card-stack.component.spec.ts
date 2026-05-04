import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Card } from '@axe/domain/card/card';
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
      void component.name();
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

  describe('複数枚ドロー', () => {
    it('指定枚数だけ山札からカードを出して配置をずらすこと', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0);
      const cardStack = CardStack.create('draw-stack');
      cardStack.location.name = 'table';
      cardStack.location.x = 100;
      cardStack.location.y = 200;
      cardStack.putOnBottom(Card.create('c1', '', '', 2));
      cardStack.putOnBottom(Card.create('c2', '', '', 2));
      cardStack.putOnBottom(Card.create('c3', '', '', 2));
      fixture.componentRef.setInput('cardStack', cardStack);

      try {
        const drawn = (component as unknown as { drawCards(count: number): Card[] }).drawCards(3);

        expect(drawn).toHaveLength(3);
        expect(cardStack.cards).toHaveLength(0);
        expect(drawn.map((card) => card.location.name)).toEqual(['table', 'table', 'table']);
        expect(drawn.map((card) => card.location.x)).toEqual([200, 218, 236]);
        expect(drawn.map((card) => card.location.y)).toEqual([225, 233, 241]);
      } finally {
        cardStack.destroy();
        vi.restoreAllMocks();
      }
    });

    it('指定枚数が山札残数を超えても残り枚数だけ引くこと', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0);
      const cardStack = CardStack.create('draw-stack-limit');
      cardStack.putOnBottom(Card.create('c1', '', '', 2));
      cardStack.putOnBottom(Card.create('c2', '', '', 2));
      fixture.componentRef.setInput('cardStack', cardStack);

      try {
        const drawn = (component as unknown as { drawCards(count: number): Card[] }).drawCards(5);

        expect(drawn).toHaveLength(2);
        expect(cardStack.cards).toHaveLength(0);
      } finally {
        cardStack.destroy();
        vi.restoreAllMocks();
      }
    });
  });
});
