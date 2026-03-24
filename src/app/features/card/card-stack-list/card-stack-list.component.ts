import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, Input, OnDestroy, OnInit } from '@angular/core';
import { EventSystem, Network } from '@axe/core/index';
import { ObjectNode } from '@axe/core/sync/object-node';
import { ObjectStore } from '@axe/core/sync/object-store';
import { Card } from '@axe/domain/card/card';
import { CardStack } from '@axe/domain/card/card-stack';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import { GameCharacterSheetComponent } from '@axe/features/character/game-character-sheet/game-character-sheet.component';
import { TooltipDirective } from '@axe/shared/directives/tooltip.directive';
import { PanelOption, PanelService } from '@axe/shared/panel.service';
import { SafePipe } from '@axe/shared/pipes/safe.pipe';

@Component({
  selector: 'card-stack-list',
  templateUrl: './card-stack-list.component.html',
  styleUrls: ['./card-stack-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TooltipDirective, SafePipe],
})
export class CardStackListComponent implements OnInit, OnDestroy {
  private panelService = inject(PanelService);
  private changeDetector = inject(ChangeDetectorRef);
  private objectStore = inject(ObjectStore);

  @Input() cardStack: CardStack | null = null;

  owner: string = Network.peerContext.userId;

  ngOnInit() {
    queueMicrotask(() => (this.panelService.title = (this.cardStack?.name ?? '') + ' のカード一覧'));
    EventSystem.register(this)
      .on('UPDATE_GAME_OBJECT', (event) => {
        const object = this.objectStore.get(event.data.identifier);
        if (!this.cardStack || !object) return;
        if (this.cardStack === object || (object instanceof ObjectNode && this.cardStack.contains(object))) {
          this.changeDetector.markForCheck();
        }
        if (event.data.identifier === this.cardStack.identifier && this.cardStack.owner !== this.owner) {
          this.panelService.close();
        }
      })
      .on('DELETE_GAME_OBJECT', (event) => {
        if (this.cardStack && this.cardStack.identifier === event.data.identifier) {
          this.panelService.close();
        }
      });
  }

  ngOnDestroy() {
    EventSystem.unregister(this);
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
      EventSystem.call('SHUFFLE_CARD_STACK', { identifier: this.cardStack.identifier });
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
