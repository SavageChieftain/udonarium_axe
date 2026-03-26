import { PeerContext } from '@axe/core/network/peer-context';

import { SkyWayDataStream } from './skyway-data-stream';

export class SkyWayDataStreamList implements Iterable<SkyWayDataStream> {
  private streams: SkyWayDataStream[] = [];
  get length(): number {
    return this.streams.length;
  }

  [Symbol.iterator]() {
    const streams = [...this.streams];
    let index = 0;
    return {
      next(): IteratorResult<SkyWayDataStream> {
        return { value: streams[index++], done: streams.length + 1 <= index };
      },
    };
  }

  private needsRefreshPeers = false;
  private _peers: PeerContext[] = [];
  get peers(): PeerContext[] {
    if (this.needsRefreshPeers) {
      this.needsRefreshPeers = false;
      this._peers = this.streams.map((stream) => stream.peer);
      this._peers.sort((a, b) => {
        if (a.peerId > b.peerId) return 1;
        if (a.peerId < b.peerId) return -1;
        return 0;
      });
    }
    return this._peers;
  }

  private needsRefreshPeerIds = false;
  private _peerIds: string[] = [];
  get peerIds(): string[] {
    if (this.needsRefreshPeerIds) {
      this.needsRefreshPeerIds = false;
      const peerIds: string[] = [];
      for (const stream of this.streams) {
        if (stream.open) peerIds.push(stream.peer.peerId);
      }
      peerIds.sort((a, b) => {
        if (a > b) return 1;
        if (a < b) return -1;
        return 0;
      });
      this._peerIds = peerIds;
    }
    return this._peerIds;
  }

  add(stream: SkyWayDataStream): SkyWayDataStream {
    const existStream = this.find(stream.peer.peerId);
    if (existStream) {
      if (existStream !== stream) {
        if (existStream.sortKey < stream.sortKey) {
          stream.removeAllListeners();
          stream.disconnect();
          this.remove(stream);
        } else {
          existStream.removeAllListeners();
          existStream.disconnect();
          this.remove(existStream);
          return this.add(stream);
        }
      }
      return null!;
    }
    this.streams.push(stream);
    this.refresh();
    return stream;
  }

  remove(stream: SkyWayDataStream): SkyWayDataStream {
    const index = this.streams.indexOf(stream);
    if (0 <= index) {
      this.streams.splice(index, 1);
      this.refresh();
    }
    return 0 <= index ? stream : null!;
  }

  find(peerId: string): SkyWayDataStream {
    return this.streams.find((stream) => stream.peer.peerId === peerId)!;
  }

  refresh() {
    this.needsRefreshPeers = true;
    this.needsRefreshPeerIds = true;
  }
}
