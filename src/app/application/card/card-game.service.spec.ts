import { TestBed } from '@angular/core/testing';
import { CardGameService } from '@axe/application/card/card-game.service';
import { ChatMessageService } from '@axe/application/chat/chat-message.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { Card } from '@axe/domain/card/card';
import { CardStack } from '@axe/domain/card/card-stack';
import { handLocationOf } from '@axe/domain/card/hand-location';
import { ChatMessage } from '@axe/domain/chat/chat-message';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { PeerRole } from '@axe/domain/peer/peer-role';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('CardGameService', () => {
  let service: CardGameService;
  let sendSystemMessage: ReturnType<typeof vi.fn>;
  const created: { destroy(): void }[] = [];

  function trumpCard(code: string): Card {
    const card = Card.create('カード', `./assets/images/trump/${code}.gif`, './assets/images/trump/z01.gif');
    created.push(card);
    return card;
  }

  function peer(userId: string, name: string, role: PeerRole = PeerRole.Player): PeerCursor {
    const cursor = new PeerCursor();
    cursor.userId = userId;
    cursor.peerId = `peer-${userId}`;
    cursor.name = name;
    cursor.role = role;
    cursor.initialize();
    created.push(cursor);
    return cursor;
  }

  beforeEach(() => {
    PeerCursor.createMyCursor();
    PeerCursor.myCursor.userId = 'me';
    PeerCursor.myCursor.name = 'わたし';
    PeerCursor.myCursor.role = PeerRole.Player;
    TestBed.configureTestingModule({ providers: [...TEST_PROVIDERS] });
    service = TestBed.inject(CardGameService);
    sendSystemMessage = vi
      .spyOn(TestBed.inject(ChatMessageService), 'sendSystemMessage')
      .mockReturnValue(null as unknown as ChatMessage) as unknown as ReturnType<typeof vi.fn>;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    for (const object of created.splice(0)) object.destroy();
    for (const cursor of ObjectStore.instance.getObjects<PeerCursor>(PeerCursor)) {
      if (cursor !== PeerCursor.myCursor) ObjectStore.instance.delete(cursor, false);
    }
  });

  describe('dealAll()', () => {
    it('参加者へ配り切り、ジョーカーは 1 枚だけ配ること', () => {
      const other = peer('other', 'あいて');
      const stack = CardStack.create('山札');
      created.push(stack);
      for (const code of ['s01', 's02', 'h01', 'h02', 'x01', 'x02']) stack.putOnBottom(trumpCard(code));

      const result = service.dealAll(stack);

      expect(result).toEqual({ dealt: 5, participants: 2 });
      expect(service.handCardsOf('me').length + service.handCardsOf(other.userId).length).toBe(5);
      expect(stack.cards).toHaveLength(1);
      expect(sendSystemMessage).toHaveBeenCalledOnce();
    });

    it('手札の並び順が重ならないこと', () => {
      const stack = CardStack.create('山札');
      created.push(stack);
      for (const code of ['s01', 's02', 's03']) stack.putOnBottom(trumpCard(code));

      service.dealAll(stack);

      const orders = service.handCardsOf('me').map((card) => card.handOrder);
      expect(new Set(orders).size).toBe(orders.length);
    });

    it('見学者には配らないこと', () => {
      peer('guest', 'けんがく', PeerRole.Guest);
      const stack = CardStack.create('山札');
      created.push(stack);
      for (const code of ['s01', 's02']) stack.putOnBottom(trumpCard(code));

      const result = service.dealAll(stack);

      expect(result.participants).toBe(1);
      expect(service.handCardsOf('guest')).toHaveLength(0);
    });
  });

  describe('drawFromHand()', () => {
    it('相手の手札のカードを自分の手札へ移すこと', () => {
      const card = trumpCard('s07');
      card.toHand('other');

      expect(service.drawFromHand(card, 'あいて')).toBe(true);

      expect(card.location.name).toBe(handLocationOf('me'));
      expect(service.handCardsOf('other')).toHaveLength(0);
      expect(sendSystemMessage).toHaveBeenCalledOnce();
    });
  });

  describe('discardPairs()', () => {
    it('同じ数字の組を捨て札の山へ表向きで積むこと', () => {
      const spade = trumpCard('s07');
      const heart = trumpCard('h07');
      const odd = trumpCard('c03');
      for (const card of [spade, heart, odd]) card.toHand('me');

      const pairs = service.discardPairs(service.handCardsOf('me'));

      expect(pairs).toHaveLength(1);
      const discard = ObjectStore.instance.getObjects<CardStack>(CardStack).find((stack) => stack.name === '捨て札');
      expect(discard?.cards).toHaveLength(2);
      expect(spade.isFront).toBe(true);
      expect(service.handCardsOf('me')).toEqual([odd]);
      if (discard) created.push(discard);
    });

    it('組が無ければ何もしないこと', () => {
      const card = trumpCard('s07');
      card.toHand('me');

      expect(service.discardPairs(service.handCardsOf('me'))).toEqual([]);
      expect(sendSystemMessage).not.toHaveBeenCalled();
    });
  });
});
