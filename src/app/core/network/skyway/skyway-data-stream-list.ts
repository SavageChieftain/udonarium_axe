import { PeerContext } from '@axe/core/network/peer-context';
import { SkyWayDataStream } from '@axe/core/network/skyway/skyway-data-stream';

export class SkyWayDataStreamList implements Iterable<SkyWayDataStream> {
  private streams: SkyWayDataStream[] = [];
  get length(): number {
    return this.streams.length;
  }

  [Symbol.iterator]() {
    return [...this.streams][Symbol.iterator]();
  }

  private needsRefreshPeers = false;
  private _peers: PeerContext[] = [];
  get peers(): PeerContext[] {
    if (this.needsRefreshPeers) {
      this.needsRefreshPeers = false;
      this._peers = this.streams.map((stream) => stream.peer);
      this._peers.sort((a, b) => a.peerId.localeCompare(b.peerId));
    }
    return this._peers;
  }

  private needsRefreshPeerIds = false;
  private _peerIds: string[] = [];
  get peerIds(): string[] {
    if (this.needsRefreshPeerIds) {
      this.needsRefreshPeerIds = false;
      this._peerIds = this.streams
        .filter((s) => s.open)
        .map((s) => s.peer.peerId)
        .sort((a, b) => a.localeCompare(b));
    }
    return this._peerIds;
  }

  add(stream: SkyWayDataStream): SkyWayDataStream | null {
    const existStream = this.find(stream.peer.peerId);
    if (existStream) {
      if (existStream !== stream) {
        if (existStream.sortKey < stream.sortKey) {
          stream.removeAllListeners();
          stream.disconnect();
        } else {
          existStream.removeAllListeners();
          existStream.disconnect();
          this.remove(existStream);
          return this.add(stream);
        }
      }
      return null;
    }
    this.streams.push(stream);
    this.refresh();
    return stream;
  }

  remove(stream: SkyWayDataStream): SkyWayDataStream | null {
    const index = this.streams.indexOf(stream);
    if (index < 0) return null;
    this.streams.splice(index, 1);
    this.refresh();
    return stream;
  }

  find(peerId: string): SkyWayDataStream | undefined {
    return this.streams.find((stream) => stream.peer.peerId === peerId);
  }

  refresh() {
    this.needsRefreshPeers = true;
    this.needsRefreshPeerIds = true;
  }
}
