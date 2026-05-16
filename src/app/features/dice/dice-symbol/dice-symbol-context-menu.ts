import { TranslateFn } from '@axe/application/i18n/translate.token';
import { ContextMenuAction, ContextMenuSeparator } from '@axe/application/ui/context-menu.service';
import { Network } from '@axe/core/index';
import { DiceSymbol } from '@axe/domain/dice/dice-symbol';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';

export function buildDiceSymbolContextMenu(
  diceSymbol: DiceSymbol,
  gridSize: number,
  callbacks: {
    onDiceRoll: () => void;
    onShowDetail: () => void;
  },
  t: TranslateFn
): ContextMenuAction[] {
  const actions: ContextMenuAction[] = [];

  if (diceSymbol.isVisible) {
    actions.push({
      name: t('feature.dice.contextMenu.rollDice'),
      action: () => callbacks.onDiceRoll(),
    });
  }

  if (actions.length) actions.push(ContextMenuSeparator);

  if (diceSymbol.isMine || diceSymbol.hasOwner) {
    actions.push({
      name: t('feature.dice.contextMenu.showDice'),
      action: () => {
        diceSymbol.owner = '';
        SoundEffect.play(PresetSound.unlock);
      },
    });
  }

  if (!diceSymbol.isMine) {
    actions.push({
      name: t('feature.dice.contextMenu.showSelfOnly'),
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
    actions.push({ name: t('feature.dice.contextMenu.setFace'), action: undefined, subActions });
  }

  actions.push(ContextMenuSeparator);

  actions.push(
    diceSymbol.isLock
      ? {
          name: t('feature.tabletop.contextMenu.unlock'),
          action: () => {
            diceSymbol.isLock = false;
            SoundEffect.play(PresetSound.unlock);
          },
        }
      : {
          name: t('feature.tabletop.contextMenu.lock'),
          action: () => {
            diceSymbol.isLock = true;
            SoundEffect.play(PresetSound.lock);
          },
        }
  );

  actions.push(ContextMenuSeparator);

  actions.push({
    name: t('feature.character.contextMenu.showDetail'),
    action: () => callbacks.onShowDetail(),
  });
  actions.push({
    name: t('feature.tabletop.contextMenu.copy'),
    action: () => {
      const cloneObject = diceSymbol.clone();
      cloneObject.location.x += gridSize;
      cloneObject.location.y += gridSize;
      cloneObject.update();
      SoundEffect.play(PresetSound.dicePut);
    },
  });
  actions.push({
    name: t('feature.tabletop.contextMenu.delete'),
    action: () => {
      diceSymbol.destroy();
      SoundEffect.play(PresetSound.sweep);
    },
  });

  return actions;
}
