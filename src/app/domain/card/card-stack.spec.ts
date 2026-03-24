import { TestBed } from '@angular/core/testing';
import { ObjectStore } from '@axe/core/sync/object-store';

import { Card, CardState } from './card';
import { CardStack } from './card-stack';

describe('CardStack', () => {
  let store: ObjectStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = ObjectStore.instance;
    const allObjects = store.getObjects();
    allObjects.forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
  });

  afterEach(() => {
    const allObjects = store.getObjects();
    allObjects.forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
    vi.clearAllMocks();
  });

  describe('create()', () => {
    it('名前を設定してCardStackを作成する', () => {
      const stack = CardStack.create('テストデッキ');
      expect(stack).toBeTruthy();
      expect(stack.name).toBe('テストデッキ');
    });

    it('カスタムidentifierで作成する', () => {
      const stack = CardStack.create('デッキ', 'custom-stack-id');
      expect(stack.identifier).toBe('custom-stack-id');
    });

    it('ObjectStoreに追加される', () => {
      const stack = CardStack.create('デッキ');
      expect(store.get(stack.identifier)).toBe(stack);
    });
  });

  describe('aliasName', () => {
    it('"card-stack"を返す', () => {
      const stack = CardStack.create('test');
      expect(stack.aliasName).toBe('card-stack');
    });
  });

  describe('SyncVar デフォルト値', () => {
    it('isLock がデフォルト false', () => {
      const stack = CardStack.create('test');
      expect(stack.isLock).toBe(false);
    });

    it('rotate がデフォルト 0', () => {
      const stack = CardStack.create('test');
      expect(stack.rotate).toBe(0);
    });

    it('zindex がデフォルト 0', () => {
      const stack = CardStack.create('test');
      expect(stack.zindex).toBe(0);
    });

    it('owner がデフォルト空文字', () => {
      const stack = CardStack.create('test');
      expect(stack.owner).toBe('');
    });

    it('isShowTotal がデフォルト true', () => {
      const stack = CardStack.create('test');
      expect(stack.isShowTotal).toBe(true);
    });
  });

  describe('cards', () => {
    it('空のスタックではcardsが空配列', () => {
      const stack = CardStack.create('test');
      expect(stack.cards).toEqual([]);
    });

    it('isEmptyがtrue', () => {
      const stack = CardStack.create('test');
      expect(stack.isEmpty).toBe(true);
    });
  });

  describe('putOnTop / putOnBottom', () => {
    it('putOnTopでカードをスタック上部に追加する', () => {
      const stack = CardStack.create('test');
      const card = Card.create('カード1', '', '', 2);

      stack.putOnTop(card);
      expect(stack.cards).toHaveLength(1);
      expect(stack.isEmpty).toBe(false);
    });

    it('putOnBottomでカードをスタック下部に追加する', () => {
      const stack = CardStack.create('test');
      const card = Card.create('カード1', '', '', 2);

      stack.putOnBottom(card);
      expect(stack.cards).toHaveLength(1);
    });

    it('topCardが最後に追加されたカードを返す', () => {
      const stack = CardStack.create('test');
      const card1 = Card.create('カード1', '', '', 2);
      const card2 = Card.create('カード2', '', '', 2);

      stack.putOnTop(card1);
      stack.putOnTop(card2);

      expect(stack.topCard).toBe(card2);
    });
  });

  describe('drawCard()', () => {
    it('スタックからカードを1枚引く', () => {
      const stack = CardStack.create('test');
      const card = Card.create('カード1', '', '', 2);
      stack.putOnTop(card);

      const drawn = stack.drawCard();
      expect(drawn).toBeTruthy();
      expect(stack.cards).toHaveLength(0);
    });

    it('空のスタックからはnullを返す', () => {
      const stack = CardStack.create('test');
      const drawn = stack.drawCard();
      expect(drawn).toBeFalsy();
    });
  });

  describe('drawCardAll()', () => {
    it('全カードを引く', () => {
      const stack = CardStack.create('test');
      stack.putOnTop(Card.create('c1', '', '', 2));
      stack.putOnTop(Card.create('c2', '', '', 2));
      stack.putOnTop(Card.create('c3', '', '', 2));

      const drawn = stack.drawCardAll();
      expect(drawn).toHaveLength(3);
      expect(stack.cards).toHaveLength(0);
    });
  });

  describe('shuffle()', () => {
    it('カードの順序をシャッフルする', () => {
      const stack = CardStack.create('test');
      for (let i = 0; i < 20; i++) {
        stack.putOnTop(Card.create(`c${i}`, '', '', 2));
      }

      const before = stack.cards.map((c) => c.identifier);
      stack.shuffle();
      const after = stack.cards.map((c) => c.identifier);

      // 20枚あれば同じ順序になる確率はほぼ0
      expect(after).toHaveLength(before.length);
      // 少なくとも同じカードが含まれている
      expect(after.sort()).toEqual(before.sort());
    });
  });

  describe('faceUp / faceDown', () => {
    it('faceUpAllで全カードを表にする', () => {
      const stack = CardStack.create('test');
      const card1 = Card.create('c1', '', '', 2);
      const card2 = Card.create('c2', '', '', 2);
      card1.state = CardState.BACK;
      card2.state = CardState.BACK;
      stack.putOnTop(card1);
      stack.putOnTop(card2);

      stack.faceUpAll();
      for (const card of stack.cards) {
        expect(card.state).toBe(CardState.FRONT);
      }
    });

    it('faceDownAllで全カードを裏にする', () => {
      const stack = CardStack.create('test');
      const card1 = Card.create('c1', '', '', 2);
      stack.putOnTop(card1);
      card1.state = CardState.FRONT;

      stack.faceDownAll();
      for (const card of stack.cards) {
        expect(card.state).toBe(CardState.BACK);
      }
    });
  });

  describe('hasOwner', () => {
    it('ownerが空文字ならfalse', () => {
      const stack = CardStack.create('test');
      expect(stack.hasOwner).toBe(false);
    });

    it('ownerがセットされていればtrue', () => {
      const stack = CardStack.create('test');
      stack.owner = 'user-1';
      expect(stack.hasOwner).toBe(true);
    });
  });

  describe('TabletopObject 継承', () => {
    it('locationのデフォルトがtable', () => {
      const stack = CardStack.create('test');
      expect(stack.location.name).toBe('table');
    });
  });
});
