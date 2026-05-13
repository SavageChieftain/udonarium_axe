import { ContextMenuAction, ContextMenuSeparator } from '@axe/application/ui/context-menu.service';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import { GameTableScratchMask } from '@axe/domain/tabletop/game-table-scratch-mask';

interface ScratchMaskContextMenuCallbacks {
  lock: () => void;
  unlock: () => void;
}

/** スクラッチマスクのコンテキストメニュー: 固定の切替と削除。 */
export function buildScratchMaskContextMenu(
  mask: GameTableScratchMask,
  isLocked: boolean,
  callbacks: ScratchMaskContextMenuCallbacks
): ContextMenuAction[] {
  return [
    {
      name: isLocked ? '固定解除' : '固定する',
      action: () => {
        if (isLocked) callbacks.unlock();
        else callbacks.lock();
      },
    },
    ContextMenuSeparator,
    {
      name: '削除する',
      action: () => {
        mask.destroy();
        SoundEffect.play(PresetSound.sweep);
      },
    },
  ];
}
