import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { SelectionSignalService } from '@axe/application/ui/selection-signal.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { Card } from '@axe/domain/card/card';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { selectHandCards } from '@axe/features/pl-tools/hand-card-list/hand-cards';
import { SafePipe } from '@axe/ui/pipes/safe.pipe';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'hand-card-list-panel',
  templateUrl: './hand-card-list-panel.component.html',
  host: { class: 'block h-full' },
  imports: [SafePipe, TranslocoModule],
})
export class HandCardListPanelComponent {
  private readonly objectStore = inject(ObjectStore);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly selectionSignalService = inject(SelectionSignalService);
  private readonly t = inject(TRANSLATE_FN);

  readonly cards = computed<Card[]>(() => {
    this.objectChange.collectionOf(Card.aliasName)();
    if (PeerCursor.myCursor) this.objectChange.versionOf(PeerCursor.myCursor.identifier)();
    const userId = PeerCursor.myCursor?.userId ?? '';
    const all = this.objectStore.getObjects<Card>(Card);
    for (const card of all) this.objectChange.versionOf(card.identifier)();
    return selectHandCards(all, userId);
  });

  protected imageUrl(card: Card): string {
    return card.frontImage?.url ?? '';
  }

  protected displayName(card: Card): string {
    return card.name.length ? card.name : this.t('feature.plTools.hand.unnamed');
  }

  protected canFocus(card: Card): boolean {
    return card.location.name === 'table';
  }

  protected focusToCard(card: Card): void {
    if (!this.canFocus(card)) return;
    this.selectionSignalService.selectObject(card.identifier, card.aliasName);
    this.selectionSignalService.focusToCoordinate(card.location.x, card.location.y);
  }

  protected faceUp(card: Card): void {
    card.faceUp();
    SoundEffect.play(PresetSound.cardDraw);
    this.objectChange.notifyChanged(card.identifier);
  }

  protected faceDown(card: Card): void {
    card.faceDown();
    SoundEffect.play(PresetSound.cardPut);
    this.objectChange.notifyChanged(card.identifier);
  }
}
