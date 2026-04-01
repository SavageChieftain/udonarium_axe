import { signal } from '@angular/core';
import { ResettableTimeout } from '@axe/core/util/resettable-timeout';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';

export class WritingPeerManager {
  private readonly peers: Map<string, ResettableTimeout> = new Map();
  readonly names = signal<string[]>([]);

  add(peerId: string): void {
    if (!this.peers.has(peerId)) {
      this.peers.set(
        peerId,
        new ResettableTimeout(() => {
          this.peers.delete(peerId);
          this.updateNames();
        }, 2000)
      );
      this.updateNames();
    }
    this.peers.get(peerId)!.reset();
  }

  remove(peerId: string): void {
    if (!this.peers.has(peerId)) return;
    this.peers.get(peerId)!.stop();
    this.peers.delete(peerId);
    this.updateNames();
  }

  destroy(): void {
    for (const [, timeout] of this.peers) {
      timeout.stop();
    }
    this.peers.clear();
  }

  private updateNames(): void {
    this.names.set(
      Array.from(this.peers.keys()).map((peerId) => {
        const peer = PeerCursor.findByPeerId(peerId);
        return peer ? peer.name : '';
      })
    );
  }
}
