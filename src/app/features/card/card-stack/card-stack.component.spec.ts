import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { TabletopService } from '@axe/application/tabletop/tabletop.service';
import { Card } from '@axe/domain/card/card';
import { CardStack } from '@axe/domain/card/card-stack';
import { CardStackComponent } from '@axe/features/card/card-stack/card-stack.component';
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

  describe('stack 3D 表現', () => {
    function makeStackWithCards(count: number): CardStack {
      const stack = CardStack.create(`stack-${count}`);
      for (let i = 0; i < count; i++) stack.putOnBottom(Card.create(`c${i}`, '', '', 2));
      return stack;
    }

    function readThickness(): number {
      return (component as unknown as { stackThicknessPx(): number }).stackThicknessPx();
    }

    function readLayers(): readonly { z: number; bg: string }[] {
      return (component as unknown as { stackLayers(): readonly { z: number; bg: string }[] }).stackLayers();
    }

    it('1枚以下なら厚みは0でレイヤーも空', () => {
      const stack0 = makeStackWithCards(0);
      fixture.componentRef.setInput('cardStack', stack0);
      try {
        expect(readThickness()).toBe(0);
        expect(readLayers()).toEqual([]);
      } finally {
        stack0.destroy();
      }

      const stack1 = makeStackWithCards(1);
      fixture.componentRef.setInput('cardStack', stack1);
      try {
        expect(readThickness()).toBe(0);
        expect(readLayers()).toEqual([]);
      } finally {
        stack1.destroy();
      }
    });

    it('枚数に応じて厚みが増え、最大60pxで頭打ちになる', () => {
      const stack10 = makeStackWithCards(10);
      fixture.componentRef.setInput('cardStack', stack10);
      try {
        expect(readThickness()).toBeCloseTo(10);
      } finally {
        stack10.destroy();
      }

      const stack200 = makeStackWithCards(200);
      fixture.componentRef.setInput('cardStack', stack200);
      try {
        expect(readThickness()).toBe(60);
      } finally {
        stack200.destroy();
      }
    });

    it('レイヤー数は (枚数 - 1) で、最大 30 で頭打ち', () => {
      const stack5 = makeStackWithCards(5);
      fixture.componentRef.setInput('cardStack', stack5);
      try {
        expect(readLayers()).toHaveLength(4);
      } finally {
        stack5.destroy();
      }

      const stack200 = makeStackWithCards(200);
      fixture.componentRef.setInput('cardStack', stack200);
      try {
        expect(readLayers()).toHaveLength(30);
      } finally {
        stack200.destroy();
      }
    });

    it('レイヤーは2色高コントラストの交互配色で z は厚みを等分する', () => {
      const stack = makeStackWithCards(10);
      fixture.componentRef.setInput('cardStack', stack);
      try {
        const layers = readLayers();
        const thickness = readThickness();
        expect(layers[0].bg).toBe('#f5efe2');
        expect(layers[1].bg).toBe('#2a1f0d');
        expect(layers[0].z).toBe(0);
        expect(layers[layers.length - 1].z).toBeCloseTo(thickness * ((layers.length - 1) / layers.length));
      } finally {
        stack.destroy();
      }
    });

    it('mode2d では厚みもレイヤーも省略される', () => {
      const stack = makeStackWithCards(20);
      fixture.componentRef.setInput('cardStack', stack);
      const tabletop = TestBed.inject(TabletopService);
      const original = tabletop.mode2d;
      Object.defineProperty(tabletop, 'mode2d', { value: () => true, configurable: true });
      try {
        expect(readThickness()).toBe(0);
        expect(readLayers()).toEqual([]);
      } finally {
        Object.defineProperty(tabletop, 'mode2d', { value: original, configurable: true });
        stack.destroy();
      }
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
