import { SkyWayDataStream } from '@axe/core/network/skyway/skyway-data-stream';
import { SkyWayDataStreamList } from '@axe/core/network/skyway/skyway-data-stream-list';

describe('SkyWayDataStreamList', () => {
  function createMockStream(peerId: string, open = true, sortKey = '') {
    return {
      peer: { peerId },
      open,
      sortKey,
      removeAllListeners: vi.fn(),
      disconnect: vi.fn(),
    } as unknown as SkyWayDataStream;
  }

  it('starts empty', () => {
    const list = new SkyWayDataStreamList();
    expect(list.length).toBe(0);
  });

  it('adds a stream', () => {
    const list = new SkyWayDataStreamList();
    const stream = createMockStream('peer-1');
    const result = list.add(stream);
    expect(result).toBe(stream);
    expect(list.length).toBe(1);
  });

  it('removes a stream', () => {
    const list = new SkyWayDataStreamList();
    const stream = createMockStream('peer-1');
    list.add(stream);
    const result = list.remove(stream);
    expect(result).toBe(stream);
    expect(list.length).toBe(0);
  });

  it('finds a stream', () => {
    const list = new SkyWayDataStreamList();
    const stream = createMockStream('peer-1');
    list.add(stream);
    expect(list.find('peer-1')).toBe(stream);
    expect(list.find('peer-2')).toBeUndefined();
  });

  it('returns the peer ids in order', () => {
    const list = new SkyWayDataStreamList();
    list.add(createMockStream('peer-c'));
    list.add(createMockStream('peer-a'));
    list.add(createMockStream('peer-b'));
    expect(list.peerIds).toEqual(['peer-a', 'peer-b', 'peer-c']);
  });

  it('returns the peers in order', () => {
    const list = new SkyWayDataStreamList();
    list.add(createMockStream('peer-2'));
    list.add(createMockStream('peer-1'));
    const peers = list.peers;
    expect(peers[0].peerId).toBe('peer-1');
    expect(peers[1].peerId).toBe('peer-2');
  });

  it('returns nothing when adding the same one twice', () => {
    const list = new SkyWayDataStreamList();
    const stream = createMockStream('peer-1', true, 'aaa');
    list.add(stream);
    const result = list.add(stream);
    expect(result).toBeNull();
  });

  it('can be iterated', () => {
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
