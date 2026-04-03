import { Network } from '@axe/core/index';
import { DiceSymbol } from '@axe/domain/dice/dice-symbol';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import { ContextMenuAction, ContextMenuSeparator } from '@axe/shared/ui/context-menu.service';

export function buildDiceSymbolContextMenu(
  diceSymbol: DiceSymbol,
  gridSize: number,
  callbacks: {
    onDiceRoll: () => void;
    onShowDetail: () => void;
  }
): ContextMenuAction[] {
  const actions: ContextMenuAction[] = [];

  if (diceSymbol.isVisible) {
    actions.push({
      name: 'ダイスを振る',
      action: () => callbacks.onDiceRoll(),
    });
  }

  if (actions.length) actions.push(ContextMenuSeparator);

  if (diceSymbol.isMine || diceSymbol.hasOwner) {
    actions.push({
      name: 'ダイスを公開',
      action: () => {
        diceSymbol.owner = '';
        SoundEffect.play(PresetSound.unlock);
      },
    });
  }

  if (!diceSymbol.isMine) {
    actions.push({
      name: '自分だけ見る',
      action: () => {
        diceSymbol.owner = Network.peerContext.userId;
        SoundEffect.play(PresetSound.lock);
      },
    });
  }

  if (diceSymbol.isVisible) {
    const subActions: ContextMenuAction[] = diceSymbol.faces.map((face) => ({
      name: `${face}`,
      action: () => {
        diceSymbol.face = face;
        SoundEffect.play(PresetSound.dicePut);
      },
    }));
    actions.push({ name: 'ダイス目を設定', action: undefined, subActions });
  }

  actions.push(ContextMenuSeparator);

  actions.push(
    diceSymbol.isLock
      ? {
          name: '固定解除',
          action: () => {
            diceSymbol.isLock = false;
            SoundEffect.play(PresetSound.unlock);
          },
        }
      : {
          name: '固定する',
          action: () => {
            diceSymbol.isLock = true;
            SoundEffect.play(PresetSound.lock);
          },
        }
  );

  actions.push(ContextMenuSeparator);

  actions.push({
    name: '詳細を表示',
    action: () => callbacks.onShowDetail(),
  });
  actions.push({
    name: 'コピーを作る',
    action: () => {
      const cloneObject = diceSymbol.clone();
      cloneObject.location.x += gridSize;
      cloneObject.location.y += gridSize;
      cloneObject.update();
      SoundEffect.play(PresetSound.dicePut);
    },
  });
  actions.push({
    name: '削除する',
    action: () => {
      diceSymbol.destroy();
      SoundEffect.play(PresetSound.sweep);
    },
  });

  return actions;
}
