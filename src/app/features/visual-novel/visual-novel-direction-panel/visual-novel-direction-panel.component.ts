import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { VN_STAGE_TRANSITIONS } from '@axe/domain/visual-novel/vn-stage';
import { VisualNovelDirectorService } from '@axe/features/visual-novel/visual-novel-director.service';
import { VisualNovelPlaybackService } from '@axe/features/visual-novel/visual-novel-playback.service';
import { VisualNovelSceneService } from '@axe/features/visual-novel/visual-novel-scene.service';
import { TranslocoModule } from '@jsverse/transloco';

/**
 * What the game master does to the scene everybody is looking at.
 *
 * Apart from the display settings, which are each reader's own: these reach the whole table.
 * They used to sit in the same strip as the controls for reading and for speaking, where they
 * were three unlabelled icons among twenty.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'visual-novel-direction-panel',
  templateUrl: './visual-novel-direction-panel.component.html',
  host: { class: 'block' },
  imports: [TranslocoModule],
})
export class VisualNovelDirectionPanelComponent {
  readonly scene = inject(VisualNovelSceneService);
  readonly director = inject(VisualNovelDirectorService);
  private readonly playback = inject(VisualNovelPlaybackService);

  readonly transitionOptions = VN_STAGE_TRANSITIONS;

  resetStage(): void {
    const tab = this.playback.chatTab();
    if (tab) this.scene.resetStage(tab);
  }
}
