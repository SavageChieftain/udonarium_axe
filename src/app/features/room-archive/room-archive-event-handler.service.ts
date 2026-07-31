import { DestroyRef, inject, Injectable } from '@angular/core';
import { RoomSnapshotService } from '@axe/application/file/room-snapshot.service';
import { RolePermissionService } from '@axe/application/permission/role-permission.service';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';

const IDLE_DELAY_MS = 20_000;
const MAX_DELAY_MS = 180_000;

@Injectable({ providedIn: 'root' })
export class RoomArchiveEventHandlerService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly rolePermission = inject(RolePermissionService);
  private readonly roomSnapshot = inject(RoomSnapshotService);

  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private maxTimer: ReturnType<typeof setTimeout> | null = null;
  private isDirty = false;

  constructor() {
    this.objectChange.objectChanged$.subscribe(() => this.markDirty(), this.destroyRef);
    this.objectChange.objectAdded$.subscribe(() => this.markDirty(), this.destroyRef);
    this.objectChange.objectRemoved$.subscribe(() => this.markDirty(), this.destroyRef);
    this.destroyRef.onDestroy(() => this.clearTimers());
  }

  async flush(): Promise<void> {
    this.clearTimers();
    if (!this.isDirty) return;
    if (!this.rolePermission.canEditTabletop) return;
    if (this.roomSnapshot.isRestoring()) {
      this.markDirty();
      return;
    }
    this.isDirty = false;
    await this.roomSnapshot.capture();
  }

  private markDirty(): void {
    if (!this.roomSnapshot.isSupported) return;
    this.isDirty = true;
    if (this.idleTimer !== null) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => void this.flush(), IDLE_DELAY_MS);
    if (this.maxTimer === null) this.maxTimer = setTimeout(() => void this.flush(), MAX_DELAY_MS);
  }

  private clearTimers(): void {
    if (this.idleTimer !== null) clearTimeout(this.idleTimer);
    if (this.maxTimer !== null) clearTimeout(this.maxTimer);
    this.idleTimer = null;
    this.maxTimer = null;
  }
}
