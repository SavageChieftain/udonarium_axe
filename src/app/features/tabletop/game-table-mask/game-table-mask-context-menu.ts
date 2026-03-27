import { PointerCoordinate } from '@axe/core/pointer-device.service';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import { GameTableMask } from '@axe/domain/tabletop/game-table-mask';
import { ContextMenuAction, ContextMenuSeparator } from '@axe/shared/context-menu.service';
import { GameObjectInventoryService } from '@axe/shared/inventory/game-object-inventory.service';
import { TabletopActionService } from '@axe/shared/tabletop/tabletop-action.service';

export interface MaskMenuParams {
  mask: GameTableMask;
  gridSize: number;
  objectPosition: PointerCoordinate;
  inventoryService: GameObjectInventoryService;
  tabletopActionService: TabletopActionService;
  onStartScratch(): void;
  onFinishScratch(): void;
  onCancelScratch(): void;
  onEdit(mask: GameTableMask): void;
}

export function buildGameTableMaskContextMenu(params: MaskMenuParams): ContextMenuAction[] {
  const {
    mask,
    gridSize,
    objectPosition,
    inventoryService,
    tabletopActionService,
    onStartScratch,
    onFinishScratch,
    onCancelScratch,
    onEdit,
  } = params;

  const menuArray: ContextMenuAction[] = [];
  menuArray.push(
    {
      name: '高度設定',
      action: undefined,
      subActions: [
        {
          name: '高度を0にする',
          action: () => {
            if (mask.altitude != 0) {
              mask.altitude = 0;
              SoundEffect.play(PresetSound.sweep);
            }
          },
          altitudeHande: mask,
        },
        mask.isAltitudeIndicate
          ? {
              name: '☑ 高度の表示',
              action: () => {
                mask.isAltitudeIndicate = false;
                SoundEffect.play(PresetSound.sweep);
                inventoryService.notifyInventoryUpdate();
              },
            }
          : {
              name: '☐ 高度の表示',
              action: () => {
                mask.isAltitudeIndicate = true;
                SoundEffect.play(PresetSound.sweep);
                inventoryService.notifyInventoryUpdate();
              },
            },
      ],
    },
    ContextMenuSeparator,
    mask.isLock
      ? {
          name: '固定解除',
          action: () => {
            mask.isLock = false;
            mask.dispLockMark = true;
            SoundEffect.play(PresetSound.unlock);
          },
        }
      : {
          name: '固定する',
          action: () => {
            mask.isLock = true;
            SoundEffect.play(PresetSound.lock);
          },
        }
  );
  if (mask.isLock) {
    menuArray.push(
      mask.dispLockMark
        ? {
            name: '固定マーク消去',
            action: () => {
              mask.dispLockMark = false;
              SoundEffect.play(PresetSound.lock);
            },
          }
        : {
            name: '固定マーク表示',
            action: () => {
              mask.dispLockMark = true;
              SoundEffect.play(PresetSound.lock);
            },
          }
    );
  }
  if (!mask.isMine) {
    menuArray.push({
      name: 'スクラッチ開始',
      action: () => {
        SoundEffect.play(PresetSound.cardDraw);
        onStartScratch();
        SoundEffect.play(PresetSound.lock);
      },
    });
  } else {
    menuArray.push({
      name: 'スクラッチ確定',
      action: () => {
        onFinishScratch();
      },
    });
  }
  if (mask.isMine) {
    menuArray.push({
      name: 'スクラッチキャンセル',
      action: () => {
        SoundEffect.play(PresetSound.cardDraw);
        onCancelScratch();
      },
    });
  }

  menuArray.push(ContextMenuSeparator);
  menuArray.push({
    name: 'マスクを編集',
    action: () => {
      onEdit(mask);
    },
  });
  menuArray.push({
    name: 'コピーを作る',
    action: () => {
      const cloneObject = mask.clone();
      cloneObject.location.x += gridSize;
      cloneObject.location.y += gridSize;
      cloneObject.isLock = false;
      if (mask.parent) mask.parent.appendChild(cloneObject);
      SoundEffect.play(PresetSound.cardPut);
    },
  });
  menuArray.push({
    name: '削除する',
    action: () => {
      mask.destroy();
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
