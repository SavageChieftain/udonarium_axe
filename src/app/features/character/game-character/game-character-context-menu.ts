import { Network } from '@axe/core/index';
import { GameCharacter } from '@axe/domain/character/game-character';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import { GameObjectInventoryService } from '@axe/shared/inventory/game-object-inventory.service';
import { ContextMenuAction, ContextMenuSeparator } from '@axe/shared/ui/context-menu.service';

export function buildGameCharacterContextMenu(
  char: GameCharacter,
  gridSize: number,
  inventoryService: GameObjectInventoryService,
  callbacks: {
    onShowDetail: () => void;
    onShowChatPalette: () => void;
    onShowRemoteController: () => void;
    onShowBuffEdit: () => void;
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
            if (char.altitude != 0) {
              char.altitude = 0;
              SoundEffect.play(PresetSound.sweep);
            }
          },
          altitudeHande: char,
        },
        char.isAltitudeIndicate
          ? {
              name: '☑ 高度の表示',
              action: () => {
                char.isAltitudeIndicate = false;
                SoundEffect.play(PresetSound.sweep);
                inventoryService.notifyInventoryUpdate();
              },
            }
          : {
              name: '☐ 高度の表示',
              action: () => {
                char.isAltitudeIndicate = true;
                SoundEffect.play(PresetSound.sweep);
                inventoryService.notifyInventoryUpdate();
              },
            },
        char.isDropShadow
          ? {
              name: '☑ 影の表示',
              action: () => {
                char.isDropShadow = false;
                SoundEffect.play(PresetSound.sweep);
                inventoryService.notifyInventoryUpdate();
              },
            }
          : {
              name: '☐ 影の表示',
              action: () => {
                char.isDropShadow = true;
                SoundEffect.play(PresetSound.sweep);
                inventoryService.notifyInventoryUpdate();
              },
            },
      ],
    },
    ContextMenuSeparator,
    {
      name: '詳細を表示',
      action: () => callbacks.onShowDetail(),
    },
    {
      name: 'チャットパレットを表示',
      action: () => callbacks.onShowChatPalette(),
    },
    {
      name: 'リモコンを表示',
      action: () => callbacks.onShowRemoteController(),
    },
    {
      name: 'バフ編集',
      action: () => callbacks.onShowBuffEdit(),
    },
    ContextMenuSeparator,
    {
      name: '共有イベントリに移動',
      action: () => {
        char.setLocation('common');
        SoundEffect.play(PresetSound.piecePut);
      },
    },
    {
      name: '個人イベントリに移動',
      action: () => {
        char.setLocation(Network.peerId);
        SoundEffect.play(PresetSound.piecePut);
      },
    },
    {
      name: '墓場に移動',
      action: () => {
        char.setLocation('graveyard');
        SoundEffect.play(PresetSound.sweep);
      },
    },
    ContextMenuSeparator,
    char.isLock
      ? {
          name: '固定解除',
          action: () => {
            char.isLock = false;
            SoundEffect.play(PresetSound.unlock);
          },
        }
      : {
          name: '固定する',
          action: () => {
            char.isLock = true;
            SoundEffect.play(PresetSound.lock);
          },
        },
    ContextMenuSeparator,
    {
      name: 'コピーを作る',
      action: () => {
        const cloneObject = char.clone();
        cloneObject.location.x += gridSize;
        cloneObject.location.y += gridSize;
        cloneObject.update();
        SoundEffect.play(PresetSound.piecePut);
      },
    },
  ];
}
