import { DestroyRef, inject, Injectable } from '@angular/core';
import { RolePermissionService } from '@axe/application/permission/role-permission.service';
import { ReplayPreferenceService, ReplayStartMode } from '@axe/application/replay/replay-preference.service';
import { ReplayRecorderService } from '@axe/application/replay/replay-recorder.service';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { Network } from '@axe/core/network/network';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';

export const REPLAY_AUTO_START_SETTLE_MS = 8_000;

@Injectable({ providedIn: 'root' })
export class ReplayEventHandlerService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly recorder = inject(ReplayRecorderService);
  private readonly preference = inject(ReplayPreferenceService);
  private readonly rolePermission = inject(RolePermissionService);
  private readonly objectChange = inject(ObjectChangeService);

  private settleTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.objectChange.networkOpen$.subscribe(() => this.evaluate(), this.destroyRef);
    this.objectChange.onObjectChangedForSingleAlias(PeerCursor.aliasName, () => this.evaluate(), this.destroyRef);
    this.destroyRef.onDestroy(() => this.clearTimer());
  }

  private evaluate(): void {
    if (!this.recorder.isSupported) return;

    if (this.recorder.isRecording()) {
      if (this.recorder.roomName() === currentRoomName()) return;
      this.clearTimer();
      void this.recorder.stop();
      return;
    }
    if (!this.shouldRecord()) {
      this.clearTimer();
      return;
    }

    if (this.settleTimer !== null) return;
    this.settleTimer = setTimeout(() => {
      this.settleTimer = null;
      if (this.shouldRecord() && !this.recorder.isRecording()) void this.recorder.start();
    }, REPLAY_AUTO_START_SETTLE_MS);
  }

  private shouldRecord(): boolean {
    if (this.preference.startMode() !== ReplayStartMode.Auto) return false;
    return this.rolePermission.canEditTabletop;
  }

  private clearTimer(): void {
    if (this.settleTimer === null) return;
    clearTimeout(this.settleTimer);
    this.settleTimer = null;
  }
}

function currentRoomName(): string {
  return Network.peerContext?.roomName ?? '';
}
