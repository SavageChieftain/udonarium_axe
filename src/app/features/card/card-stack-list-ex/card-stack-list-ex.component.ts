import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnDestroy, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Network } from '@axe/core/index';
import { Card } from '@axe/domain/card/card';
import { CardStack } from '@axe/domain/card/card-stack';
import { callShuffleCardStack } from '@axe/domain/domain-events';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import { GameCharacterSheetComponent } from '@axe/features/character/game-character-sheet/game-character-sheet.component';
import { SafePipe } from '@axe/shared/pipes/safe.pipe';
import { ObjectChangeService } from '@axe/shared/sync/object-change.service';
import { PanelOption, PanelService } from '@axe/shared/ui/panel.service';

@Component({
  selector: 'card-stack-list-ex',
  templateUrl: './card-stack-list-ex.component.html',
  styleUrls: ['./card-stack-list-ex.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SafePipe],
})
export class CardStackListComponentEx implements OnInit, OnDestroy {
  private panelService = inject(PanelService);
  private objectChange = inject(ObjectChangeService);
  private destroyRef = inject(DestroyRef);

  cardStack: CardStack | null = null;

  owner: string = Network.peerContext.userId;

  get cards(): Card[] {
    if (!this.cardStack) return [];
    this.objectChange.versionOf(this.cardStack.identifier)();
    return this.cardStack.cards;
  }

  ngOnInit() {
    queueMicrotask(() => (this.panelService.title = (this.cardStack?.name ?? '') + ' のカード一覧'));
    if (this.cardStack) this.panelService.cardStack = this.cardStack;
    this.objectChange.objectChanged$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((e) => {
      if (!this.cardStack) return;
      if (e.identifier === this.cardStack.identifier && this.cardStack.owner !== this.owner) {
        this.panelService.close();
      }
    });

    this.objectChange.objectDeleted$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((e) => {
      if (this.cardStack && this.cardStack.identifier === e.identifier) {
        this.panelService.close();
      }
    });
  }

  ngOnDestroy() {
    if (this.cardStack && this.cardStack.owner === this.owner) {
      this.cardStack.owner = '';
    }
  }

  drawCard(card: Card) {
    if (!this.cardStack) return;
    card.parent.removeChild(card);
    card.location.x = this.cardStack.location.x + 100 + Math.random() * 50;
    card.location.y = this.cardStack.location.y + 25 + Math.random() * 50;
    card.location.name = this.cardStack.location.name;
    card.rotate += this.cardStack.rotate;
    if (360 < card.rotate) card.rotate -= 360;
    card.toTopmost();
    SoundEffect.play(PresetSound.cardDraw);
  }

  up(card: Card) {
    const parent = card.parent;
    const index: number = parent.children.indexOf(card);
    if (0 < index) {
      const prev = parent.children[index - 1];
      parent.insertBefore(card, prev);
    }
  }

  down(card: Card) {
    const parent = card.parent;
    const index: number = parent.children.indexOf(card);
    if (index < parent.children.length - 1) {
      const next = parent.children[index + 1];
      parent.insertBefore(next, card);
    }
  }

  close(needShuffle: boolean = false) {
    if (needShuffle && this.cardStack) {
      this.cardStack.shuffle();
      callShuffleCardStack(this.cardStack.identifier);
      SoundEffect.play(PresetSound.cardShuffle);
    }
    this.panelService.close();
  }

  showDetail(gameObject: Card) {
    const coordinate = {
      x: this.panelService.left,
      y: this.panelService.top,
    };
    let title = 'カード設定';
    if (gameObject.name.length) title += ' - ' + gameObject.name;
    const option: PanelOption = {
      title: title,
      left: coordinate.x + 10,
      top: coordinate.y + 20,
      width: 600,
      height: 600,
    };
    const component = this.panelService.open<GameCharacterSheetComponent>(GameCharacterSheetComponent, option);
    component.tabletopObject = gameObject;
  }

  trackByCard(index: number, card: Card) {
    return card.identifier;
  }
}
