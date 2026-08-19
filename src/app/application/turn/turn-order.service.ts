import { DestroyRef, inject, Injectable } from '@angular/core';
import { ChatMessageService } from '@axe/application/chat/chat-message.service';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { GameObjectInventoryService } from '@axe/application/inventory/game-object-inventory.service';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { SelectionSignalService } from '@axe/application/ui/selection-signal.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { ExpiredBuffEntry, formatExpiredBuffs } from '@axe/domain/character/buff-expiry';
import { BuffTiming, BuffTurnActor } from '@axe/domain/character/buff-timing';
import { GameCharacter } from '@axe/domain/character/game-character';
import { TurnPhase, TurnState } from '@axe/domain/tabletop/turn-state';

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

  get phase(): TurnPhase {
    return this.turnState.phase;
  }

  get buffDecay(): boolean {
    return this.turnState.buffDecay;
  }

  setBuffDecay(enabled: boolean): void {
    this.turnState.buffDecay = enabled;
  }

  orderedCharacters(includeHidden = false): GameCharacter[] {
    const characters = this.inventory.tableInventory.tabletopObjects as GameCharacter[];
    return includeHidden ? [...characters] : characters.filter((character) => !character.hideInventory);
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
      if (order.length > 0) this.takeTurn(order[0].identifier);
      else this.finishRound();
      return;
    }
    const index = order.findIndex((character) => character.identifier === turnState.currentIdentifier);
    this.expireBuffs('turnEnd', this.actorOf(turnState.currentIdentifier));
    if (index >= 0 && index < order.length - 1) {
      this.takeTurn(order[index + 1].identifier);
    } else {
      this.finishRound();
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

  /** Hands the turn over, and lets whatever waits on its opening run out. */
  private takeTurn(identifier: string): void {
    this.enterActing(identifier);
    this.expireBuffs('turnStart', this.actorOf(identifier));
  }

  private enterActing(identifier: string): void {
    const turnState = this.turnState;
    turnState.phase = 'acting';
    turnState.currentIdentifier = identifier;
    this.announceCharacter(identifier);
  }

  /**
   * Closes the round and moves on. Only the peer that advanced it runs this, so the
   * countdown drops once even between peers.
   */
  private finishRound(): void {
    this.endRound();
    this.expireBuffs('roundEnd', { identifier: '', name: '' });
  }

  /**
   * Counts down whatever this moment belongs to. A buff pinned to a trigger character
   * waits for that character's turn, so the whole table is asked and only the buffs whose
   * moment it is answer.
   */
  private actorOf(identifier: string): BuffTurnActor {
    const character = this.objectStore.get<GameCharacter>(identifier);
    return { identifier, name: character?.name ?? '' };
  }

  private expireBuffs(timing: BuffTiming, acting: BuffTurnActor): void {
    if (!this.turnState.buffDecay) return;

    const entries: ExpiredBuffEntry[] = [];
    for (const character of this.orderedCharacters(true)) {
      const buffNames = character.buffs.expireAt(timing, acting);
      if (buffNames.length > 0) entries.push({ characterName: character.name, buffNames });
    }

    const detail = formatExpiredBuffs(entries);
    if (detail !== '') {
      this.chat.sendSystemMessageToMainTab(this.t('feature.turnOrder.buffExpired', { detail }));
    }
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
