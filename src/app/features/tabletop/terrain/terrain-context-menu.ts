import { TranslateFn } from '@axe/application/i18n/translate.token';
import { GameObjectInventoryService } from '@axe/application/inventory/game-object-inventory.service';
import { TabletopActionService } from '@axe/application/tabletop/tabletop-action.service';
import { ContextMenuAction, ContextMenuSeparator } from '@axe/application/ui/context-menu.service';
import { PointerCoordinate } from '@axe/core/input/pointer-device.service';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import { SlopeDirection, Terrain, TerrainViewState } from '@axe/domain/tabletop/terrain';

export function buildTerrainContextMenu(
  terrain: Terrain,
  gridSize: number,
  objectPosition: PointerCoordinate,
  inventoryService: GameObjectInventoryService,
  tabletopActionService: TabletopActionService,
  onEdit: (t: Terrain) => void,
  t: TranslateFn,
  overlapEntries: ContextMenuAction[] = []
): ContextMenuAction[] {
  const adjustedWidth = Math.max(0, terrain.width);
  const adjustedDepth = Math.max(0, terrain.depth);
  const slopeDirection = !terrain.isSlope
    ? SlopeDirection.NONE
    : terrain.slopeDirection === SlopeDirection.NONE
      ? SlopeDirection.BOTTOM
      : terrain.slopeDirection;

  return [
    ...(overlapEntries.length > 0 ? [...overlapEntries, ContextMenuSeparator] : []),
    {
      name: t('feature.tabletop.contextMenu.altitudeSetting'),
      action: undefined,
      subActions: [
        {
          name: t('feature.tabletop.contextMenu.altitudeZero'),
          action: () => {
            if (terrain.altitude !== 0 || terrain.posZ !== 0) {
              terrain.altitude = 0;
              terrain.posZ = 0;
              SoundEffect.play(PresetSound.sweep);
            }
          },
          altitudeHande: terrain,
        },
        terrain.isAltitudeIndicate
          ? {
              name: t('feature.tabletop.contextMenu.altitudeShowOn'),
              action: () => {
                terrain.isAltitudeIndicate = false;
                SoundEffect.play(PresetSound.sweep);
                inventoryService.notifyInventoryUpdate();
              },
            }
          : {
              name: t('feature.tabletop.contextMenu.altitudeShowOff'),
              action: () => {
                terrain.isAltitudeIndicate = true;
                SoundEffect.play(PresetSound.sweep);
                inventoryService.notifyInventoryUpdate();
              },
            },
        terrain.isDropShadow
          ? {
              name: t('feature.tabletop.contextMenu.shadowShowOn'),
              action: () => {
                terrain.isDropShadow = false;
                SoundEffect.play(PresetSound.sweep);
                inventoryService.notifyInventoryUpdate();
              },
            }
          : {
              name: t('feature.tabletop.contextMenu.shadowShowOff'),
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
          name: t('feature.tabletop.contextMenu.unlock'),
          action: () => {
            terrain.isLocked = false;
            SoundEffect.play(PresetSound.unlock);
          },
        }
      : {
          name: t('feature.tabletop.contextMenu.lock'),
          action: () => {
            terrain.isLocked = true;
            SoundEffect.play(PresetSound.lock);
          },
        },
    ContextMenuSeparator,
    {
      name: t('feature.tabletop.contextMenu.slope'),
      action: undefined,
      subActions: [
        {
          name: `${slopeDirection == SlopeDirection.NONE ? '◉' : '○'}  ${t('feature.tabletop.contextMenu.slopeNone')}`,
          action: () => {
            terrain.isSlope = false;
            terrain.slopeDirection = SlopeDirection.NONE;
          },
        },
        ContextMenuSeparator,
        {
          name: `${slopeDirection == SlopeDirection.TOP ? '◉' : '○'} ${t('feature.tabletop.contextMenu.slopeTop')}`,
          action: () => {
            terrain.isSlope = true;
            terrain.slopeDirection = SlopeDirection.TOP;
          },
        },
        {
          name: `${slopeDirection == SlopeDirection.BOTTOM ? '◉' : '○'} ${t('feature.tabletop.contextMenu.slopeBottom')}`,
          action: () => {
            terrain.isSlope = true;
            terrain.slopeDirection = SlopeDirection.BOTTOM;
          },
        },
        {
          name: `${slopeDirection == SlopeDirection.LEFT ? '◉' : '○'}  ${t('feature.tabletop.contextMenu.slopeLeft')}`,
          action: () => {
            terrain.isSlope = true;
            terrain.slopeDirection = SlopeDirection.LEFT;
          },
        },
        {
          name: `${slopeDirection == SlopeDirection.RIGHT ? '◉' : '○'} ${t('feature.tabletop.contextMenu.slopeRight')}`,
          action: () => {
            terrain.isSlope = true;
            terrain.slopeDirection = SlopeDirection.RIGHT;
          },
        },
      ],
    },
    terrain.hasWall
      ? {
          name: t('feature.tabletop.contextMenu.wallHide'),
          action: () => {
            terrain.mode = TerrainViewState.FLOOR;
            if (adjustedDepth * adjustedWidth === 0) {
              terrain.width = adjustedWidth <= 0 ? 1 : adjustedWidth;
              terrain.depth = adjustedDepth <= 0 ? 1 : adjustedDepth;
            }
          },
        }
      : {
          name: t('feature.tabletop.contextMenu.wallShow'),
          action: () => {
            terrain.mode = TerrainViewState.ALL;
          },
        },
    terrain.isSurfaceShading
      ? {
          name: t('feature.tabletop.contextMenu.surfaceShadingOff'),
          action: () => {
            terrain.isSurfaceShading = false;
            SoundEffect.play(PresetSound.sweep);
          },
        }
      : {
          name: t('feature.tabletop.contextMenu.surfaceShadingOn'),
          action: () => {
            terrain.isSurfaceShading = true;
            SoundEffect.play(PresetSound.sweep);
          },
        },
    terrain.isDropShadow
      ? {
          name: t('feature.tabletop.contextMenu.shadowHide'),
          action: () => {
            terrain.isDropShadow = false;
            SoundEffect.play(PresetSound.sweep);
          },
        }
      : {
          name: t('feature.tabletop.contextMenu.shadowShow'),
          action: () => {
            terrain.isDropShadow = true;
            SoundEffect.play(PresetSound.sweep);
          },
        },
    ContextMenuSeparator,
    {
      name: t('feature.tabletop.contextMenu.terrainEdit'),
      action: () => {
        onEdit(terrain);
      },
    },
    {
      name: t('feature.tabletop.contextMenu.copy'),
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
      name: t('feature.tabletop.contextMenu.delete'),
      action: () => {
        terrain.destroy();
        SoundEffect.play(PresetSound.sweep);
      },
    },
    ContextMenuSeparator,
    {
      name: t('feature.tabletop.contextMenu.createObject'),
      action: undefined,
      subActions: tabletopActionService.makeDefaultContextMenuActions(objectPosition),
    },
  ];
}
