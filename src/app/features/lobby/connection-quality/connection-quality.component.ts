import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
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
  host: { class: 'contents' },
  imports: [TranslocoModule],
})
export class ConnectionQualityComponent {
  private readonly objectChange = inject(ObjectChangeService);

  protected readonly isOpen = signal(false);

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

  protected readonly icon = computed(() => linkQualityIcon(this.worst()));
  protected readonly colorClass = computed(() => linkQualityColorClass(this.worst()));
  protected readonly labelKey = computed(() => linkQualityLabelKey(this.worst()));

  protected readonly qualityIcon = linkQualityIcon;
  protected readonly qualityColorClass = linkQualityColorClass;
  protected readonly qualityLabelKey = linkQualityLabelKey;

  protected toggle(): void {
    this.isOpen.update((open) => !open);
  }
}
