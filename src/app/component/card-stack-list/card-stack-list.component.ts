import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy, OnInit, inject } from '@angular/core';

import { Card } from '@axe/card';
import { CardStack } from '@axe/card-stack';
import { ObjectNode } from '@axe/core/synchronize-object/object-node';
import { ObjectStore } from '@axe/core/synchronize-object/object-store';
import { EventSystem, Network } from '@axe/core/system';
import { PresetSound, SoundEffect } from '@axe/sound-effect';

import { GameCharacterSheetComponent } from 'component/game-character-sheet/game-character-sheet.component';

import { PanelOption, PanelService } from 'service/panel.service';
import { TooltipDirective } from 'directive/tooltip.directive';
import { SafePipe } from 'pipe/safe.pipe';

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

  @Input() cardStack: CardStack = null!;

  owner: string = Network.peerContext.userId;

  ngOnInit() {
    Promise.resolve().then(() => (this.panelService.title = this.cardStack.name + ' のカード一覧'));
    EventSystem.register(this)
      .on('UPDATE_GAME_OBJECT', (event) => {
        const object = ObjectStore.instance.get(event.data.identifier);
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
    if (needShuffle) {
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
