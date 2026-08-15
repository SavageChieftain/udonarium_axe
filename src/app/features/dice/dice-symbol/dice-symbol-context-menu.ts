import { TranslateFn } from '@axe/application/i18n/translate.token';
import { ContextMenuAction, ContextMenuSeparator } from '@axe/application/ui/context-menu.service';
import { buildCopyAction, buildLockToggleAction } from '@axe/application/ui/tabletop-context-menu-actions';
import { Network } from '@axe/core/index';
import { DiceSymbol } from '@axe/domain/dice/dice-symbol';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';

export interface DiceOwnerCandidate {
  identifier: string;
  name: string;
}

export function buildDiceSymbolContextMenu(
  diceSymbol: DiceSymbol,
  gridSize: number,
  callbacks: {
    onDiceRoll: () => void;
    onShowDetail: () => void;
    /** The pieces the die can be given to. Left out where there are none to offer. */
    ownerCandidates?: DiceOwnerCandidate[];
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

  const candidates = callbacks.ownerCandidates ?? [];
  if (candidates.length > 0 || diceSymbol.ownerCharacterIdentifier.length > 0) {
    // Whose die it is, which is apart from who may see the face.
    const subActions: ContextMenuAction[] = candidates.map((candidate) => ({
      name: `${diceSymbol.ownerCharacterIdentifier === candidate.identifier ? '☑' : '☐'} ${candidate.name}`,
      action: () => {
        diceSymbol.ownerCharacterIdentifier = candidate.identifier;
        SoundEffect.play(PresetSound.dicePut);
      },
    }));
    if (diceSymbol.ownerCharacterIdentifier.length > 0) {
      subActions.push({
        name: t('feature.dice.contextMenu.ownerNone'),
        action: () => {
          diceSymbol.ownerCharacterIdentifier = '';
          SoundEffect.play(PresetSound.sweep);
        },
      });
    }
    actions.push({ name: t('feature.dice.contextMenu.owner'), action: undefined, subActions });
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

  actions.push(buildLockToggleAction(diceSymbol.isLock, (next) => (diceSymbol.isLock = next), t));

  actions.push(
    diceSymbol.hideName
      ? {
          name: t('feature.dice.contextMenu.hideNameOn'),
          action: () => {
            diceSymbol.hideName = false;
            SoundEffect.play(PresetSound.sweep);
          },
        }
      : {
          name: t('feature.dice.contextMenu.hideNameOff'),
          action: () => {
            diceSymbol.hideName = true;
            SoundEffect.play(PresetSound.sweep);
          },
        }
  );

  actions.push(ContextMenuSeparator);

  actions.push({
    name: t('feature.character.contextMenu.showDetail'),
    action: () => callbacks.onShowDetail(),
  });
  actions.push(buildCopyAction(diceSymbol, gridSize, t, { sound: PresetSound.dicePut }));
  actions.push({
    name: t('feature.tabletop.contextMenu.delete'),
    action: () => {
      diceSymbol.destroy();
      SoundEffect.play(PresetSound.sweep);
    },
  });

  return actions;
}
