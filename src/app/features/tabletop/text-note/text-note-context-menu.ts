import { GameObjectInventoryService } from '@axe/application/inventory/game-object-inventory.service';
import { ContextMenuAction, ContextMenuSeparator } from '@axe/application/ui/context-menu.service';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import { TextNote } from '@axe/domain/tabletop/text-note';

export function buildTextNoteContextMenu(
  textNote: TextNote,
  gridSize: number,
  inventoryService: GameObjectInventoryService,
  callbacks: {
    onSetUpright: (isUpright: boolean) => void;
    onShowDetail: () => void;
  }
): ContextMenuAction[] {
  return [
    {
      name: '高度設定',
      action: undefined,
      subActions: [
        {
          name: '高度を0にする',
          action: () => {
            if (textNote.altitude != 0) {
              textNote.altitude = 0;
              SoundEffect.play(PresetSound.sweep);
            }
          },
          altitudeHande: textNote,
        },
        textNote.isAltitudeIndicate
          ? {
              name: '☑ 高度の表示',
              action: () => {
                textNote.isAltitudeIndicate = false;
                SoundEffect.play(PresetSound.sweep);
                inventoryService.notifyInventoryUpdate();
              },
            }
          : {
              name: '☐ 高度の表示',
              action: () => {
                textNote.isAltitudeIndicate = true;
                SoundEffect.play(PresetSound.sweep);
                inventoryService.notifyInventoryUpdate();
              },
            },
      ],
    },
    ContextMenuSeparator,
    textNote.isLock
      ? {
          name: '固定解除',
          action: () => {
            textNote.isLock = false;
            SoundEffect.play(PresetSound.unlock);
          },
        }
      : {
          name: '固定する',
          action: () => {
            textNote.isLock = true;
            SoundEffect.play(PresetSound.lock);
          },
        },
    ContextMenuSeparator,
    textNote.isUpright
      ? {
          name: '寝かせる',
          action: () => {
            callbacks.onSetUpright(false);
            SoundEffect.play(PresetSound.sweep);
          },
        }
      : {
          name: '直立させる',
          action: () => {
            callbacks.onSetUpright(true);
            SoundEffect.play(PresetSound.sweep);
          },
        },
    ContextMenuSeparator,
    {
      name: 'メモを編集',
      action: () => callbacks.onShowDetail(),
    },
    {
      name: 'コピーを作る',
      action: () => {
        const cloneObject = textNote.clone();
        cloneObject.location.x += gridSize;
        cloneObject.location.y += gridSize;
        cloneObject.toTopmost();
        SoundEffect.play(PresetSound.cardPut);
      },
    },
    {
      name: '削除する',
      action: () => {
        textNote.destroy();
        SoundEffect.play(PresetSound.sweep);
      },
    },
  ];
}
