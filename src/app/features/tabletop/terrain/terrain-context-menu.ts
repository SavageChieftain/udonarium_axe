import { PointerCoordinate } from '@axe/core/input/pointer-device.service';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import { SlopeDirection, Terrain, TerrainViewState } from '@axe/domain/tabletop/terrain';
import { TabletopActionService } from '@axe/features/tabletop/tabletop-action.service';
import { GameObjectInventoryService } from '@axe/shared/inventory/game-object-inventory.service';
import { ContextMenuAction, ContextMenuSeparator } from '@axe/shared/ui/context-menu.service';

export function buildTerrainContextMenu(
  terrain: Terrain,
  gridSize: number,
  objectPosition: PointerCoordinate,
  inventoryService: GameObjectInventoryService,
  tabletopActionService: TabletopActionService,
  onEdit: (t: Terrain) => void
): ContextMenuAction[] {
  const adjustedWidth = Math.max(0, terrain.width);
  const adjustedDepth = Math.max(0, terrain.depth);
  const slopeDirection = !terrain.isSlope
    ? SlopeDirection.NONE
    : terrain.slopeDirection === SlopeDirection.NONE
      ? SlopeDirection.BOTTOM
      : terrain.slopeDirection;

  return [
    {
      name: '高度設定',
      action: undefined,
      subActions: [
        {
          name: '高度を0にする',
          action: () => {
            if (terrain.altitude != 0) {
              terrain.altitude = 0;
              SoundEffect.play(PresetSound.sweep);
            }
          },
          altitudeHande: terrain,
        },
        terrain.isAltitudeIndicate
          ? {
              name: '☑ 高度の表示',
              action: () => {
                terrain.isAltitudeIndicate = false;
                SoundEffect.play(PresetSound.sweep);
                inventoryService.notifyInventoryUpdate();
              },
            }
          : {
              name: '☐ 高度の表示',
              action: () => {
                terrain.isAltitudeIndicate = true;
                SoundEffect.play(PresetSound.sweep);
                inventoryService.notifyInventoryUpdate();
              },
            },
        terrain.isDropShadow
          ? {
              name: '☑ 影の表示',
              action: () => {
                terrain.isDropShadow = false;
                SoundEffect.play(PresetSound.sweep);
                inventoryService.notifyInventoryUpdate();
              },
            }
          : {
              name: '☐ 影の表示',
              action: () => {
                terrain.isDropShadow = true;
                SoundEffect.play(PresetSound.sweep);
                inventoryService.notifyInventoryUpdate();
              },
            },
      ],
    },
    ContextMenuSeparator,
    terrain.isLocked
      ? {
          name: '固定解除',
          action: () => {
            terrain.isLocked = false;
            SoundEffect.play(PresetSound.unlock);
          },
        }
      : {
          name: '固定する',
          action: () => {
            terrain.isLocked = true;
            SoundEffect.play(PresetSound.lock);
          },
        },
    ContextMenuSeparator,
    {
      name: '傾斜',
      action: undefined,
      subActions: [
        {
          name: `${slopeDirection == SlopeDirection.NONE ? '◉' : '○'}  なし`,
          action: () => {
            terrain.isSlope = false;
            terrain.slopeDirection = SlopeDirection.NONE;
          },
        },
        ContextMenuSeparator,
        {
          name: `${slopeDirection == SlopeDirection.TOP ? '◉' : '○'} 上（北）`,
          action: () => {
            terrain.isSlope = true;
            terrain.slopeDirection = SlopeDirection.TOP;
          },
        },
        {
          name: `${slopeDirection == SlopeDirection.BOTTOM ? '◉' : '○'} 下（南）`,
          action: () => {
            terrain.isSlope = true;
            terrain.slopeDirection = SlopeDirection.BOTTOM;
          },
        },
        {
          name: `${slopeDirection == SlopeDirection.LEFT ? '◉' : '○'}  左（西）`,
          action: () => {
            terrain.isSlope = true;
            terrain.slopeDirection = SlopeDirection.LEFT;
          },
        },
        {
          name: `${slopeDirection == SlopeDirection.RIGHT ? '◉' : '○'} 右（東）`,
          action: () => {
            terrain.isSlope = true;
            terrain.slopeDirection = SlopeDirection.RIGHT;
          },
        },
      ],
    },
    terrain.hasWall
      ? {
          name: '壁を非表示',
          action: () => {
            terrain.mode = TerrainViewState.FLOOR;
            if (adjustedDepth * adjustedWidth === 0) {
              terrain.width = adjustedWidth <= 0 ? 1 : adjustedWidth;
              terrain.depth = adjustedDepth <= 0 ? 1 : adjustedDepth;
            }
          },
        }
      : {
          name: '壁を表示',
          action: () => {
            terrain.mode = TerrainViewState.ALL;
          },
        },
    terrain.isSurfaceShading
      ? {
          name: '壁に陰影を付けない',
          action: () => {
            terrain.isSurfaceShading = false;
            SoundEffect.play(PresetSound.sweep);
          },
        }
      : {
          name: '壁に陰影を付ける',
          action: () => {
            terrain.isSurfaceShading = true;
            SoundEffect.play(PresetSound.sweep);
          },
        },
    terrain.isDropShadow
      ? {
          name: '影を非表示',
          action: () => {
            terrain.isDropShadow = false;
            SoundEffect.play(PresetSound.sweep);
          },
        }
      : {
          name: '影を表示',
          action: () => {
            terrain.isDropShadow = true;
            SoundEffect.play(PresetSound.sweep);
          },
        },
    ContextMenuSeparator,
    {
      name: '地形設定を編集',
      action: () => {
        onEdit(terrain);
      },
    },
    {
      name: 'コピーを作る',
      action: () => {
        const cloneObject = terrain.clone();
        cloneObject.location.x += gridSize;
        cloneObject.location.y += gridSize;
        cloneObject.isLocked = false;
        if (terrain.parent) terrain.parent.appendChild(cloneObject);
        SoundEffect.play(PresetSound.blockPut);
      },
    },
    {
      name: '削除する',
      action: () => {
        terrain.destroy();
        SoundEffect.play(PresetSound.sweep);
      },
    },
    ContextMenuSeparator,
    {
      name: 'オブジェクト作成',
      action: undefined,
      subActions: tabletopActionService.makeDefaultContextMenuActions(objectPosition),
    },
  ];
}
