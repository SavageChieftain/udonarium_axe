import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { ChatMessageService } from '@axe/application/chat/chat-message.service';
import { RolePermissionService } from '@axe/application/permission/role-permission.service';
import { ReplayEditorService } from '@axe/application/replay/replay-editor.service';
import { ReplayLibraryService } from '@axe/application/replay/replay-library.service';
import { ReplayPlaybackService } from '@axe/application/replay/replay-playback.service';
import { ReplayRecorderService } from '@axe/application/replay/replay-recorder.service';
import { ReplayStagingService } from '@axe/application/replay/replay-staging.service';
import type { ReplayCastMember } from '@axe/domain/replay/replay-cast';
import { chatTabIdentifierNear, INSERTABLE_KINDS } from '@axe/domain/replay/replay-edit';
import { ReplayEventKind } from '@axe/domain/replay/replay-event';
import { collectReplayActorIds } from '@axe/features/replay/replay-log-filter';
import { EMPTY_REPLAY_DICTIONARY, replayActorsOf } from '@axe/features/replay/replay-names';
import { ReplayEntryListComponent } from '@axe/features/replay/replay-workspace/replay-entry-list.component';
import { ReplayRecordingListComponent } from '@axe/features/replay/replay-workspace/replay-recording-list.component';
import { ReplayStageComponent } from '@axe/features/replay/replay-workspace/replay-stage.component';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-replay-workspace',
  templateUrl: './replay-workspace.component.html',
  imports: [TranslocoModule, ReplayRecordingListComponent, ReplayStageComponent, ReplayEntryListComponent],
})
export class ReplayWorkspaceComponent {
  private readonly playback = inject(ReplayPlaybackService);
  private readonly editor = inject(ReplayEditorService);
  private readonly staging = inject(ReplayStagingService);
  private readonly recorder = inject(ReplayRecorderService);
  private readonly library = inject(ReplayLibraryService);
  private readonly chatMessageService = inject(ChatMessageService);
  private readonly rolePermission = inject(RolePermissionService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly isOpen = this.playback.isOpen;
  protected readonly isRecording = this.recorder.isRecording;
  protected readonly isEditing = this.editor.isEditing;
  protected readonly isDirty = this.editor.isDirty;
  protected readonly isSaving = this.editor.isSaving;
  protected readonly isStaging = this.staging.isStaging;

  protected readonly insertKinds = INSERTABLE_KINDS;
  protected readonly insertKind = signal<ReplayEventKind>(ReplayEventKind.ChatMessage);
  protected readonly insertCastId = signal('');
  protected readonly insertSpeaker = signal('');
  protected readonly insertActorId = signal('');
  protected readonly insertText = signal('');
  protected readonly selectedIndex = signal(-1);

  protected readonly isMarkerDraft = computed(() => this.insertKind() === ReplayEventKind.Marker);
  protected readonly isFreeSpeaker = computed(() => this.insertCastId().length < 1);

  protected readonly cast = computed(() =>
    this.playback
      .cast()
      .filter((member) => member.name.length > 0)
      .sort((a, b) => a.name.localeCompare(b.name))
  );

  protected readonly actors = computed(() =>
    replayActorsOf(this.playback.manifest() ?? EMPTY_REPLAY_DICTIONARY, collectReplayActorIds(this.playback.events()))
  );

  protected readonly insertPosition = computed(() => (this.selectedIndex() < 0 ? 0 : this.selectedIndex() + 1));

  constructor() {
    this.destroyRef.onDestroy(() => void this.playback.close());
  }

  protected get canEdit(): boolean {
    return this.rolePermission.canEditTabletop;
  }

  protected selectIndex(index: number): void {
    this.selectedIndex.update((current) => (current === index ? -1 : index));
  }

  protected beginEditing(): void {
    if (!this.canEdit) return;
    this.selectedIndex.set(this.playback.cursor());
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

  protected setCastId(identifier: string): void {
    this.insertCastId.set(identifier);
  }

  protected canInsert(): boolean {
    return this.isEditing() && this.insertText().trim().length > 0;
  }

  protected insertHere(): void {
    if (!this.canInsert()) return;
    const index = this.insertPosition();
    const member = this.selectedCast();
    this.editor.insert(index, {
      kind: this.insertKind(),
      actorId: this.insertActorId() || this.actors()[0]?.userId || '',
      speaker: member?.name ?? this.insertSpeaker().trim(),
      text: this.insertText().trim(),
      tabIdentifier: this.insertTabIdentifier(index),
      imageIdentifier: member?.imageIdentifier ?? '',
      chatColor: member?.chatColor ?? '',
    });
    this.insertText.set('');
    this.selectedIndex.set(index);
  }

  protected async stageHere(): Promise<void> {
    if (!this.isEditing() || this.isStaging() || !this.canEdit) return;
    if (!this.playback.isBoardMode() && !(await this.playback.enterBoardMode())) return;
    this.staging.begin(this.insertPosition(), this.insertActorId() || this.actors()[0]?.userId || '');
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

  private selectedCast(): ReplayCastMember | null {
    return this.cast().find((member) => member.identifier === this.insertCastId()) ?? null;
  }

  private insertTabIdentifier(index: number): string {
    const fromRecording = chatTabIdentifierNear(this.editor.edited(), index);
    if (fromRecording.length > 0) return fromRecording;
    return this.chatMessageService.chatTabs[0]?.identifier ?? '';
  }
}
