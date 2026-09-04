import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { Card } from '@axe/domain/card/card';
import { SafePipe } from '@axe/ui/pipes/safe.pipe';
import { decorateChatStyleText } from '@axe/ui/text-decoration/decorate-chat-text';

@Component({
  selector: 'card-face-text',
  templateUrl: './card-face-text.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SafePipe],
})
export class CardFaceTextComponent {
  readonly card = input.required<Card>();
  readonly rotation = input(0);
  readonly scale = input(1);
  private readonly objectChange = inject(ObjectChangeService);

  private trackCardFace(): Card {
    const card = this.card();
    // A version bumps for anything below it, so the card covers the elements its face is kept in.
    this.objectChange.versionOf(card.identifier)();
    return card;
  }

  readonly visibleText = computed(() => {
    const card = this.trackCardFace();
    return card.isVisible ? card.faceText : '';
  });
  readonly decoratedText = computed(() => decorateChatStyleText(this.visibleText()));
  readonly fontSize = computed(() => {
    // Match TextNote's numeric font-size convention, then scale the whole face for previews.
    return (this.trackCardFace().faceFontSize + 9) * this.scale();
  });
  readonly fontColor = computed(() => this.trackCardFace().faceFontColor);
  readonly padding = computed(() => 8 * this.scale());
  readonly transformCss = computed(() => `rotateZ(${this.rotation()}deg)`);
}
