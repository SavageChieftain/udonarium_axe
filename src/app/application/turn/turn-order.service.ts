import { DestroyRef, inject, Injectable } from '@angular/core';
import { ChatMessageService } from '@axe/application/chat/chat-message.service';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { GameObjectInventoryService } from '@axe/application/inventory/game-object-inventory.service';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { SelectionSignalService } from '@axe/application/ui/selection-signal.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { TurnState } from '@axe/domain/tabletop/turn-state';

@Injectable({ providedIn: 'root' })
export class TurnOrderService {
  private readonly objectStore = inject(ObjectStore);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly inventory = inject(GameObjectInventoryService);
  private readonly chat = inject(ChatMessageService);
  private readonly selection = inject(SelectionSignalService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly t = inject(TRANSLATE_FN);

  constructor() {
    this.objectChange.onObjectChangedForIdentifier(
      'TurnState',
      () => {
        const id = this.currentIdentifier;
        if (id) this.selection.highlightObject(id);
      },
      this.destroyRef
    );
  }

  private get turnState(): TurnState {
    return this.objectStore.get<TurnState>('TurnState') ?? TurnState.instance;
  }

  get currentIdentifier(): string {
    return this.turnState.currentIdentifier;
  }

  get round(): number {
    return this.turnState.round;
  }

  orderedCharacters(): GameCharacter[] {
    return (this.inventory.tableInventory.tabletopObjects as GameCharacter[]).filter(
      (character) => !character.hideInventory
    );
  }

  setCurrent(identifier: string): void {
    const turnState = this.turnState;
    if (turnState.round < 1) turnState.round = 1;
    turnState.phase = 'acting';
    turnState.currentIdentifier = identifier;
    this.announceCharacter(identifier);
  }

  next(): void {
    const turnState = this.turnState;
    const order = this.orderedCharacters();

    if (turnState.phase === 'idle' || turnState.phase === 'roundEnd') {
      this.beginRound(turnState.round + 1);
      return;
    }
    if (turnState.phase === 'roundStart') {
      if (order.length > 0) this.enterActing(order[0].identifier);
      else this.endRound();
      return;
    }
    const index = order.findIndex((character) => character.identifier === turnState.currentIdentifier);
    if (index >= 0 && index < order.length - 1) {
      this.enterActing(order[index + 1].identifier);
    } else {
      this.endRound();
    }
  }

  prev(): void {
    const turnState = this.turnState;
    const order = this.orderedCharacters();

    if (turnState.phase === 'acting') {
      const index = order.findIndex((character) => character.identifier === turnState.currentIdentifier);
      if (index > 0) this.enterActing(order[index - 1].identifier);
      else this.beginRound(turnState.round);
      return;
    }
    if (turnState.phase === 'roundEnd') {
      if (order.length > 0) this.enterActing(order[order.length - 1].identifier);
      else this.beginRound(turnState.round);
      return;
    }
    if (turnState.phase === 'roundStart') {
      if (turnState.round > 1) this.endRound(turnState.round - 1);
      else this.toIdle();
    }
  }

  reset(): void {
    this.toIdle();
    this.chat.sendSystemMessageToMainTab(this.t('feature.turnOrder.resetAnnounce'));
  }

  private beginRound(round: number): void {
    const turnState = this.turnState;
    turnState.round = Math.max(1, round);
    turnState.phase = 'roundStart';
    turnState.currentIdentifier = '';
    this.chat.sendSystemMessageToMainTab(this.t('feature.turnOrder.roundStart', { n: turnState.round }));
  }

  private enterActing(identifier: string): void {
    const turnState = this.turnState;
    turnState.phase = 'acting';
    turnState.currentIdentifier = identifier;
    this.announceCharacter(identifier);
  }

  private endRound(round: number = this.turnState.round): void {
    const turnState = this.turnState;
    turnState.round = Math.max(1, round);
    turnState.phase = 'roundEnd';
    turnState.currentIdentifier = '';
    this.chat.sendSystemMessageToMainTab(this.t('feature.turnOrder.roundEnd', { n: turnState.round }));
  }

  private toIdle(): void {
    const turnState = this.turnState;
    turnState.round = 0;
    turnState.phase = 'idle';
    turnState.currentIdentifier = '';
  }

  private announceCharacter(identifier: string): void {
    const character = this.objectStore.get<GameCharacter>(identifier);
    if (!character) return;
    this.chat.sendSystemMessageToMainTab(this.t('feature.turnOrder.announce', { name: character.name }));
  }
}
