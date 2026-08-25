import { inject, Injectable } from '@angular/core';
import { ActiveChatTabService } from '@axe/application/chat/active-chat-tab.service';
import { ChatMessageService } from '@axe/application/chat/chat-message.service';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { callRollDiceSymbol } from '@axe/core/event/domain-events';
import { diceRollLog, RolledDie } from '@axe/domain/dice/dice-roll-log';
import { DiceSymbol } from '@axe/domain/dice/dice-symbol';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';

/**
 * Throwing the dice that stand on the table.
 *
 * A throw of several is one throw, so it sounds once and reads as one line. The line goes
 * to the tab the thrower is reading, as a coin does: a die on the table is a die like any
 * other, and its result is of no use in a tab nobody is looking at.
 */
@Injectable({ providedIn: 'root' })
export class DiceRollService {
  private readonly activeChatTab = inject(ActiveChatTabService);
  private readonly chatMessageService = inject(ChatMessageService);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly t = inject(TRANSLATE_FN);

  /** Throws one die, or a handful together. Whatever cannot be seen stays as it was. */
  roll(dice: readonly DiceSymbol[]): RolledDie[] {
    const thrown = dice.filter((die) => die.isVisible);
    if (thrown.length < 1) return [];

    const rolled = thrown.map<RolledDie>((die) => {
      callRollDiceSymbol(die.identifier);
      // The thrower watches their own die roll rather than waiting for the round trip.
      this.objectChange.notifyDiceRolled(die.identifier);
      return { name: die.name, face: die.diceRoll(), sides: die.faces.length };
    });
    SoundEffect.play(PresetSound.diceRoll1);

    this.announce(rolled);
    return rolled;
  }

  private announce(rolled: readonly RolledDie[]): void {
    const log = diceRollLog(rolled);
    if (!log) return;

    const who = PeerCursor.myCursor?.name ?? '';
    const text =
      log.count === 1
        ? this.t('feature.dice.message.rolled', { who, name: log.dice, face: log.results })
        : this.t(log.total === null ? 'feature.dice.message.rolledMany' : 'feature.dice.message.rolledManyTotal', {
            who,
            count: log.count,
            dice: log.dice,
            results: log.results,
            total: log.total ?? 0,
          });

    const tab = this.activeChatTab.current();
    const roller = PeerCursor.myCursor?.userId ?? '';
    if (tab) this.chatMessageService.sendSystemMessageToTab(tab, text, undefined, roller);
    else this.chatMessageService.sendSystemMessage(text, undefined, roller);
  }
}
