import { DestroyRef, inject, Injectable } from '@angular/core';
import { ReplayRecorderService } from '@axe/application/replay/replay-recorder.service';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { Network } from '@axe/core/network/network';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';

@Injectable({ providedIn: 'root' })
export class ReplayEventHandlerService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly recorder = inject(ReplayRecorderService);
  private readonly objectChange = inject(ObjectChangeService);

  constructor() {
    this.objectChange.networkOpen$.subscribe(() => this.evaluate(), this.destroyRef);
    this.objectChange.onObjectChangedForSingleAlias(PeerCursor.aliasName, () => this.evaluate(), this.destroyRef);
  }

  private evaluate(): void {
    if (!this.recorder.isRecording()) return;
    if (this.recorder.roomName() === currentRoomName()) return;
    void this.recorder.stop();
  }
}

function currentRoomName(): string {
  return Network.peerContext?.roomName ?? '';
}
