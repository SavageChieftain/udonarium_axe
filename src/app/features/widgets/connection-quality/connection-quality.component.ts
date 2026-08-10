import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, viewChild } from '@angular/core';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { WidgetLayoutService } from '@axe/application/ui/widget-layout.service';
import { placeWidget, rememberWidget, WIDGET_CONNECTION_QUALITY } from '@axe/application/ui/widget-place';
import { WidgetVisibilityService } from '@axe/application/ui/widget-visibility.service';
import { Network } from '@axe/core/index';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import {
  isRelayedLink,
  linkQualityColorClass,
  linkQualityIcon,
  linkQualityLabelKey,
  linkQualityOf,
  PeerLinkQuality,
  worstLinkQuality,
} from '@axe/domain/peer/peer-link-quality';
import { DraggableDirective } from '@axe/ui/directives/draggable.directive';
import { TranslocoModule } from '@jsverse/transloco';

export interface PeerLinkView {
  peerId: string;
  name: string;
  quality: PeerLinkQuality;
  ping: number;
  isRelayed: boolean;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-connection-quality',
  templateUrl: './connection-quality.component.html',
  imports: [DraggableDirective, TranslocoModule],
})
export class ConnectionQualityComponent {
  protected readonly widgets = inject(WidgetVisibilityService);
  private readonly objectChange = inject(ObjectChangeService);

  private readonly panelRef = viewChild<ElementRef<HTMLElement>>('panel');
  private readonly layout = inject(WidgetLayoutService);

  protected readonly links = computed<PeerLinkView[]>(() => {
    this.objectChange.peerStatsVersion();
    this.objectChange.networkVersion();
    return Network.peerContexts.map((peer) => ({
      peerId: peer.peerId,
      name: PeerCursor.findByPeerId(peer.peerId)?.name || peer.peerId.slice(0, 6),
      quality: linkQualityOf(peer.session, peer.isOpen),
      ping: Math.round(peer.session.ping),
      isRelayed: isRelayedLink(peer.session),
    }));
  });

  protected readonly worst = computed(() => worstLinkQuality(this.links().map((link) => link.quality)));

  protected readonly hasRelayedLink = computed(() => this.links().some((link) => link.isRelayed));

  protected rememberSpot(): void {
    const el = this.panelRef()?.nativeElement;
    if (el) rememberWidget(this.layout, WIDGET_CONNECTION_QUALITY, el);
  }

  protected readonly icon = computed(() => linkQualityIcon(this.worst()));
  protected readonly colorClass = computed(() => linkQualityColorClass(this.worst()));
  protected readonly labelKey = computed(() => linkQualityLabelKey(this.worst()));

  protected readonly qualityIcon = linkQualityIcon;
  protected readonly qualityColorClass = linkQualityColorClass;

  constructor() {
    effect((onCleanup) => {
      const el = this.panelRef()?.nativeElement;
      if (!el) return;
      placeWidget(this.layout, WIDGET_CONNECTION_QUALITY, el, () => ({
        left: Math.max(8, window.innerWidth - el.offsetWidth - 8),
        top: 96,
      }));
      onCleanup(() => rememberWidget(this.layout, WIDGET_CONNECTION_QUALITY, el));
    });
  }

  protected close(): void {
    this.widgets.connectionQuality.set(false);
  }
}
