import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { ReplayEditorService } from '@axe/application/replay/replay-editor.service';
import { ReplayPlaybackService } from '@axe/application/replay/replay-playback.service';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { isTextEditable, textOf } from '@axe/domain/replay/replay-edit';
import { ReplayEventKind } from '@axe/domain/replay/replay-event';
import {
  collectReplayActorIds,
  DEFAULT_REPLAY_LOG_FILTER,
  filterReplayEvents,
  type ReplayLogFilter,
  ReplayLogScope,
} from '@axe/features/replay/replay-log-filter';
import { formatReplayElapsed, type ReplayLogLine, toReplayLogLine } from '@axe/features/replay/replay-log-line';
import { EMPTY_REPLAY_DICTIONARY, replayNamesAt } from '@axe/features/replay/replay-names';
import { TranslocoModule } from '@jsverse/transloco';

export interface ReplayEntryRow {
  index: number;
  seq: number;
  elapsed: string;
  isChapter: boolean;
  inserted: boolean;
  line: ReplayLogLine;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'replay-entry-list',
  templateUrl: './replay-entry-list.component.html',
  imports: [TranslocoModule],
})
export class ReplayEntryListComponent {
  private readonly playback = inject(ReplayPlaybackService);
  private readonly editor = inject(ReplayEditorService);
  private readonly t = inject(TRANSLATE_FN);

  readonly editing = input(false);
  readonly selectedIndex = input(-1);
  readonly selectIndex = output<number>();

  protected readonly cursor = this.playback.cursor;
  protected readonly scopes = [ReplayLogScope.All, ReplayLogScope.Chat, ReplayLogScope.Board];
  protected readonly filter = signal<ReplayLogFilter>(DEFAULT_REPLAY_LOG_FILTER);

  private readonly viewer = computed(() => ({
    userId: PeerCursor.myCursor?.userId ?? '',
    role: PeerCursor.myRole,
  }));

  private readonly source = computed(() => (this.editing() ? this.editor.edited() : this.playback.events()));

  protected readonly actors = computed(() => collectReplayActorIds(this.source()));

  protected readonly rows = computed<ReplayEntryRow[]>(() => {
    const dictionary = this.playback.manifest() ?? EMPTY_REPLAY_DICTIONARY;
    const events = this.source();
    const visible = new Set(filterReplayEvents(events, this.filter(), this.viewer()).map((event) => event.seq));

    return events
      .map((event, index) => ({ event, index }))
      .filter(({ event }) => visible.has(event.seq))
      .map(({ event, index }) => ({
        index,
        seq: event.seq,
        elapsed: formatReplayElapsed(event.t),
        isChapter: event.kind === ReplayEventKind.Marker,
        inserted: this.editing() && this.editor.isInserted(event.seq),
        line: toReplayLogLine(event, replayNamesAt(dictionary, event.seq)),
      }));
  });

  protected actorLabel(userId: string): string {
    return replayNamesAt(this.playback.manifest() ?? EMPTY_REPLAY_DICTIONARY, 0).actorName(userId);
  }

  protected lineParams(line: ReplayLogLine): Record<string, string | number> {
    if (!line.paramKeys) return line.params;
    const resolved: Record<string, string | number> = { ...line.params };
    for (const [name, key] of Object.entries(line.paramKeys)) resolved[name] = this.t(key);
    return resolved;
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

  protected async activate(row: ReplayEntryRow): Promise<void> {
    if (this.editing()) {
      this.selectIndex.emit(row.index);
      return;
    }
    await this.playback.seekTo(row.index);
  }

  protected isTextRow(seq: number): boolean {
    const event = this.source().find((candidate) => candidate.seq === seq);
    return event ? isTextEditable(event) : false;
  }

  protected textOfRow(seq: number): string {
    const event = this.source().find((candidate) => candidate.seq === seq);
    return event ? textOf(event) : '';
  }

  protected retext(seq: number, text: string): void {
    this.editor.retext(seq, text);
  }

  protected move(seq: number, offset: number): void {
    this.editor.move(seq, offset);
  }

  protected remove(seq: number): void {
    this.editor.remove(seq);
  }
}
