import { Network } from '@axe/core/index';
import { CardStack } from '@axe/domain/card/card-stack';
import { callShuffleCardStack } from '@axe/domain/domain-events';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import { ContextMenuAction, ContextMenuSeparator } from '@axe/shared/context-menu.service';

export function buildCardStackContextMenu(
  cardStack: CardStack,
  gridSize: number,
  onDrawCard: () => unknown,
  onShowStackList: (cs: CardStack) => void,
  onSplitStack: (n: number) => void,
  onBreakStack: () => void,
  onShowDetail: (cs: CardStack) => void
): ContextMenuAction[] {
  return [
    cardStack.isLock
      ? {
          name: '固定解除',
          action: () => {
            cardStack.isLock = false;
            SoundEffect.play(PresetSound.unlock);
          },
        }
      : {
          name: '固定する',
          action: () => {
            cardStack.isLock = true;
            SoundEffect.play(PresetSound.lock);
          },
        },
    ContextMenuSeparator,
    {
      name: '１枚引く',
      action: () => {
        if (onDrawCard() != null) {
          SoundEffect.play(PresetSound.cardDraw);
        }
      },
    },
    ContextMenuSeparator,
    {
      name: '一番上を表にする',
      action: () => {
        cardStack.faceUp();
        SoundEffect.play(PresetSound.cardDraw);
      },
    },
    {
      name: '一番上を裏にする',
      action: () => {
        cardStack.faceDown();
        SoundEffect.play(PresetSound.cardDraw);
      },
    },
    ContextMenuSeparator,
    {
      name: 'すべて表にする',
      action: () => {
        cardStack.faceUpAll();
        SoundEffect.play(PresetSound.cardDraw);
      },
    },
    {
      name: 'すべて裏にする',
      action: () => {
        cardStack.faceDownAll();
        SoundEffect.play(PresetSound.cardDraw);
      },
    },
    {
      name: 'すべて正位置にする',
      action: () => {
        cardStack.uprightAll();
        SoundEffect.play(PresetSound.cardDraw);
      },
    },
    ContextMenuSeparator,
    {
      name: 'シャッフル',
      action: () => {
        cardStack.shuffle();
        SoundEffect.play(PresetSound.cardShuffle);
        callShuffleCardStack(cardStack.identifier);
      },
    },
    {
      name: 'カード一覧',
      action: () => {
        onShowStackList(cardStack);
      },
    },
    ContextMenuSeparator,
    cardStack.isShowTotal
      ? {
          name: '枚数を非表示にする',
          action: () => {
            cardStack.isShowTotal = false;
          },
        }
      : {
          name: '枚数を表示する',
          action: () => {
            cardStack.isShowTotal = true;
          },
        },
    {
      name: 'カードサイズを揃える',
      action: () => {
        if (cardStack.topCard) cardStack.unifyCardsSize(cardStack.topCard.size);
      },
    },
    ContextMenuSeparator,
    {
      name: '山札を人数分に分割する',
      action: () => {
        onSplitStack(Network.peerIds.length);
        SoundEffect.play(PresetSound.cardDraw);
      },
    },
    {
      name: '山札を崩す',
      action: () => {
        onBreakStack();
        SoundEffect.play(PresetSound.cardShuffle);
      },
    },
    ContextMenuSeparator,
    {
      name: '詳細を表示',
      action: () => {
        onShowDetail(cardStack);
      },
    },
    {
      name: 'コピーを作る',
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
      name: '山札を削除する',
      action: () => {
        cardStack.setLocation('graveyard');
        cardStack.destroy();
        SoundEffect.play(PresetSound.sweep);
      },
    },
  ];
}
