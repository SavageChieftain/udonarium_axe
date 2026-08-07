import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ChatMessageService } from '@axe/application/chat/chat-message.service';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { RolePermissionService } from '@axe/application/permission/role-permission.service';
import { ReplayEditorService } from '@axe/application/replay/replay-editor.service';
import { ReplayLibraryService } from '@axe/application/replay/replay-library.service';
import { ReplayPlaybackService } from '@axe/application/replay/replay-playback.service';
import { ReplayRecorderService } from '@axe/application/replay/replay-recorder.service';
import { ReplayStagingService } from '@axe/application/replay/replay-staging.service';
import { confirmDialog } from '@axe/core/input/confirm-dialog';
import type { ReplayRecordingMeta } from '@axe/core/storage/replay-log-store';
import { chatTabIdentifierNear, INSERTABLE_KINDS, isTextEditable, textOf } from '@axe/domain/replay/replay-edit';
import { findActorAt, findTargetAt, ReplayEventKind, type ReplayManifest } from '@axe/domain/replay/replay-event';
import type { ReplayLogLine } from '@axe/features/replay/replay-log-line';
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
  private readonly editor = inject(ReplayEditorService);
  private readonly library = inject(ReplayLibraryService);
  private readonly staging = inject(ReplayStagingService);
  private readonly chatMessageService = inject(ChatMessageService);
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
  protected readonly isEditing = this.editor.isEditing;
  protected readonly isDirty = this.editor.isDirty;
  protected readonly isSaving = this.editor.isSaving;
  protected readonly isStaging = this.staging.isStaging;

  protected readonly insertKinds = INSERTABLE_KINDS;
  protected readonly insertKind = signal<ReplayEventKind>(ReplayEventKind.ChatMessage);
  protected readonly insertActorId = signal('');
  protected readonly insertSpeaker = signal('');
  protected readonly insertText = signal('');
  protected readonly selectedIndex = signal(-1);

  protected readonly isMarkerDraft = computed(() => this.insertKind() === ReplayEventKind.Marker);

  protected readonly speakerOptions = computed(() => {
    const manifest = this.playback.manifest();
    const names = new Set<string>();
    for (const target of manifest?.targets ?? []) {
      if (target.aliasName === 'character' && target.name.length > 0) names.add(target.name);
    }
    for (const actor of this.actors()) if (actor.name.length > 0) names.add(actor.name);
    return [...names];
  });

  protected readonly insertPosition = computed(() => {
    const index = this.selectedIndex();
    return index < 0 ? 0 : index + 1;
  });

  protected readonly insertPositionLabel = computed(() => {
    const index = this.selectedIndex();
    if (index < 0) return this.t('feature.replay.editor.atStart');
    const row = this.rows()[index];
    return this.t('feature.replay.editor.afterEntry', { entry: row ? row.elapsed : '' });
  });

  protected readonly actors = computed(() => {
    const manifest = this.playback.manifest();
    const seen = new Map<string, string>();
    for (const actor of manifest?.actors ?? []) seen.set(actor.userId, actor.name || actor.userId);
    for (const event of this.playback.events()) if (!seen.has(event.actorId)) seen.set(event.actorId, event.actorId);
    return [...seen].map(([userId, name]) => ({ userId, name }));
  });

  private readonly shownEvents = computed(() => (this.isEditing() ? this.editor.edited() : this.playback.events()));

  protected readonly total = computed(() => this.playback.events().length);

  protected readonly elapsedLabel = computed(() => formatReplayElapsed(this.playback.currentEvent()?.t ?? 0));

  protected readonly rows = computed(() => {
    const manifest = this.playback.manifest() ?? EMPTY_DICTIONARY;
    return this.shownEvents().map((event, index) => ({
      index,
      seq: event.seq,
      elapsed: formatReplayElapsed(event.t),
      editable: isTextEditable(event),
      inserted: this.isEditing() && this.editor.isInserted(event.seq),
      text: textOf(event),
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

  protected lineParams(line: ReplayLogLine): Record<string, string | number> {
    if (!line.paramKeys) return line.params;
    const resolved: Record<string, string | number> = { ...line.params };
    for (const [name, key] of Object.entries(line.paramKeys)) resolved[name] = this.t(key);
    return resolved;
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

  protected beginEditing(): void {
    if (!this.canEdit) return;
    this.selectedIndex.set(this.cursor());
    this.editor.begin(this.playback.events());
  }

  protected cancelEditing(): void {
    this.editor.cancel();
  }

  protected revertEditing(): void {
    this.editor.revert();
  }

  protected setInsertKind(kind: string): void {
    this.insertKind.set(kind as ReplayEventKind);
  }

  private insertTabIdentifier(index: number): string {
    const fromRecording = chatTabIdentifierNear(this.editor.edited(), index);
    if (fromRecording.length > 0) return fromRecording;
    return this.chatMessageService.chatTabs[0]?.identifier ?? '';
  }

  protected selectRow(index: number): void {
    if (!this.isEditing()) return;
    this.selectedIndex.update((current) => (current === index ? -1 : index));
  }

  protected canInsert(): boolean {
    return this.isEditing() && this.insertText().trim().length > 0;
  }

  protected insertHere(): void {
    if (!this.canInsert()) return;
    const index = this.insertPosition();
    this.editor.insert(index, {
      kind: this.insertKind(),
      actorId: this.insertActorId() || this.actors()[0]?.userId || '',
      speaker: this.insertSpeaker().trim(),
      text: this.insertText().trim(),
      tabIdentifier: this.insertTabIdentifier(index),
    });
    this.insertText.set('');
    this.selectedIndex.set(index);
  }

  protected async stageHere(): Promise<void> {
    if (!this.isEditing() || this.isStaging() || !this.canEdit) return;
    if (!this.isBoardMode() && !(await this.playback.enterBoardMode())) return;
    this.staging.begin(this.insertPosition(), this.insertActorId() || this.actors()[0]?.userId || '');
  }

  protected removeRow(seq: number): void {
    this.editor.remove(seq);
  }

  protected moveRow(seq: number, offset: number): void {
    this.editor.move(seq, offset);
  }

  protected retextRow(seq: number, text: string): void {
    this.editor.retext(seq, text);
  }

  protected async saveEdits(): Promise<void> {
    const id = this.playback.recordingId();
    const manifest = this.playback.manifest();
    const first = this.editor.edited()[0];
    if (id == null || !manifest || !first) return;

    const base = await this.library.boardBefore(id, first.seq, this.playback.events());
    const derived = await this.editor.saveAsDerived(manifest, base);
    if (derived == null) return;
    await this.recorder.refresh();
    await this.playback.open(derived);
  }

  private namesAt(manifest: Pick<ReplayManifest, 'actors' | 'targets'>, seq: number): ReplayNameLookup {
    return {
      actorName: (userId) => findActorAt(manifest, userId, seq)?.name || userId,
      targetName: (identifier) => findTargetAt(manifest, identifier, seq)?.name || '',
    };
  }
}
