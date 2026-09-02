import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  VN_BUBBLE_ANIMATIONS,
  VN_BUBBLE_SHAPES,
  VN_EMOTION_MARK_CHARS,
  VN_EMOTION_MARKS,
  VN_PORTRAIT_EMOTES,
  VnEmotionMark,
} from '@axe/domain/visual-novel/vn-emote';
import { VisualNovelEmoteSelectionService } from '@axe/features/visual-novel/visual-novel-emote-selection.service';
import { TranslocoModule } from '@jsverse/transloco';

/**
 * What the next line will be staged as.
 *
 * Kept apart from the display settings it used to share a balloon with: this is touched line
 * by line while a scene is played, those are settled once and left alone. Together they made
 * one tall column to scroll past every time an expression was wanted.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'visual-novel-emote-panel',
  templateUrl: './visual-novel-emote-panel.component.html',
  host: { class: 'block' },
  imports: [TranslocoModule],
})
export class VisualNovelEmotePanelComponent {
  private readonly selection = inject(VisualNovelEmoteSelectionService);

  readonly messageKindOptions = this.selection.messageKindOptions;
  readonly bubbleShapeOptions = VN_BUBBLE_SHAPES;
  readonly bubbleAnimationOptions = VN_BUBBLE_ANIMATIONS;
  readonly portraitEmoteOptions = VN_PORTRAIT_EMOTES;
  readonly emotionMarkOptions = VN_EMOTION_MARKS;

  readonly selectedKind = this.selection.kind;
  readonly selectedShape = this.selection.shape;
  readonly selectedBubbleAnimation = this.selection.bubbleAnimation;
  readonly selectedPortraitEmote = this.selection.portraitEmote;
  readonly selectedEmotionMark = this.selection.emotionMark;
  readonly selectedExit = this.selection.exited;

  emotionMarkLabel(mark: VnEmotionMark): string {
    return mark === 'none' ? '' : VN_EMOTION_MARK_CHARS[mark];
  }

  resetEmote(): void {
    this.selection.reset();
  }

  toggleSelectedExit(): void {
    this.selection.toggleExit();
  }
}
