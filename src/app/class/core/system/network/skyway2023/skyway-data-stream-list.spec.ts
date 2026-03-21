import { vi, describe, it, expect } from 'vitest';
import { SkyWayDataStreamList } from './skyway-data-stream-list';

describe('SkyWayDataStreamList', () => {
  function createMockStream(peerId: string, open = true, sortKey = '') {
    return {
      peer: { peerId },
      open,
      sortKey,
      removeAllListeners: vi.fn(),
      disconnect: vi.fn(),
    } as any;
  }

  it('初期状態でlength=0', () => {
    const list = new SkyWayDataStreamList();
    expect(list.length).toBe(0);
  });

  it('addでストリームを追加できる', () => {
    const list = new SkyWayDataStreamList();
    const stream = createMockStream('peer-1');
    const result = list.add(stream);
    expect(result).toBe(stream);
    expect(list.length).toBe(1);
  });

  it('removeでストリームを削除できる', () => {
    const list = new SkyWayDataStreamList();
    const stream = createMockStream('peer-1');
    list.add(stream);
    const result = list.remove(stream);
    expect(result).toBe(stream);
    expect(list.length).toBe(0);
  });

  it('findで検索できる', () => {
    const list = new SkyWayDataStreamList();
    const stream = createMockStream('peer-1');
    list.add(stream);
    expect(list.find('peer-1')).toBe(stream);
    expect(list.find('peer-2')).toBeUndefined();
  });

  it('peerIdsがソートされて返る', () => {
    const list = new SkyWayDataStreamList();
    list.add(createMockStream('peer-c'));
    list.add(createMockStream('peer-a'));
    list.add(createMockStream('peer-b'));
    expect(list.peerIds).toEqual(['peer-a', 'peer-b', 'peer-c']);
  });

  it('peersがソートされて返る', () => {
    const list = new SkyWayDataStreamList();
    list.add(createMockStream('peer-2'));
    list.add(createMockStream('peer-1'));
    const peers = list.peers;
    expect(peers[0].peerId).toBe('peer-1');
    expect(peers[1].peerId).toBe('peer-2');
  });

  it('重複追加はnullを返す', () => {
    const list = new SkyWayDataStreamList();
    const stream = createMockStream('peer-1', true, 'aaa');
    list.add(stream);
    const result = list.add(stream);
    expect(result).toBeNull();
  });

  it('イテレータでfor-ofが使える', () => {
    const list = new SkyWayDataStreamList();
    list.add(createMockStream('peer-1'));
    list.add(createMockStream('peer-2'));
    const ids: string[] = [];
    for (const stream of list) {
      ids.push(stream.peer.peerId);
    }
    expect(ids).toHaveLength(2);
  });
});
