import { TranslateFn } from '@axe/application/i18n/translate.token';
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
  },
  t: TranslateFn
): ContextMenuAction[] {
  const menuArray: ContextMenuAction[] = [];

  menuArray.push(
    card.isLock
      ? {
          name: t('feature.tabletop.contextMenu.unlock'),
          action: () => {
            card.isLock = false;
            card.dispLockMark = true;
            SoundEffect.play(PresetSound.unlock);
          },
        }
      : {
          name: t('feature.tabletop.contextMenu.lock'),
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
            name: t('feature.tabletop.contextMenu.lockMarkHide'),
            action: () => {
              card.dispLockMark = false;
              SoundEffect.play(PresetSound.lock);
            },
          }
        : {
            name: t('feature.tabletop.contextMenu.lockMarkShow'),
            action: () => {
              card.dispLockMark = true;
              SoundEffect.play(PresetSound.lock);
            },
          }
    );
  }

  menuArray.push(ContextMenuSeparator);

  menuArray.push(
    !card.isVisible || card.isPeeking
      ? {
          name: t('feature.card.contextMenu.faceUp'),
          action: () => {
            card.faceUp();
            SoundEffect.play(PresetSound.cardDraw);
          },
        }
      : {
          name: t('feature.card.contextMenu.faceDown'),
          action: () => {
            card.faceDown();
            SoundEffect.play(PresetSound.cardDraw);
          },
        }
  );

  menuArray.push(
    card.isPeeking
      ? {
          name: t('feature.card.contextMenu.faceDown'),
          action: () => {
            card.faceDown();
            SoundEffect.play(PresetSound.cardDraw);
          },
        }
      : {
          name: t('feature.card.contextMenu.showSelfOnly'),
          action: () => {
            SoundEffect.play(PresetSound.cardDraw);
            card.state = CardState.BACK;
            card.owner = Network.peerContext.userId;
          },
        }
  );

  menuArray.push({
    name: t('feature.card.contextMenu.toHand'),
    action: () => {
      card.toHand(Network.peerContext.userId);
      SoundEffect.play(PresetSound.cardDraw);
    },
  });

  menuArray.push(ContextMenuSeparator);

  menuArray.push({
    name: t('feature.card.contextMenu.createStack'),
    action: () => {
      callbacks.onCreateStack();
      SoundEffect.play(PresetSound.cardPut);
    },
  });
  menuArray.push({
    name: t('feature.card.contextMenu.editCard'),
    action: () => {
      callbacks.onShowDetail();
    },
  });
  menuArray.push({
    name: t('feature.tabletop.contextMenu.copy'),
    action: () => {
      const cloneObject = card.clone();
      cloneObject.location.x += gridSize;
      cloneObject.location.y += gridSize;
      cloneObject.toTopmost();
      SoundEffect.play(PresetSound.cardPut);
    },
  });
  menuArray.push({
    name: t('feature.tabletop.contextMenu.delete'),
    action: () => {
      card.destroy();
      SoundEffect.play(PresetSound.sweep);
    },
  });

  return menuArray;
}
