import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RoomSnapshotService } from '@axe/application/file/room-snapshot.service';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { RolePermissionService } from '@axe/application/permission/role-permission.service';
import { confirmDialog } from '@axe/core/input/confirm-dialog';
import { RoomSnapshotMeta } from '@axe/core/storage/room-snapshot-store';
import { formatSnapshotByteSize, formatSnapshotSavedAt } from '@axe/features/room-archive/snapshot-format';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-room-snapshot-panel',
  templateUrl: './room-snapshot-panel.component.html',
  imports: [TranslocoModule],
})
export class RoomSnapshotPanelComponent {
  private readonly roomSnapshot = inject(RoomSnapshotService);
  private readonly rolePermission = inject(RolePermissionService);
  private readonly t = inject(TRANSLATE_FN);

  protected readonly snapshots = this.roomSnapshot.snapshots;
  protected readonly isCapturing = this.roomSnapshot.isCapturing;
  protected readonly isRestoring = this.roomSnapshot.isRestoring;
  protected readonly isSupported = this.roomSnapshot.isSupported;

  protected readonly totalSizeLabel = computed(() =>
    formatSnapshotByteSize(this.snapshots().reduce((total, meta) => total + meta.byteSize, 0))
  );

  constructor() {
    void this.roomSnapshot.refresh();
  }

  protected get canEdit(): boolean {
    return this.rolePermission.canEditTabletop;
  }

  protected savedAtLabel(meta: RoomSnapshotMeta): string {
    return formatSnapshotSavedAt(meta.savedAt);
  }

  protected byteSizeLabel(meta: RoomSnapshotMeta): string {
    return formatSnapshotByteSize(meta.byteSize);
  }

  protected async captureNow(): Promise<void> {
    if (!this.canEdit) return;
    await this.roomSnapshot.capture();
  }

  protected async restore(meta: RoomSnapshotMeta): Promise<void> {
    if (!this.canEdit) return;
    if (!confirmDialog(this.t('feature.roomArchive.panel.restoreConfirm', { savedAt: this.savedAtLabel(meta) })))
      return;
    await this.roomSnapshot.restore(meta.id);
  }

  protected async remove(meta: RoomSnapshotMeta): Promise<void> {
    if (!this.canEdit) return;
    if (!confirmDialog(this.t('feature.roomArchive.panel.removeConfirm', { savedAt: this.savedAtLabel(meta) }))) return;
    await this.roomSnapshot.remove(meta.id);
  }

  protected async clearAll(): Promise<void> {
    if (!this.canEdit) return;
    if (!confirmDialog(this.t('feature.roomArchive.panel.clearConfirm'))) return;
    await this.roomSnapshot.clear();
  }
}
