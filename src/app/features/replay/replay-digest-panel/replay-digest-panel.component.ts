import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ReplayEditorService } from '@axe/application/replay/replay-editor.service';
import { ReplayPlaybackService } from '@axe/application/replay/replay-playback.service';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { buildReplayDigest, EMPTY_REPLAY_DIGEST } from '@axe/domain/replay/replay-digest';
import { replayScriptElapsed } from '@axe/domain/replay/replay-script';
import { TranslocoModule } from '@jsverse/transloco';

/**
 * 卓が終わったあとに残る 1 枚。
 *
 * 数えるのは記録に残っているものだけで、足りない欄は「出せません」と言う。
 * 見える範囲は読む人のロールに従う（動画・読み物と同じ）。
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'replay-digest-panel',
  templateUrl: './replay-digest-panel.component.html',
  host: { class: 'block min-h-0 flex-1 overflow-y-auto' },
  imports: [TranslocoModule],
})
export class ReplayDigestPanelComponent {
  private readonly playback = inject(ReplayPlaybackService);
  private readonly editor = inject(ReplayEditorService);
  private readonly objectChange = inject(ObjectChangeService);

  protected readonly digest = computed(() => {
    // ロールが変われば見える範囲も変わる。開いたままの画面が古いままにならないよう追う。
    if (PeerCursor.myCursor) this.objectChange.versionOf(PeerCursor.myCursor.identifier)();
    const manifest = this.playback.manifest();
    if (!manifest) return EMPTY_REPLAY_DIGEST;
    const events = this.editor.isEditing() ? this.editor.edited() : this.playback.events();
    return buildReplayDigest(events, manifest, {
      userId: PeerCursor.myCursor?.userId ?? '',
      role: PeerCursor.myRole,
    });
  });

  protected readonly isEmpty = computed(() => {
    const digest = this.digest();
    const numbers = digest.numbers;
    return (
      numbers.messages + numbers.diceRolls + numbers.effects + numbers.rounds < 1 &&
      digest.ledger.length < 1 &&
      digest.fortunes.length < 1
    );
  });

  protected readonly fortuneColumns = ['who', 'rolls', 'average', 'best', 'worst', 'criticals', 'fumbles'] as const;
  protected readonly ledgerColumns = ['who', 'damage', 'heal', 'biggestHit'] as const;

  protected elapsed(ms: number): string {
    return replayScriptElapsed(ms);
  }
}
