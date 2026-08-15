import { DestroyRef, inject, Injectable } from '@angular/core';
import { diceRolled$ } from '@axe/core/event/domain-events';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { ChatMessage } from '@axe/domain/chat/chat-message';
import { parseDiceChatToken } from '@axe/domain/dice/dice-chat-token';
import { linkRollsToDice } from '@axe/domain/dice/dice-link';
import { DiceSymbol } from '@axe/domain/dice/dice-symbol';

/**
 * Puts what a rolled command showed onto the dice a piece keeps on the table.
 *
 * Only the sender applies it. The faces are synchronised fields, so everybody sees them
 * turn; applying it at the receiving end as well would set the same dice twice.
 */
@Injectable({ providedIn: 'root' })
export class DiceChatEventHandlerService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly objectStore = inject(ObjectStore);

  constructor() {
    diceRolled$.subscribe((event) => {
      const source = this.objectStore.get<ChatMessage>(event.sourceMessageIdentifier);
      const result = this.objectStore.get<ChatMessage>(event.resultMessageIdentifier);
      if (!(source instanceof ChatMessage) || !(result instanceof ChatMessage)) return;
      if (!source.isSendFromSelf) return;

      const token = parseDiceChatToken(source.text);
      const rolls = result.rollDetail?.faces ?? [];
      if (!token || rolls.length < 1) return;

      const owner = this.ownerOf(token.name, source);
      if (!owner) return;

      for (const { die, face } of linkRollsToDice(this.diceOf(owner), rolls)) {
        die.face = face;
      }
    }, this.destroyRef);
  }

  /** The piece named in the token, or the one that spoke the line when it names none. */
  private ownerOf(name: string, message: ChatMessage): GameCharacter | null {
    if (name.length < 1) {
      const speaker = this.objectStore.get<GameCharacter>(message.sendFrom);
      return speaker instanceof GameCharacter ? speaker : null;
    }

    const needle = name.trim();
    return (
      this.objectStore.getObjects<GameCharacter>(GameCharacter).find((character) => character.name.trim() === needle) ??
      null
    );
  }

  /** Its dice, in the order they were made, so the same line lands the same way twice. */
  private diceOf(owner: GameCharacter): DiceSymbol[] {
    return this.objectStore
      .getObjects<DiceSymbol>(DiceSymbol)
      .filter((die) => die.ownerCharacterIdentifier === owner.identifier);
  }
}
