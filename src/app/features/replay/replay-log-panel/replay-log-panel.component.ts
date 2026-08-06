import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { RolePermissionService } from '@axe/application/permission/role-permission.service';
import { ReplayRecorderService } from '@axe/application/replay/replay-recorder.service';
import { confirmDialog } from '@axe/core/input/confirm-dialog';
import type { ReplayRecordingMeta } from '@axe/core/storage/replay-log-store';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { ReplayDetailLevel } from '@axe/domain/replay/replay-event';
import {
  collectReplayActorIds,
  DEFAULT_REPLAY_LOG_FILTER,
  filterReplayEvents,
  type ReplayLogFilter,
  ReplayLogScope,
} from '@axe/features/replay/replay-log-filter';
import { formatReplayElapsed, formatReplayTime, toReplayLogLine } from '@axe/features/replay/replay-log-line';
import { formatSnapshotByteSize, formatSnapshotSavedAt } from '@axe/features/room-archive/snapshot-format';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-replay-log-panel',
  templateUrl: './replay-log-panel.component.html',
  imports: [TranslocoModule],
})
export class ReplayLogPanelComponent {
  private readonly recorder = inject(ReplayRecorderService);
  private readonly rolePermission = inject(RolePermissionService);
  private readonly t = inject(TRANSLATE_FN);

  protected readonly scopes = [ReplayLogScope.All, ReplayLogScope.Chat, ReplayLogScope.Board];
  protected readonly detailLevels = [ReplayDetailLevel.ChatOnly, ReplayDetailLevel.Notable, ReplayDetailLevel.Full];

  protected readonly isSupported = this.recorder.isSupported;
  protected readonly isRecording = this.recorder.isRecording;
  protected readonly eventCount = this.recorder.eventCount;
  protected readonly detailLevel = this.recorder.detailLevel;
  protected readonly recordings = this.recorder.recordings;

  protected readonly filter = signal<ReplayLogFilter>(DEFAULT_REPLAY_LOG_FILTER);
  protected readonly markLabel = signal('');

  private readonly viewer = computed(() => ({
    userId: PeerCursor.myCursor?.userId ?? '',
    role: PeerCursor.myRole,
  }));

  protected readonly actorIds = computed(() => collectReplayActorIds(this.recorder.recentEvents()));

  protected readonly lines = computed(() =>
    filterReplayEvents(this.recorder.recentEvents(), this.filter(), this.viewer())
      .slice()
      .reverse()
      .map((event) => ({
        seq: event.seq,
        time: formatReplayTime(event.at),
        merged: event.merged ?? 1,
        line: toReplayLogLine(event, {
          actorName: (userId) => this.recorder.actorNameOf(userId),
          targetName: (identifier) => this.recorder.targetNameOf(identifier),
        }),
      }))
  );

  protected readonly elapsedLabel = computed(() => {
    this.eventCount();
    return this.isRecording() ? formatReplayElapsed(Date.now() - this.recorder.startedAt()) : formatReplayElapsed(0);
  });

  constructor() {
    void this.recorder.refresh();
  }

  protected get canEdit(): boolean {
    return this.rolePermission.canEditTabletop;
  }

  protected actorLabel(userId: string): string {
    return this.recorder.actorNameOf(userId);
  }

  protected startedAtLabel(meta: ReplayRecordingMeta): string {
    return formatSnapshotSavedAt(meta.startedAt);
  }

  protected byteSizeLabel(meta: ReplayRecordingMeta): string {
    return formatSnapshotByteSize(meta.byteSize);
  }

  protected setScope(scope: ReplayLogScope): void {
    this.filter.update((filter) => ({ ...filter, scope }));
  }

  protected setActor(actorId: string): void {
    this.filter.update((filter) => ({ ...filter, actorId }));
  }

  protected toggleSecret(): void {
    this.filter.update((filter) => ({ ...filter, hideSecret: !filter.hideSecret }));
  }

  protected setDetailLevel(level: string): void {
    this.recorder.setDetailLevel(level as ReplayDetailLevel);
  }

  protected async toggleRecording(): Promise<void> {
    if (!this.canEdit) return;
    if (this.isRecording()) {
      await this.recorder.stop();
      return;
    }
    await this.recorder.start();
  }

  protected async mark(): Promise<void> {
    const label = this.markLabel().trim();
    if (!this.canEdit || !this.isRecording() || label.length < 1) return;
    this.markLabel.set('');
    await this.recorder.mark(label);
  }

  protected async remove(meta: ReplayRecordingMeta): Promise<void> {
    if (!this.canEdit) return;
    if (!confirmDialog(this.t('feature.replay.panel.removeConfirm', { startedAt: this.startedAtLabel(meta) }))) return;
    await this.recorder.remove(meta.id);
  }
}
