import { computed, inject, type Signal } from '@angular/core';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { TurnOrderService } from '@axe/application/turn/turn-order.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { buildTurnIndicator, type TurnIndicator } from '@axe/ui/turn/turn-indicator';

/**
 * 手番の見出しを追う signal。
 *
 * 同じ配線を画面ごとに書き写すと、直すときに書き漏らす。注入できる場所から呼ぶ。
 */
export function turnIndicatorSignal(): Signal<TurnIndicator | null> {
  const objectChange = inject(ObjectChangeService);
  const objectStore = inject(ObjectStore);
  const turnOrder = inject(TurnOrderService);

  return computed(() => {
    objectChange.versionOf('TurnState')();
    const currentIdentifier = turnOrder.currentIdentifier;
    if (currentIdentifier) objectChange.versionOf(currentIdentifier)();
    const current = currentIdentifier ? objectStore.get(currentIdentifier) : null;
    const name = current instanceof GameCharacter ? current.name : '';
    return buildTurnIndicator(turnOrder.phase, turnOrder.round, name);
  });
}
