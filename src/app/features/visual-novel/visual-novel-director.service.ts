import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { getMyPeerId } from '@axe/core/network/peer-context-source';
import { ObjectStore } from '@axe/core/sync/object-store';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { VnStage } from '@axe/domain/visual-novel/vn-stage';
import { VisualNovelPlaybackService } from '@axe/features/visual-novel/visual-novel-playback.service';

const STAGE_IDENTIFIER = 'VnStage';

@Injectable({ providedIn: 'root' })
export class VisualNovelDirectorService {
  private readonly objectStore = inject(ObjectStore);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly playback = inject(VisualNovelPlaybackService);

  private readonly _following = signal(true);

  readonly following = this._following.asReadonly();

  readonly isDirected = computed(() => {
    this.objectChange.versionOf(STAGE_IDENTIFIER)();
    return this.stage?.isDirected === true;
  });

  readonly directorPeerId = computed(() => {
    this.objectChange.versionOf(STAGE_IDENTIFIER)();
    return this.stage?.directorPeerId ?? '';
  });

  private readonly playheadIdentifier = computed(() => {
    this.objectChange.versionOf(STAGE_IDENTIFIER)();
    return this.stage?.playheadIdentifier ?? '';
  });

  private readonly playheadTabIdentifier = computed(() => {
    this.objectChange.versionOf(STAGE_IDENTIFIER)();
    return this.stage?.playheadTabIdentifier ?? '';
  });

  readonly canDirect = computed(() => {
    this.objectChange.trackMyCursor();
    return PeerCursor.isMyselfGameMaster;
  });

  readonly isDirector = computed(() => this.isDirected() && this.directorPeerId() === getMyPeerId());

  readonly isFollowing = computed(() => this.isDirected() && !this.isDirector() && this._following());

  readonly isDetached = computed(() => this.isDirected() && !this.isDirector() && !this._following());

  private get stage(): VnStage | null {
    return this.objectStore.get<VnStage>(STAGE_IDENTIFIER) ?? null;
  }

  constructor() {
    effect(() => {
      const message = this.playback.currentMessage();
      const tabIdentifier = this.playback.chatTabIdentifier();
      if (!this.isDirector()) return;
      untracked(() => this.stage?.setPlayhead(tabIdentifier, message?.identifier ?? ''));
    });

    effect(() => {
      const identifier = this.playheadIdentifier();
      const tabIdentifier = this.playheadTabIdentifier();
      if (!this.isFollowing()) return;
      untracked(() => {
        if (tabIdentifier.length > 0 && tabIdentifier !== this.playback.chatTabIdentifier()) {
          this.playback.setChatTab(tabIdentifier);
        }
        this.playback.jumpToIdentifier(identifier);
      });
    });

    effect(() => {
      if (this.isDirected()) return;
      untracked(() => this._following.set(true));
    });
  }

  toggleDirecting(): void {
    if (!this.canDirect()) return;
    const stage = this.stage;
    if (!stage) return;
    if (stage.isDirected && stage.directorPeerId === getMyPeerId()) {
      stage.stopDirecting();
      return;
    }
    stage.startDirecting(getMyPeerId());
  }

  leaveFollowing(): void {
    if (!this.isFollowing()) return;
    this._following.set(false);
  }

  rejoinFollowing(): void {
    if (!this.isDirected()) return;
    this._following.set(true);
  }
}
