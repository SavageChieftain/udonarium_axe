import { RoomInfo } from './room-info';
import { PeerContext } from './peer-context';

describe('RoomInfo', () => {
  describe('constructor', () => {
    it('デフォルト値で作成できる', () => {
      const room = new RoomInfo();
      expect(room.id).toBe('');
      expect(room.name).toBe('');
      expect(room.peers).toEqual([]);
    });

    it('引数を指定して作成できる', () => {
      const room = new RoomInfo('rm1', 'テストルーム', []);
      expect(room.id).toBe('rm1');
      expect(room.name).toBe('テストルーム');
    });
  });

  describe('hasPassword', () => {
    it('パスワード付きpeerがない場合false', async () => {
      const peer = await PeerContext.create('user1', 'rm', 'Room', '');
      const room = new RoomInfo('rm', 'Room', [peer]);
      expect(room.hasPassword).toBe(false);
    });

    it('パスワード付きpeerがある場合true', async () => {
      const peer = await PeerContext.create('user1', 'rm', 'Room', 'pass');
      const room = new RoomInfo('rm', 'Room', [peer]);
      expect(room.hasPassword).toBe(true);
    });
  });

  describe('listFrom', () => {
    it('空の配列に対して空を返す', () => {
      const rooms = RoomInfo.listFrom([]);
      expect(rooms).toEqual([]);
    });

    it('ルームpeerからRoomInfoリストを作成する', async () => {
      const peer1 = await PeerContext.create('user1', 'rm', 'Room1', '');
      const peer2 = await PeerContext.create('user2', 'rm', 'Room1', '');
      const rooms = RoomInfo.listFrom([peer1.peerId, peer2.peerId]);
      expect(rooms.length).toBe(1);
      expect(rooms[0].peers.length).toBe(2);
    });

    it('異なるルームは別々のRoomInfoになる', async () => {
      const peer1 = await PeerContext.create('user1', 'r1', 'RoomA', '');
      const peer2 = await PeerContext.create('user2', 'r2', 'RoomB', '');
      const rooms = RoomInfo.listFrom([peer1.peerId, peer2.peerId]);
      expect(rooms.length).toBe(2);
    });

    it('非room peerは無視される', async () => {
      const peer = await PeerContext.create('user1');
      const rooms = RoomInfo.listFrom([peer.peerId]);
      expect(rooms).toEqual([]);
    });
  });
});
