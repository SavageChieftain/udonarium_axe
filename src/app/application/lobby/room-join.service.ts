import { DestroyRef, inject, Injectable } from '@angular/core';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { Network } from '@axe/core/index';
import { IPeerContext, PeerContext } from '@axe/core/network/peer-context';
import { IRoomInfo } from '@axe/core/network/room-info';
import { ObjectStore } from '@axe/core/sync/object-store';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';

const JOIN_TIMEOUT_MS = 15_000;

@Injectable({ providedIn: 'root' })
export class RoomJoinService {
  private readonly objectChange = inject(ObjectChangeService);
  private readonly objectStore = inject(ObjectStore);
  private readonly destroyRef = inject(DestroyRef);

  async findRoom(roomId: string): Promise<IRoomInfo | null> {
    const rooms = await Network.listAllRooms();
    return rooms.find((room) => room.id === roomId) ?? null;
  }

  join(peerContexts: readonly IPeerContext[], password: string): Promise<boolean> {
    const context = peerContexts[0];
    if (!context) return Promise.resolve(false);

    const userId = Network.peerContext ? Network.peerContext.userId : PeerContext.generateUserId();
    Network.open(userId, context.roomId, context.roomName, password);
    PeerCursor.myCursor.peerId = Network.peerId;

    return new Promise<boolean>((resolve) => {
      const triedPeerIds = new Set<string>();
      let timer: ReturnType<typeof setTimeout> | null = null;
      let isSettled = false;

      const offOpen = this.objectChange.networkOpen$.subscribe(() => {
        offOpen();
        this.objectStore.clearDeleteHistory();
        for (const peerContext of peerContexts) {
          Network.connect(peerContext);
        }
      }, this.destroyRef);

      const settle = (): void => {
        if (isSettled) return;
        isSettled = true;
        if (timer !== null) clearTimeout(timer);
        offOpen();
        offConnect();
        offDisconnect();
        this.resetNetwork();
        resolve(Network.peerContexts.length > 0);
      };

      const onTried = (event: { peerId: string }): void => {
        triedPeerIds.add(event.peerId);
        if (triedPeerIds.size < peerContexts.length) return;
        settle();
      };

      const offConnect = this.objectChange.peerConnect$.subscribe(onTried, this.destroyRef);
      const offDisconnect = this.objectChange.peerDisconnect$.subscribe(onTried, this.destroyRef);

      timer = setTimeout(settle, JOIN_TIMEOUT_MS);
      this.destroyRef.onDestroy(() => {
        if (timer !== null) clearTimeout(timer);
      });
    });
  }

  private resetNetwork(): void {
    if (Network.peerContexts.length < 1) {
      Network.openStandby();
      PeerCursor.myCursor.peerId = Network.peerId;
    }
  }
}
