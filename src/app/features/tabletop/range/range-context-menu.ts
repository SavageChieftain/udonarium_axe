import { PointerCoordinate } from '@axe/core/pointer-device.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import { RangeArea } from '@axe/domain/tabletop/range';
import { ContextMenuAction, ContextMenuSeparator } from '@axe/shared/context-menu.service';
import { GameObjectInventoryService } from '@axe/shared/inventory/game-object-inventory.service';
import { TabletopActionService } from '@axe/shared/tabletop-action.service';

export function buildRangeContextMenu(
  range: RangeArea,
  gridSize: number,
  objectPosition: PointerCoordinate,
  objectStore: ObjectStore,
  inventoryService: GameObjectInventoryService,
  tabletopActionService: TabletopActionService,
  onDockingWindowOpen: () => void,
  onEdit: (r: RangeArea) => void
): ContextMenuAction[] {
  const menuArray: ContextMenuAction[] = [];

  menuArray.push({
    name: '高度設定',
    action: undefined,
    subActions: [
      {
        name: '高度を0にする',
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
            name: '☑ 高度の表示',
            action: () => {
              range.isAltitudeIndicate = false;
              SoundEffect.play(PresetSound.sweep);
              inventoryService.notifyInventoryUpdate();
            },
          }
        : {
            name: '☐ 高度の表示',
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
          name: '固定解除',
          action: () => {
            range.isLock = false;
            SoundEffect.play(PresetSound.unlock);
          },
        }
      : {
          name: '固定する',
          action: () => {
            range.isLock = true;
            SoundEffect.play(PresetSound.lock);
          },
        }
  );
  if (range.type == 'CIRCLE' || range.type == 'SQUARE' || range.type == 'DIAMOND') {
    menuArray.push(
      objectStore.get(range.followingCharctorIdentifier) != null
        ? {
            name: '追従を解除',
            action: () => {
              SoundEffect.play(PresetSound.unlock);
              range.followingCharctorIdentifier = null!;
            },
          }
        : {
            name: 'キャラクターに追従',
            action: () => {
              onDockingWindowOpen();
            },
          }
    );
  }
  menuArray.push(ContextMenuSeparator);
  menuArray.push({
    name: '射程範囲を編集',
    action: () => {
      onEdit(range);
    },
  });
  menuArray.push({
    name: 'コピーを作る',
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
    name: '削除する',
    action: () => {
      range.destroy();
      SoundEffect.play(PresetSound.sweep);
    },
  });
  menuArray.push(ContextMenuSeparator);
  menuArray.push({
    name: 'オブジェクト作成',
    action: undefined,
    subActions: tabletopActionService.makeDefaultContextMenuActions(objectPosition),
  });

  return menuArray;
}
