import { IPeerContext } from '@axe/core/network/peer-context';
import {
  getMyPeerId,
  getPeerContext,
  getPeerContexts,
  getPeerIds,
  resetPeerContextProvider,
  setPeerContextProvider,
} from '@axe/core/network/peer-context-source';
import { PeerSessionGrade } from '@axe/core/network/peer-session-state';

function makeContext(peerId: string, userId: string = peerId): IPeerContext {
  return {
    peerId,
    userId,
    roomId: '',
    roomName: '',
    password: '',
    digestUserId: '',
    digestRoomName: '',
    digestPassword: '',
    isOpen: true,
    isRoom: false,
    hasPassword: false,
    session: { grade: PeerSessionGrade.UNSPECIFIED, name: '', isVisitor: false } as never,
  };
}

describe('peer-context-source', () => {
  afterEach(() => {
    resetPeerContextProvider();
  });

  it('setPeerContextProvider でスタブ実装に差し替えられる', () => {
    const self = makeContext('peer-self', 'user-self');
    const peer = makeContext('peer-other', 'user-other');
    setPeerContextProvider({
      peerContext: self,
      peerContexts: [self, peer],
      peerIds: [self.peerId, peer.peerId],
      peerId: self.peerId,
    });

    expect(getPeerContext()).toBe(self);
    expect(getPeerContexts()).toHaveLength(2);
    expect(getPeerIds()).toEqual([self.peerId, peer.peerId]);
    expect(getMyPeerId()).toBe('peer-self');
  });

  it('resetPeerContextProvider で既定（Network 委譲）に戻る', () => {
    const self = makeContext('peer-stub');
    setPeerContextProvider({
      peerContext: self,
      peerContexts: [self],
      peerIds: [self.peerId],
      peerId: self.peerId,
    });
    expect(getMyPeerId()).toBe('peer-stub');

    resetPeerContextProvider();
    // 既定実装は Network シングルトンへ委譲する — テスト環境では peerId は空文字
    // （Network が未接続のため）。差し替えが解除されていることだけ確認する。
    expect(getMyPeerId()).not.toBe('peer-stub');
  });
});
