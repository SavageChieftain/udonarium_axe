import { TranslateFn } from '@axe/application/i18n/translate.token';
import { GameObjectInventoryService } from '@axe/application/inventory/game-object-inventory.service';
import { ContextMenuAction, ContextMenuSeparator } from '@axe/application/ui/context-menu.service';
import { Network } from '@axe/core/index';
import { GameCharacter } from '@axe/domain/character/game-character';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';

export function buildGameCharacterContextMenu(
  char: GameCharacter,
  gridSize: number,
  inventoryService: GameObjectInventoryService,
  callbacks: {
    onShowDetail: () => void;
    onShowChatPalette: () => void;
    onShowRemoteController: () => void;
    onShowBuffEdit: () => void;
  },
  t: TranslateFn,
  overlapEntries: ContextMenuAction[] = []
): ContextMenuAction[] {
  return [
    ...(overlapEntries.length > 0 ? [...overlapEntries, ContextMenuSeparator] : []),
    {
      name: t('feature.tabletop.contextMenu.altitudeSetting'),
      action: undefined,
      subActions: [
        {
          name: t('feature.tabletop.contextMenu.altitudeZero'),
          action: () => {
            if (char.altitude !== 0 || char.posZ !== 0) {
              char.altitude = 0;
              char.posZ = 0;
              SoundEffect.play(PresetSound.sweep);
            }
          },
          altitudeHande: char,
        },
        char.isAltitudeIndicate
          ? {
              name: t('feature.tabletop.contextMenu.altitudeShowOn'),
              action: () => {
                char.isAltitudeIndicate = false;
                SoundEffect.play(PresetSound.sweep);
                inventoryService.notifyInventoryUpdate();
              },
            }
          : {
              name: t('feature.tabletop.contextMenu.altitudeShowOff'),
              action: () => {
                char.isAltitudeIndicate = true;
                SoundEffect.play(PresetSound.sweep);
                inventoryService.notifyInventoryUpdate();
              },
            },
        char.isDropShadow
          ? {
              name: t('feature.tabletop.contextMenu.shadowShowOn'),
              action: () => {
                char.isDropShadow = false;
                SoundEffect.play(PresetSound.sweep);
                inventoryService.notifyInventoryUpdate();
              },
            }
          : {
              name: t('feature.tabletop.contextMenu.shadowShowOff'),
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
      name: t('feature.character.contextMenu.showDetail'),
      action: () => callbacks.onShowDetail(),
    },
    {
      name: t('feature.character.contextMenu.showChatPalette'),
      action: () => callbacks.onShowChatPalette(),
    },
    {
      name: t('feature.character.contextMenu.showRemoteController'),
      action: () => callbacks.onShowRemoteController(),
    },
    {
      name: t('feature.character.contextMenu.editBuff'),
      action: () => callbacks.onShowBuffEdit(),
    },
    char.hideInventory
      ? {
          name: t('feature.character.contextMenu.hideInventoryOn'),
          action: () => {
            char.hideInventory = false;
            inventoryService.notifyInventoryUpdate();
            SoundEffect.play(PresetSound.sweep);
          },
        }
      : {
          name: t('feature.character.contextMenu.hideInventoryOff'),
          action: () => {
            char.hideInventory = true;
            inventoryService.notifyInventoryUpdate();
            SoundEffect.play(PresetSound.sweep);
          },
        },
    char.nonTalkFlag
      ? {
          name: t('feature.character.contextMenu.nonTalkOn'),
          action: () => {
            char.nonTalkFlag = false;
            inventoryService.notifyInventoryUpdate();
            SoundEffect.play(PresetSound.sweep);
          },
        }
      : {
          name: t('feature.character.contextMenu.nonTalkOff'),
          action: () => {
            char.nonTalkFlag = true;
            inventoryService.notifyInventoryUpdate();
            SoundEffect.play(PresetSound.sweep);
          },
        },
    ContextMenuSeparator,
    {
      name: t('feature.character.contextMenu.moveCommon'),
      action: () => {
        char.setLocation('common');
        SoundEffect.play(PresetSound.piecePut);
      },
    },
    {
      name: t('feature.character.contextMenu.movePersonal'),
      action: () => {
        char.setLocation(Network.peerId);
        SoundEffect.play(PresetSound.piecePut);
      },
    },
    {
      name: t('feature.character.contextMenu.moveGraveyard'),
      action: () => {
        char.setLocation('graveyard');
        SoundEffect.play(PresetSound.sweep);
      },
    },
    ContextMenuSeparator,
    char.isLock
      ? {
          name: t('feature.tabletop.contextMenu.unlock'),
          action: () => {
            char.isLock = false;
            SoundEffect.play(PresetSound.unlock);
          },
        }
      : {
          name: t('feature.tabletop.contextMenu.lock'),
          action: () => {
            char.isLock = true;
            SoundEffect.play(PresetSound.lock);
          },
        },
    ContextMenuSeparator,
    {
      name: t('feature.tabletop.contextMenu.copy'),
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
