import { TestBed } from '@angular/core/testing';
import { ObjectStore } from '@axe/core/sync/object-store';
import { Card } from '@axe/domain/card/card';
import { CardStack } from '@axe/domain/card/card-stack';
import { GameTable } from '@axe/domain/tabletop/game-table';
import { GameTableMask } from '@axe/domain/tabletop/game-table-mask';
import {
  asOwnable,
  clearOwnership,
  clearOwnershipTree,
  findOrphanedOwnership,
  releaseOrphanedOwnership,
} from '@axe/domain/tabletop/ownership';

describe('ownership', () => {
  let store: ObjectStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = ObjectStore.instance;
    store.getObjects().forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
  });

  afterEach(() => {
    store.getObjects().forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
  });

  describe('asOwnable', () => {
    it('OwnedTabletopObject と GameTableMask を所有可能とみなす', () => {
      expect(asOwnable(new Card())).toBeInstanceOf(Card);
      expect(asOwnable(new GameTableMask())).toBeInstanceOf(GameTableMask);
    });

    it('所有概念のないオブジェクトは null', () => {
      expect(asOwnable(new GameTable())).toBeNull();
      expect(asOwnable(null)).toBeNull();
    });
  });

  describe('clearOwnership', () => {
    it('所有者のあるオブジェクトのみ owner を空にし、件数を返す', () => {
      const card = new Card();
      card.owner = 'user-1';
      const mask = new GameTableMask();
      mask.owner = 'user-2';
      const unowned = new Card();
      const table = new GameTable();

      const cleared = clearOwnership([card, mask, unowned, table]);

      expect(cleared).toBe(2);
      expect(card.owner).toBe('');
      expect(mask.owner).toBe('');
    });
  });

  describe('clearOwnershipTree', () => {
    it('親と子孫の owner をまとめて空にする', () => {
      const stack = CardStack.create('デッキ');
      stack.owner = 'user-1';
      const child = Card.create('カード', 'front.png', 'back.png');
      child.owner = 'user-2';
      stack.appendChild(child);

      const cleared = clearOwnershipTree(stack);

      expect(cleared).toBe(2);
      expect(stack.owner).toBe('');
      expect(child.owner).toBe('');
    });
  });

  describe('findOrphanedOwnership / releaseOrphanedOwnership', () => {
    const peers = [
      { userId: 'online-user', isOpen: true },
      { userId: 'closed-user', isOpen: false },
    ];

    it('接続中のオーナーは除外し、不在/切断オーナーのみ抽出する', () => {
      const online = new Card();
      online.owner = 'online-user';
      const absent = new Card();
      absent.owner = 'ghost-user';
      const closed = new GameTableMask();
      closed.owner = 'closed-user';
      const unowned = new Card();

      const orphaned = findOrphanedOwnership([online, absent, closed, unowned], peers);

      expect(orphaned).toContain(absent);
      expect(orphaned).toContain(closed);
      expect(orphaned).not.toContain(online);
      expect(orphaned).toHaveLength(2);
    });

    it('オフラインオーナーの所有だけを解放し、接続中は維持する', () => {
      const online = new Card();
      online.owner = 'online-user';
      const absent = new Card();
      absent.owner = 'ghost-user';

      const released = releaseOrphanedOwnership([online, absent], peers);

      expect(released).toBe(1);
      expect(absent.owner).toBe('');
      expect(online.owner).toBe('online-user');
    });
  });
});
