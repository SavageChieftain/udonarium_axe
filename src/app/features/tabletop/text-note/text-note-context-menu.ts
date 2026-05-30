import { TranslateFn } from '@axe/application/i18n/translate.token';
import { GameObjectInventoryService } from '@axe/application/inventory/game-object-inventory.service';
import { ContextMenuAction, ContextMenuSeparator } from '@axe/application/ui/context-menu.service';
import { buildLockToggleAction } from '@axe/application/ui/tabletop-context-menu-actions';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import { TextNote } from '@axe/domain/tabletop/text-note';

export function buildTextNoteContextMenu(
  textNote: TextNote,
  gridSize: number,
  inventoryService: GameObjectInventoryService,
  callbacks: {
    onSetUpright: (isUpright: boolean) => void;
    onShowDetail: () => void;
  },
  t: TranslateFn
): ContextMenuAction[] {
  return [
    {
      name: t('feature.tabletop.contextMenu.altitudeSetting'),
      action: undefined,
      subActions: [
        {
          name: t('feature.tabletop.contextMenu.altitudeZero'),
          action: () => {
            if (textNote.altitude !== 0 || textNote.posZ !== 0) {
              textNote.altitude = 0;
              textNote.posZ = 0;
              SoundEffect.play(PresetSound.sweep);
            }
          },
          altitudeHande: textNote,
        },
        textNote.isAltitudeIndicate
          ? {
              name: t('feature.tabletop.contextMenu.altitudeShowOn'),
              action: () => {
                textNote.isAltitudeIndicate = false;
                SoundEffect.play(PresetSound.sweep);
                inventoryService.notifyInventoryUpdate();
              },
            }
          : {
              name: t('feature.tabletop.contextMenu.altitudeShowOff'),
              action: () => {
                textNote.isAltitudeIndicate = true;
                SoundEffect.play(PresetSound.sweep);
                inventoryService.notifyInventoryUpdate();
              },
            },
      ],
    },
    ContextMenuSeparator,
    buildLockToggleAction(textNote.isLock, (next) => (textNote.isLock = next), t),
    ContextMenuSeparator,
    textNote.isUpright
      ? {
          name: t('feature.tabletop.contextMenu.textNoteLay'),
          action: () => {
            callbacks.onSetUpright(false);
            SoundEffect.play(PresetSound.sweep);
          },
        }
      : {
          name: t('feature.tabletop.contextMenu.textNoteUpright'),
          action: () => {
            callbacks.onSetUpright(true);
            SoundEffect.play(PresetSound.sweep);
          },
        },
    ContextMenuSeparator,
    {
      name: t('feature.tabletop.contextMenu.textNoteEdit'),
      action: () => callbacks.onShowDetail(),
    },
    {
      name: t('feature.tabletop.contextMenu.copy'),
      action: () => {
        const cloneObject = textNote.clone();
        cloneObject.location.x += gridSize;
        cloneObject.location.y += gridSize;
        cloneObject.toTopmost();
        SoundEffect.play(PresetSound.cardPut);
      },
    },
    {
      name: t('feature.tabletop.contextMenu.delete'),
      action: () => {
        textNote.destroy();
        SoundEffect.play(PresetSound.sweep);
      },
    },
  ];
}
