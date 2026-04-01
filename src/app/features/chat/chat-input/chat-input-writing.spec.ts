import { PeerCursor } from '@axe/domain/peer/peer-cursor';

import { WritingPeerManager } from './chat-input-writing';

describe('WritingPeerManager', () => {
  let manager: WritingPeerManager;

  beforeEach(() => {
    vi.useFakeTimers();
    manager = new WritingPeerManager();
    vi.spyOn(PeerCursor, 'findByPeerId').mockImplementation((peerId) => {
      return { name: `User(${peerId})` } as PeerCursor;
    });
  });

  afterEach(() => {
    manager.destroy();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('add()', () => {
    it('初回追加で即座に names に反映される', () => {
      manager.add('peer-1');
      expect(manager.names()).toEqual(['User(peer-1)']);
    });

    it('同じ peerId を再度 add しても names は重複しない', () => {
      manager.add('peer-1');
      manager.add('peer-1');
      expect(manager.names()).toEqual(['User(peer-1)']);
    });

    it('複数の peerId を add すると全員が names に入る', () => {
      manager.add('peer-1');
      manager.add('peer-2');
      expect(manager.names()).toEqual(['User(peer-1)', 'User(peer-2)']);
    });

    it('2秒後にタイムアウトで自動削除される', () => {
      manager.add('peer-1');
      expect(manager.names()).toEqual(['User(peer-1)']);

      vi.advanceTimersByTime(2000);
      expect(manager.names()).toEqual([]);
    });

    it('再度 add するとタイムアウトがリセットされる', () => {
      manager.add('peer-1');
      vi.advanceTimersByTime(1500);
      manager.add('peer-1'); // リセット
      vi.advanceTimersByTime(1500);
      // 最初の add から 3000ms 経過しているが、2回目の add でリセットされたのでまだ残る
      expect(manager.names()).toEqual(['User(peer-1)']);

      vi.advanceTimersByTime(500); // 2回目の add から合計 2000ms
      expect(manager.names()).toEqual([]);
    });
  });

  describe('remove()', () => {
    it('remove すると即座に names から消える', () => {
      manager.add('peer-1');
      manager.add('peer-2');
      manager.remove('peer-1');
      expect(manager.names()).toEqual(['User(peer-2)']);
    });

    it('存在しない peerId を remove しても例外を投げない', () => {
      expect(() => manager.remove('nonexistent')).not.toThrow();
    });

    it('remove 後はタイムアウトが発火しない', () => {
      manager.add('peer-1');
      manager.remove('peer-1');
      vi.advanceTimersByTime(2000);
      expect(manager.names()).toEqual([]);
    });
  });

  describe('destroy()', () => {
    it('destroy 後はタイムアウトが発火せず names は変化しない', () => {
      manager.add('peer-1');
      manager.destroy();
      vi.advanceTimersByTime(2000);
      // destroy 後は空 (peers.clear() 済み) だが、タイムアウトコールバックが走っても問題ない
      expect(manager.names()).toEqual(['User(peer-1)']);
    });
  });
});
