import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { RolePermissionService } from '@axe/application/permission/role-permission.service';
import { ReplayPlaybackService } from '@axe/application/replay/replay-playback.service';
import { ReplayRecorderService } from '@axe/application/replay/replay-recorder.service';
import { confirmDialog } from '@axe/core/input/confirm-dialog';
import type { ReplayRecordingMeta } from '@axe/core/storage/replay-log-store';
import { findActorAt, findTargetAt, type ReplayManifest } from '@axe/domain/replay/replay-event';
import { formatReplayElapsed, type ReplayNameLookup, toReplayLogLine } from '@axe/features/replay/replay-log-line';
import { formatSnapshotSavedAt } from '@axe/features/room-archive/snapshot-format';
import { TranslocoModule } from '@jsverse/transloco';

const EMPTY_DICTIONARY: Pick<ReplayManifest, 'actors' | 'targets'> = { actors: [], targets: [] };

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-replay-player-panel',
  templateUrl: './replay-player-panel.component.html',
  imports: [TranslocoModule],
})
export class ReplayPlayerPanelComponent {
  private readonly playback = inject(ReplayPlaybackService);
  private readonly recorder = inject(ReplayRecorderService);
  private readonly rolePermission = inject(RolePermissionService);
  private readonly t = inject(TRANSLATE_FN);

  protected readonly isOpen = this.playback.isOpen;
  protected readonly cursor = this.playback.cursor;
  protected readonly isBoardMode = this.playback.isBoardMode;
  protected readonly isSeeking = this.playback.isSeeking;
  protected readonly autoPlay = this.playback.autoPlay;
  protected readonly isAtStart = this.playback.isAtStart;
  protected readonly isAtEnd = this.playback.isAtEnd;
  protected readonly recordings = this.recorder.recordings;

  protected readonly total = computed(() => this.playback.events().length);

  protected readonly elapsedLabel = computed(() => formatReplayElapsed(this.playback.currentEvent()?.t ?? 0));

  protected readonly rows = computed(() => {
    const manifest = this.playback.manifest() ?? EMPTY_DICTIONARY;
    return this.playback.events().map((event, index) => ({
      index,
      seq: event.seq,
      elapsed: formatReplayElapsed(event.t),
      line: toReplayLogLine(event, this.namesAt(manifest, event.seq)),
    }));
  });

  protected readonly currentRow = computed(() => this.rows()[this.cursor()] ?? null);

  constructor() {
    void this.recorder.refresh();
  }

  protected get canEdit(): boolean {
    return this.rolePermission.canEditTabletop;
  }

  protected startedAtLabel(meta: ReplayRecordingMeta): string {
    return formatSnapshotSavedAt(meta.startedAt);
  }

  protected async openRecording(id: string): Promise<void> {
    const parsed = Number(id);
    if (!Number.isFinite(parsed)) return;
    await this.playback.open(parsed);
  }

  protected async close(): Promise<void> {
    await this.playback.close();
  }

  protected async seekTo(value: string): Promise<void> {
    await this.playback.seekTo(Number(value));
  }

  protected async toStart(): Promise<void> {
    await this.playback.toStart();
  }

  protected async previous(): Promise<void> {
    await this.playback.previous();
  }

  protected async next(): Promise<void> {
    await this.playback.next();
  }

  protected async toEnd(): Promise<void> {
    await this.playback.toEnd();
  }

  protected toggleAutoPlay(): void {
    this.playback.toggleAutoPlay();
  }

  protected async toggleBoardMode(): Promise<void> {
    if (this.isBoardMode()) {
      await this.playback.exitBoardMode();
      return;
    }
    if (!this.canEdit) return;
    if (!confirmDialog(this.t('feature.replay.player.boardConfirm'))) return;
    await this.playback.enterBoardMode();
  }

  private namesAt(manifest: Pick<ReplayManifest, 'actors' | 'targets'>, seq: number): ReplayNameLookup {
    return {
      actorName: (userId) => findActorAt(manifest, userId, seq)?.name || userId,
      targetName: (identifier) => findTargetAt(manifest, identifier, seq)?.name || '',
    };
  }
}
