import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RoomSnapshotService } from '@axe/application/file/room-snapshot.service';
import { RolePermissionService } from '@axe/application/permission/role-permission.service';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { Network } from '@axe/core/network/network';
import { formatSnapshotSavedAt } from '@axe/features/room-archive/snapshot-format';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-room-restore-banner',
  templateUrl: './room-restore-banner.component.html',
  imports: [TranslocoModule],
})
export class RoomRestoreBannerComponent {
  private readonly roomSnapshot = inject(RoomSnapshotService);
  private readonly rolePermission = inject(RolePermissionService);
  private readonly objectChange = inject(ObjectChangeService);

  private readonly dismissed = signal(false);

  protected readonly latest = computed(() => this.roomSnapshot.snapshots()[0] ?? null);

  protected readonly savedAtLabel = computed(() => {
    const latest = this.latest();
    return latest ? formatSnapshotSavedAt(latest.savedAt) : '';
  });

  protected readonly visible = computed(() => {
    this.objectChange.networkVersion();
    if (this.dismissed()) return false;
    if (!this.roomSnapshot.isSupported) return false;
    if (this.latest() === null) return false;
    if (Network.peerContext?.roomName) return false;
    return this.rolePermission.canEditTabletop;
  });

  protected readonly isRestoring = this.roomSnapshot.isRestoring;

  constructor() {
    void this.roomSnapshot.refresh();
  }

  protected async restore(): Promise<void> {
    const latest = this.latest();
    if (!latest) return;
    const isRestored = await this.roomSnapshot.restore(latest.id);
    if (isRestored) this.dismissed.set(true);
  }

  protected dismiss(): void {
    this.dismissed.set(true);
  }
}
