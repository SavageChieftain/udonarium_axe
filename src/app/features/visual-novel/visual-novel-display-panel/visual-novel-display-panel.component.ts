import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { VN_STAGE_TRANSITIONS } from '@axe/domain/visual-novel/vn-stage';
import { VisualNovelSceneService } from '@axe/features/visual-novel/visual-novel-scene.service';
import {
  VisualNovelSettingsService,
  VN_LAYOUTS,
  VN_PORTRAIT_ANIMATIONS,
  VN_READABILITY_LEVELS,
  VN_TEXT_SIZES,
  VN_TYPEWRITER_SPEEDS,
} from '@axe/features/visual-novel/visual-novel-settings.service';
import { TranslocoModule } from '@jsverse/transloco';

/** How novel mode looks, settled once rather than chosen line by line. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'visual-novel-display-panel',
  templateUrl: './visual-novel-display-panel.component.html',
  host: { class: 'block' },
  imports: [TranslocoModule],
})
export class VisualNovelDisplayPanelComponent {
  readonly settings = inject(VisualNovelSettingsService);
  readonly scene = inject(VisualNovelSceneService);

  readonly layoutOptions = VN_LAYOUTS;
  readonly readabilityOptions = VN_READABILITY_LEVELS;
  readonly transitionOptions = VN_STAGE_TRANSITIONS;
  readonly typewriterSpeedOptions = VN_TYPEWRITER_SPEEDS;
  readonly portraitAnimationOptions = VN_PORTRAIT_ANIMATIONS;
  readonly textSizeOptions = VN_TEXT_SIZES;
}
