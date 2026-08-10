import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { RolePermissionService } from '@axe/application/permission/role-permission.service';
import { ReplayEditorService } from '@axe/application/replay/replay-editor.service';
import { ReplayPlaybackService } from '@axe/application/replay/replay-playback.service';
import { ReplayRecorderService } from '@axe/application/replay/replay-recorder.service';
import { DEFAULT_REPLAY_VIDEO_OPTIONS, ReplayVideoService } from '@axe/application/replay/replay-video.service';
import type { ReplayRecordingMeta } from '@axe/core/storage/replay-log-store';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import type { ReplayEvent } from '@axe/domain/replay/replay-event';
import { REPLAY_FRAME_PRESETS } from '@axe/domain/replay/replay-frame-layout';
import { buildReplayStoryboard, ReplayShotPacing, ReplayShotScope } from '@axe/domain/replay/replay-storyboard';
import { formatReplayElapsed, toReplayLogLine } from '@axe/features/replay/replay-log-line';
import { EMPTY_REPLAY_DICTIONARY, replayNamesAt } from '@axe/features/replay/replay-names';
import { TranslocoModule } from '@jsverse/transloco';

export const REPLAY_VIDEO_SIZES = ['720p', '1080p'] as const;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'replay-video-panel',
  templateUrl: './replay-video-panel.component.html',
  imports: [TranslocoModule],
})
export class ReplayVideoPanelComponent {
  private readonly video = inject(ReplayVideoService);
  private readonly playback = inject(ReplayPlaybackService);
  private readonly editor = inject(ReplayEditorService);
  private readonly recorder = inject(ReplayRecorderService);
  private readonly rolePermission = inject(RolePermissionService);
  private readonly t = inject(TRANSLATE_FN);

  protected readonly sizes = REPLAY_VIDEO_SIZES;
  protected readonly pacings = [ReplayShotPacing.Reading, ReplayShotPacing.Recorded];
  protected readonly scopes = [ReplayShotScope.Lines, ReplayShotScope.Everything];

  protected readonly isRendering = this.video.isRendering;
  protected readonly progress = this.video.progress;
  protected readonly failed = this.video.failed;
  protected readonly isOpen = signal(false);

  protected readonly sizeKey = signal<(typeof REPLAY_VIDEO_SIZES)[number]>('1080p');
  protected readonly pacing = signal<ReplayShotPacing>(ReplayShotPacing.Reading);
  protected readonly scope = signal<ReplayShotScope>(ReplayShotScope.Everything);
  protected readonly withEffects = signal(true);
  protected readonly withMusic = signal(true);

  protected readonly isSupported = this.video.isSupported;

  protected readonly estimate = computed(() => {
    const storyboard = buildReplayStoryboard(this.events(), this.playback.cast(), this.storyboardOptions());
    return { shots: storyboard.shots.length, length: formatReplayElapsed(storyboard.totalMs) };
  });

  private storyboardOptions() {
    return {
      pacing: this.pacing(),
      scope: this.scope(),
      viewer: { userId: PeerCursor.myCursor?.userId ?? '', role: PeerCursor.myRole },
      caption: (event: ReplayEvent) => this.captionOf(event),
    };
  }

  private captionOf(event: ReplayEvent): string {
    const dictionary = this.playback.manifest() ?? EMPTY_REPLAY_DICTIONARY;
    const line = toReplayLogLine(event, replayNamesAt(dictionary, event.seq));
    const params: Record<string, string | number> = { ...line.params };
    for (const [name, key] of Object.entries(line.paramKeys ?? {})) params[name] = this.t(key);
    return this.t(line.key, params);
  }

  protected get canEdit(): boolean {
    return this.rolePermission.canEditTabletop;
  }

  protected toggle(): void {
    this.isOpen.update((open) => !open);
  }

  protected setSize(value: string): void {
    this.sizeKey.set(value as (typeof REPLAY_VIDEO_SIZES)[number]);
  }

  protected setPacing(value: string): void {
    this.pacing.set(value as ReplayShotPacing);
  }

  protected setScope(value: string): void {
    this.scope.set(value as ReplayShotScope);
  }

  protected toggleEffects(): void {
    this.withEffects.update((value) => !value);
  }

  protected toggleMusic(): void {
    this.withMusic.update((value) => !value);
  }

  protected cancel(): void {
    this.video.cancel();
  }

  protected async render(): Promise<void> {
    const id = this.playback.recordingId();
    if (id == null || this.estimate().shots < 1) return;

    this.isOpen.set(false);
    await this.video.render(
      this.metaOf(id),
      this.events(),
      {
        ...DEFAULT_REPLAY_VIDEO_OPTIONS,
        ...this.storyboardOptions(),
        size: REPLAY_FRAME_PRESETS[this.sizeKey()],
        sound: { withEffects: this.withEffects(), withMusic: this.withMusic() },
      },
      { userId: PeerCursor.myCursor?.userId ?? '', role: PeerCursor.myRole }
    );
  }

  private metaOf(id: number): ReplayRecordingMeta {
    const known = this.recorder.recordings().find((recording) => recording.id === id);
    if (known) return known;

    const manifest = this.playback.manifest();
    return {
      id,
      roomName: manifest?.roomName ?? '',
      startedAt: manifest?.startedAt ?? 0,
      endedAt: manifest?.endedAt ?? null,
      eventCount: this.events().length,
      byteSize: 0,
    };
  }

  private events() {
    return this.editor.isEditing() ? this.editor.edited() : this.playback.events();
  }
}
