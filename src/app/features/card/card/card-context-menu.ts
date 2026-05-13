import { ContextMenuAction, ContextMenuSeparator } from '@axe/application/ui/context-menu.service';
import { Network } from '@axe/core/index';
import { Card, CardState } from '@axe/domain/card/card';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';

export function buildCardContextMenu(
  card: Card,
  gridSize: number,
  callbacks: {
    onCreateStack: () => void;
    onShowDetail: () => void;
  }
): ContextMenuAction[] {
  const menuArray: ContextMenuAction[] = [];

  menuArray.push(
    card.isLock
      ? {
          name: '固定解除',
          action: () => {
            card.isLock = false;
            card.dispLockMark = true;
            SoundEffect.play(PresetSound.unlock);
          },
        }
      : {
          name: '固定する',
          action: () => {
            card.isLock = true;
            SoundEffect.play(PresetSound.lock);
          },
        }
  );

  if (card.isLock) {
    menuArray.push(
      card.dispLockMark
        ? {
            name: '固定マーク消去',
            action: () => {
              card.dispLockMark = false;
              SoundEffect.play(PresetSound.lock);
            },
          }
        : {
            name: '固定マーク表示',
            action: () => {
              card.dispLockMark = true;
              SoundEffect.play(PresetSound.lock);
            },
          }
    );
  }

  menuArray.push(ContextMenuSeparator);

  menuArray.push(
    !card.isVisible || card.isHand
      ? {
          name: '表にする',
          action: () => {
            card.faceUp();
            SoundEffect.play(PresetSound.cardDraw);
          },
        }
      : {
          name: '裏にする',
          action: () => {
            card.faceDown();
            SoundEffect.play(PresetSound.cardDraw);
          },
        }
  );

  menuArray.push(
    card.isHand
      ? {
          name: '裏にする',
          action: () => {
            card.faceDown();
            SoundEffect.play(PresetSound.cardDraw);
          },
        }
      : {
          name: '自分だけ見る',
          action: () => {
            SoundEffect.play(PresetSound.cardDraw);
            card.state = CardState.BACK;
            card.owner = Network.peerContext.userId;
          },
        }
  );

  menuArray.push(ContextMenuSeparator);

  menuArray.push({
    name: '重なったカードで山札を作る',
    action: () => {
      callbacks.onCreateStack();
      SoundEffect.play(PresetSound.cardPut);
    },
  });
  menuArray.push({
    name: 'カードを編集',
    action: () => {
      callbacks.onShowDetail();
    },
  });
  menuArray.push({
    name: 'コピーを作る',
    action: () => {
      const cloneObject = card.clone();
      cloneObject.location.x += gridSize;
      cloneObject.location.y += gridSize;
      cloneObject.toTopmost();
      SoundEffect.play(PresetSound.cardPut);
    },
  });
  menuArray.push({
    name: '削除する',
    action: () => {
      card.destroy();
      SoundEffect.play(PresetSound.sweep);
    },
  });

  return menuArray;
}
