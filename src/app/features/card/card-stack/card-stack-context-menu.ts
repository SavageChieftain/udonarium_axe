import { TranslateFn } from '@axe/application/i18n/translate.token';
import { ContextMenuAction, ContextMenuSeparator } from '@axe/application/ui/context-menu.service';
import { buildLockToggleAction } from '@axe/application/ui/tabletop-context-menu-actions';
import { callShuffleCardStack } from '@axe/core/event/domain-events';
import { Network } from '@axe/core/index';
import { CardStack } from '@axe/domain/card/card-stack';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';

export function buildCardStackContextMenu(
  cardStack: CardStack,
  gridSize: number,
  onDrawCard: () => unknown,
  onDrawToHand: () => unknown,
  onDrawCards: () => unknown,
  onSplitStack: (n: number) => void,
  onBreakStack: () => void,
  onShowDetail: (cs: CardStack) => void,
  t: TranslateFn
): ContextMenuAction[] {
  return [
    buildLockToggleAction(cardStack.isLock, (next) => (cardStack.isLock = next), t),
    ContextMenuSeparator,
    {
      name: t('feature.cardStack.contextMenu.drawOne'),
      action: () => {
        if (onDrawCard() != null) {
          SoundEffect.play(PresetSound.cardDraw);
        }
      },
    },
    {
      name: t('feature.cardStack.contextMenu.drawToHand'),
      action: () => {
        if (onDrawToHand() != null) {
          SoundEffect.play(PresetSound.cardDraw);
        }
      },
    },
    {
      name: t('feature.cardStack.contextMenu.drawMany'),
      action: () => {
        onDrawCards();
      },
    },
    ContextMenuSeparator,
    {
      name: t('feature.cardStack.contextMenu.topFaceUp'),
      action: () => {
        cardStack.faceUp();
        SoundEffect.play(PresetSound.cardDraw);
      },
    },
    {
      name: t('feature.cardStack.contextMenu.topFaceDown'),
      action: () => {
        cardStack.faceDown();
        SoundEffect.play(PresetSound.cardDraw);
      },
    },
    ContextMenuSeparator,
    {
      name: t('feature.cardStack.contextMenu.allFaceUp'),
      action: () => {
        cardStack.faceUpAll();
        SoundEffect.play(PresetSound.cardDraw);
      },
    },
    {
      name: t('feature.cardStack.contextMenu.allFaceDown'),
      action: () => {
        cardStack.faceDownAll();
        SoundEffect.play(PresetSound.cardDraw);
      },
    },
    {
      name: t('feature.cardStack.contextMenu.allUpright'),
      action: () => {
        cardStack.uprightAll();
        SoundEffect.play(PresetSound.cardDraw);
      },
    },
    ContextMenuSeparator,
    {
      name: t('feature.cardStack.contextMenu.shuffle'),
      action: () => {
        cardStack.shuffle();
        SoundEffect.play(PresetSound.cardShuffle);
        callShuffleCardStack(cardStack.identifier);
      },
    },
    ContextMenuSeparator,
    cardStack.isShowTotal
      ? {
          name: t('feature.cardStack.contextMenu.hideCount'),
          action: () => {
            cardStack.isShowTotal = false;
          },
        }
      : {
          name: t('feature.cardStack.contextMenu.showCount'),
          action: () => {
            cardStack.isShowTotal = true;
          },
        },
    {
      name: t('feature.cardStack.contextMenu.unifySize'),
      action: () => {
        if (cardStack.topCard) cardStack.unifyCardsSize(cardStack.topCard.size);
      },
    },
    ContextMenuSeparator,
    {
      name: t('feature.cardStack.contextMenu.splitByPeers'),
      action: () => {
        onSplitStack(Network.peerIds.length);
        SoundEffect.play(PresetSound.cardDraw);
      },
    },
    {
      name: t('feature.cardStack.contextMenu.breakStack'),
      action: () => {
        onBreakStack();
        SoundEffect.play(PresetSound.cardShuffle);
      },
    },
    ContextMenuSeparator,
    {
      name: t('feature.character.contextMenu.showDetail'),
      action: () => {
        onShowDetail(cardStack);
      },
    },
    {
      name: t('feature.tabletop.contextMenu.copy'),
      action: () => {
        const cloneObject = cardStack.clone();
        cloneObject.location.x += gridSize;
        cloneObject.location.y += gridSize;
        cloneObject.owner = '';
        cloneObject.toTopmost();
        SoundEffect.play(PresetSound.cardPut);
      },
    },
    {
      name: t('feature.cardStack.contextMenu.deleteStack'),
      action: () => {
        cardStack.setLocation('graveyard');
        cardStack.destroy();
        SoundEffect.play(PresetSound.sweep);
      },
    },
  ];
}
