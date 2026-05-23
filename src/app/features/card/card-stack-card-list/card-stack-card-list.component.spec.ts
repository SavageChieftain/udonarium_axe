import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalService } from '@axe/application/ui/modal.service';
import { Card } from '@axe/domain/card/card';
import { CardStack } from '@axe/domain/card/card-stack';
import { CardStackCardListComponent } from '@axe/features/card/card-stack-card-list/card-stack-card-list.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('CardStackCardListComponent', () => {
  let component: CardStackCardListComponent;
  let fixture: ComponentFixture<CardStackCardListComponent>;
  let stack: CardStack;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [CardStackCardListComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    stack = CardStack.create('テスト山札');
    stack.putOnBottom(Card.create('A', './assets/images/trump/s01.gif', './assets/images/trump/z02.gif'));
    stack.putOnBottom(Card.create('B', './assets/images/trump/h13.gif', './assets/images/trump/z02.gif'));

    fixture = TestBed.createComponent(CardStackCardListComponent);
    fixture.componentRef.setInput('cardStack', stack);
    component = fixture.componentInstance;
  });

  it('should be created and render the card rows', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.cards().length).toBe(2);
  });

  it('cardName が現在の Card.name を返すこと', () => {
    expect(component.cardName(stack.cards[0])).toBe('A');
  });

  it('setCardName が input の値を Card.name に反映すること', () => {
    const event = { target: { value: 'ハートのエース' } } as unknown as Event;
    component.setCardName(stack.cards[0], event);
    expect(stack.cards[0].name).toBe('ハートのエース');
  });

  it('cardImageHint がトランプ画像コードを読みやすいラベルに整形すること', () => {
    expect(component.cardImageHint(stack.cards[0])).toBe('♠1');
    expect(component.cardImageHint(stack.cards[1])).toBe('♥King');
  });

  it('cardImageHint がトランプ以外のコードはファイル名の basename にフォールバックすること', () => {
    stack.putOnBottom(Card.create('custom', './assets/images/custom/dragon.png', ''));
    const customCard = stack.cards[stack.cards.length - 1];
    expect(component.cardImageHint(customCard)).toBe('dragon');
  });

  it('cardImageHint が frontImage が無くてもクラッシュしないこと', () => {
    const naked = Card.create('c', '', '');
    expect(() => component.cardImageHint(naked)).not.toThrow();
  });

  it('drawCard はカードを cardRoot から取り除くこと', () => {
    const target = stack.cards[0];
    component.drawCard(target);
    expect(stack.cards.includes(target)).toBe(false);
  });

  describe('drag & drop reorder (pointer events)', () => {
    const captureTarget = (): Element =>
      ({
        setPointerCapture: vi.fn(),
        releasePointerCapture: vi.fn(),
      }) as unknown as Element;

    const startDrag = (card: Card, pointerId = 1): Element => {
      const target = captureTarget();
      component.onPointerDown(
        {
          pointerType: 'mouse',
          button: 0,
          pointerId,
          preventDefault: vi.fn(),
          currentTarget: target,
        } as unknown as PointerEvent,
        card
      );
      return target;
    };

    const hoverOver = (overCard: Card, where: 'top' | 'bottom', pointerId = 1): void => {
      const rect = { top: 100, bottom: 200, height: 100, left: 0, right: 200, width: 200, x: 0, y: 100 } as DOMRect;
      const clientY = where === 'top' ? rect.top + 10 : rect.top + rect.height - 10;
      const row = document.createElement('div');
      row.setAttribute('data-card-id', overCard.identifier);
      vi.spyOn(row, 'getBoundingClientRect').mockReturnValue(rect);
      (document as Document & { elementsFromPoint: (x: number, y: number) => Element[] }).elementsFromPoint = () => [
        row,
      ];
      component.onPointerMove({ pointerType: 'mouse', pointerId, clientX: 50, clientY } as unknown as PointerEvent);
    };

    const release = (target: Element, pointerId = 1): void => {
      component.onPointerUp({ pointerType: 'mouse', pointerId, currentTarget: target } as unknown as PointerEvent);
    };

    it('右マウスボタンではドラッグを開始しないこと', () => {
      const target = captureTarget();
      component.onPointerDown(
        {
          pointerType: 'mouse',
          button: 2,
          pointerId: 1,
          preventDefault: vi.fn(),
          currentTarget: target,
        } as unknown as PointerEvent,
        stack.cards[0]
      );
      expect(component.draggedCardId()).toBeNull();
    });

    it('onPointerDown は draggedCardId を設定し pointer capture すること', () => {
      const target = startDrag(stack.cards[0]);
      expect(component.draggedCardId()).toBe(stack.cards[0].identifier);
      expect(target.setPointerCapture).toHaveBeenCalledWith(1);
    });

    it('isDropBefore / isDropAfter は dropPosition と一致するときだけ true', () => {
      const [a, b] = stack.cards;
      component.draggedCardId.set(a.identifier);
      component.dragOverCardId.set(b.identifier);
      component.dropPosition.set('before');
      expect(component.isDropBefore(b)).toBe(true);
      expect(component.isDropAfter(b)).toBe(false);
      component.dropPosition.set('after');
      expect(component.isDropBefore(b)).toBe(false);
      expect(component.isDropAfter(b)).toBe(true);
    });

    it('上半分ドロップで target の前に挿入されること', () => {
      const [first, second] = stack.cards;
      const target = startDrag(second);
      hoverOver(first, 'top');
      release(target);
      expect(stack.cards[0]).toBe(second);
      expect(stack.cards[1]).toBe(first);
    });

    it('下半分ドロップで target の後ろに挿入されること', () => {
      stack.putOnBottom(Card.create('C', '', ''));
      const [first, , third] = stack.cards;
      const target = startDrag(first);
      hoverOver(third, 'bottom');
      release(target);
      expect(stack.cards[stack.cards.length - 1]).toBe(first);
    });

    it('自分自身へのドロップは並びを変えないこと', () => {
      const original = stack.cards.map((c) => c.identifier);
      const card = stack.cards[0];
      const target = startDrag(card);
      hoverOver(card, 'top');
      release(target);
      expect(stack.cards.map((c) => c.identifier)).toEqual(original);
    });

    it('onPointerCancel は state をリセットすること', () => {
      const target = startDrag(stack.cards[0]);
      component.dragOverCardId.set('x');
      component.dropPosition.set('after');
      component.onPointerCancel({
        pointerType: 'mouse',
        pointerId: 1,
        currentTarget: target,
      } as unknown as PointerEvent);
      expect(component.draggedCardId()).toBeNull();
      expect(component.dragOverCardId()).toBeNull();
      expect(component.dropPosition()).toBeNull();
    });
  });

  describe('setImage', () => {
    it('FileSelecterComponent から返った id を front の DataElement にセットすること', async () => {
      const modal = TestBed.inject(ModalService);
      vi.spyOn(modal, 'open').mockResolvedValue('img-front-123');
      const card = stack.cards[0];
      component.setImage(card, 'front');
      await Promise.resolve();
      const el = card.imageDataElement?.getFirstElementByName('front');
      expect(el?.value).toBe('img-front-123');
    });

    it('FileSelecterComponent から返った id を back の DataElement にセットすること', async () => {
      const modal = TestBed.inject(ModalService);
      vi.spyOn(modal, 'open').mockResolvedValue('img-back-456');
      const card = stack.cards[0];
      component.setImage(card, 'back');
      await Promise.resolve();
      const el = card.imageDataElement?.getFirstElementByName('back');
      expect(el?.value).toBe('img-back-456');
    });

    it('null が返ったら DataElement を変更しないこと', async () => {
      const modal = TestBed.inject(ModalService);
      vi.spyOn(modal, 'open').mockResolvedValue(null as unknown as string);
      const card = stack.cards[0];
      const before = card.imageDataElement?.getFirstElementByName('front')?.value;
      component.setImage(card, 'front');
      await Promise.resolve();
      expect(card.imageDataElement?.getFirstElementByName('front')?.value).toBe(before);
    });
  });
});
