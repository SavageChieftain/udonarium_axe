import { TranslateFn } from '@axe/application/i18n/translate.token';
import { GameObjectInventoryService } from '@axe/application/inventory/game-object-inventory.service';
import { TabletopActionService } from '@axe/application/tabletop/tabletop-action.service';
import { ContextMenuAction, ContextMenuSeparator } from '@axe/application/ui/context-menu.service';
import { PointerCoordinate } from '@axe/core/input/pointer-device.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import { RangeArea } from '@axe/domain/tabletop/range';

export function buildRangeContextMenu(
  range: RangeArea,
  gridSize: number,
  objectPosition: PointerCoordinate,
  objectStore: ObjectStore,
  inventoryService: GameObjectInventoryService,
  tabletopActionService: TabletopActionService,
  onDockingWindowOpen: () => void,
  onEdit: (r: RangeArea) => void,
  t: TranslateFn
): ContextMenuAction[] {
  const menuArray: ContextMenuAction[] = [];

  menuArray.push({
    name: t('feature.tabletop.contextMenu.altitudeSetting'),
    action: undefined,
    subActions: [
      {
        name: t('feature.tabletop.contextMenu.altitudeZero'),
        action: () => {
          if (range.altitude != 0) {
            range.altitude = 0;
            SoundEffect.play(PresetSound.sweep);
          }
        },
        altitudeHande: range,
      },
      range.isAltitudeIndicate
        ? {
            name: t('feature.tabletop.contextMenu.altitudeShowOn'),
            action: () => {
              range.isAltitudeIndicate = false;
              SoundEffect.play(PresetSound.sweep);
              inventoryService.notifyInventoryUpdate();
            },
          }
        : {
            name: t('feature.tabletop.contextMenu.altitudeShowOff'),
            action: () => {
              range.isAltitudeIndicate = true;
              SoundEffect.play(PresetSound.sweep);
              inventoryService.notifyInventoryUpdate();
            },
          },
    ],
  });

  menuArray.push(
    range.isLock
      ? {
          name: t('feature.tabletop.contextMenu.unlock'),
          action: () => {
            range.isLock = false;
            SoundEffect.play(PresetSound.unlock);
          },
        }
      : {
          name: t('feature.tabletop.contextMenu.lock'),
          action: () => {
            range.isLock = true;
            SoundEffect.play(PresetSound.lock);
          },
        }
  );
  if (
    range.type == 'CIRCLE' ||
    range.type == 'SQUARE' ||
    range.type == 'TRIANGLE' ||
    range.type == 'PENTAGON' ||
    range.type == 'HEXAGON'
  ) {
    menuArray.push(
      objectStore.get(range.followingCharctorIdentifier) != null
        ? {
            name: t('feature.tabletop.contextMenu.unfollow'),
            action: () => {
              SoundEffect.play(PresetSound.unlock);
              range.followingCharctorIdentifier = '';
            },
          }
        : {
            name: t('feature.tabletop.contextMenu.followCharacter'),
            action: () => {
              onDockingWindowOpen();
            },
          }
    );
  }
  menuArray.push(ContextMenuSeparator);
  menuArray.push({
    name: t('feature.tabletop.contextMenu.shape'),
    action: undefined,
    subActions: [
      {
        name: (range.type === 'LINE' ? '✔ ' : '') + t('feature.tabletop.contextMenu.shapeLine'),
        action: () => {
          range.type = 'LINE';
          SoundEffect.play(PresetSound.sweep);
        },
      },
      {
        name: (range.type === 'CORN' ? '✔ ' : '') + t('feature.tabletop.contextMenu.shapeCorn'),
        action: () => {
          range.type = 'CORN';
          SoundEffect.play(PresetSound.sweep);
        },
      },
      {
        name: (range.type === 'TRIANGLE' ? '✔ ' : '') + t('feature.tabletop.contextMenu.shapeTriangle'),
        action: () => {
          range.type = 'TRIANGLE';
          SoundEffect.play(PresetSound.sweep);
        },
      },
      {
        name: (range.type === 'SQUARE' ? '✔ ' : '') + t('feature.tabletop.contextMenu.shapeSquare'),
        action: () => {
          range.type = 'SQUARE';
          SoundEffect.play(PresetSound.sweep);
        },
      },
      {
        name: (range.type === 'PENTAGON' ? '✔ ' : '') + t('feature.tabletop.contextMenu.shapePentagon'),
        action: () => {
          range.type = 'PENTAGON';
          SoundEffect.play(PresetSound.sweep);
        },
      },
      {
        name: (range.type === 'HEXAGON' ? '✔ ' : '') + t('feature.tabletop.contextMenu.shapeHexagon'),
        action: () => {
          range.type = 'HEXAGON';
          SoundEffect.play(PresetSound.sweep);
        },
      },
      {
        name: (range.type === 'CIRCLE' ? '✔ ' : '') + t('feature.tabletop.contextMenu.shapeCircle'),
        action: () => {
          range.type = 'CIRCLE';
          SoundEffect.play(PresetSound.sweep);
        },
      },
    ],
  });
  menuArray.push(ContextMenuSeparator);
  menuArray.push({
    name: t('feature.tabletop.contextMenu.rangeEdit'),
    action: () => {
      onEdit(range);
    },
  });
  menuArray.push({
    name: t('feature.tabletop.contextMenu.copy'),
    action: () => {
      const cloneObject = range.clone();
      cloneObject.location.x += gridSize;
      cloneObject.location.y += gridSize;
      cloneObject.isLock = false;
      if (range.parent) range.parent.appendChild(cloneObject);
      SoundEffect.play(PresetSound.cardPut);
    },
  });
  menuArray.push({
    name: t('feature.tabletop.contextMenu.delete'),
    action: () => {
      range.destroy();
      SoundEffect.play(PresetSound.sweep);
    },
  });
  menuArray.push(ContextMenuSeparator);
  menuArray.push({
    name: t('feature.tabletop.contextMenu.createObject'),
    action: undefined,
    subActions: tabletopActionService.makeDefaultContextMenuActions(objectPosition),
  });

  return menuArray;
}
