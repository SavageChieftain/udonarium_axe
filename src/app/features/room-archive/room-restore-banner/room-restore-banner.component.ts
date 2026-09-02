import { NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RoomSnapshotService } from '@axe/application/file/room-snapshot.service';
import { RolePermissionService } from '@axe/application/permission/role-permission.service';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { ViewportService } from '@axe/application/ui/viewport.service';
import { WidgetLayoutService } from '@axe/application/ui/widget-layout.service';
import { placeWidget, rememberWidget, WIDGET_ROOM_RESTORE } from '@axe/application/ui/widget-place';
import { Network } from '@axe/core/network/network';
import { parseInviteLink } from '@axe/domain/peer/invite-link';
import { formatSnapshotSavedAt } from '@axe/features/room-archive/snapshot-format';
import { DraggableDirective } from '@axe/ui/directives/draggable.directive';
import { TranslocoModule } from '@jsverse/transloco';

const TOP_MARGIN = 12;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-room-restore-banner',
  templateUrl: './room-restore-banner.component.html',
  imports: [DraggableDirective, NgClass, TranslocoModule],
})
export class RoomRestoreBannerComponent {
  private readonly roomSnapshot = inject(RoomSnapshotService);
  private readonly rolePermission = inject(RolePermissionService);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly layout = inject(WidgetLayoutService);
  protected readonly isCompact = inject(ViewportService).isCompact;

  private readonly bannerRef = viewChild<ElementRef<HTMLElement>>('banner');
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
    if (parseInviteLink(location.hash) !== null) return false;
    if (Network.peerContext?.roomName) return false;
    return this.rolePermission.canEditTabletop;
  });

  protected readonly isRestoring = this.roomSnapshot.isRestoring;

  constructor() {
    void this.roomSnapshot.refresh();

    effect((onCleanup) => {
      const element = this.bannerRef()?.nativeElement;
      if (!element || this.isCompact()) return;

      placeWidget(this.layout, WIDGET_ROOM_RESTORE, element, () => ({
        left: Math.max(8, (window.innerWidth - element.offsetWidth) / 2),
        top: TOP_MARGIN,
      }));
      onCleanup(() => rememberWidget(this.layout, WIDGET_ROOM_RESTORE, element));
    });
  }

  protected rememberSpot(): void {
    const element = this.bannerRef()?.nativeElement;
    if (element && !this.isCompact()) rememberWidget(this.layout, WIDGET_ROOM_RESTORE, element);
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
