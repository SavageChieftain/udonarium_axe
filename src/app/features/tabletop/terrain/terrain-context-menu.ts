import { TranslateFn } from '@axe/application/i18n/translate.token';
import { GameObjectInventoryService } from '@axe/application/inventory/game-object-inventory.service';
import { TabletopActionService } from '@axe/application/tabletop/tabletop-action.service';
import { ContextMenuAction, ContextMenuSeparator } from '@axe/application/ui/context-menu.service';
import {
  buildAltitudeAction,
  buildLockToggleAction,
  buildToggleAction,
} from '@axe/application/ui/tabletop-context-menu-actions';
import { PointerCoordinate } from '@axe/core/input/pointer-device.service';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import { DOOR_STYLES, DoorStyle, SlopeDirection, Terrain, TerrainViewState } from '@axe/domain/tabletop/terrain';
import { applyLightPreset, LightPreset } from '@axe/domain/tabletop/vision-types';

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
    buildAltitudeAction(terrain, t, {
      onChanged: () => inventoryService.notifyInventoryUpdate(),
      extraActions: [
        buildToggleAction(
          terrain.isDropShadow,
          (next) => (terrain.isDropShadow = next),
          {
            on: t('feature.tabletop.contextMenu.shadowShowOn'),
            off: t('feature.tabletop.contextMenu.shadowShowOff'),
          },
          () => inventoryService.notifyInventoryUpdate()
        ),
      ],
    }),
    ContextMenuSeparator,
    buildLockToggleAction(terrain.isLocked, (next) => (terrain.isLocked = next), t),
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
    ...(terrain.isDoor
      ? [
          {
            name: terrain.isDoorOpen
              ? t('feature.tabletop.contextMenu.doorClose')
              : t('feature.tabletop.contextMenu.doorOpen'),
            action: () => {
              terrain.isDoorOpen = !terrain.isDoorOpen;
              SoundEffect.play(terrain.isDoorOpen ? PresetSound.unlock : PresetSound.lock);
            },
          },
        ]
      : []),
    {
      name: t('feature.tabletop.contextMenu.doorStyle'),
      action: undefined,
      subActions: [
        {
          name: `${terrain.doorStyle === DoorStyle.NONE ? '◉' : '○'} ${t('feature.tabletop.contextMenu.doorStyleNone')}`,
          action: () => {
            terrain.doorStyle = DoorStyle.NONE;
            terrain.isDoorOpen = false;
          },
        },
        ...DOOR_STYLES.map((style) => ({
          name: `${terrain.doorStyle === style ? '◉' : '○'} ${t('feature.tabletop.contextMenu.doorStyle' + style[0].toUpperCase() + style.slice(1))}`,
          action: () => {
            terrain.doorStyle = style;
          },
        })),
        ...(terrain.isDoor
          ? [
              ContextMenuSeparator,
              {
                name: t('feature.tabletop.contextMenu.doorFlip'),
                action: () => {
                  terrain.doorMirrored = !terrain.doorMirrored;
                },
              },
            ]
          : []),
      ],
    },
    buildToggleAction(terrain.isTiledTexture, (next) => (terrain.isTiledTexture = next), {
      on: t('feature.tabletop.contextMenu.tiledTextureOff'),
      off: t('feature.tabletop.contextMenu.tiledTextureOn'),
    }),
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
      name: t('feature.tabletop.contextMenu.lightSection'),
      action: undefined,
      subActions: [
        {
          name: (terrain.blocksSight ? '☑ ' : '☐ ') + t('feature.tabletop.contextMenu.blocksSight'),
          action: () => {
            terrain.blocksSight = !terrain.blocksSight;
            SoundEffect.play(PresetSound.sweep);
          },
        },
        {
          name: (terrain.blocksLight ? '☑ ' : '☐ ') + t('feature.tabletop.contextMenu.blocksLight'),
          action: () => {
            terrain.blocksLight = !terrain.blocksLight;
            SoundEffect.play(PresetSound.sweep);
          },
        },
        ContextMenuSeparator,
        {
          name: (terrain.lightEnabled ? '☑ ' : '☐ ') + t('feature.tabletop.contextMenu.terrainGlow'),
          action: () => {
            terrain.lightEnabled = !terrain.lightEnabled;
            if (terrain.lightEnabled && terrain.lightDimRadius <= 0) applyLightPreset(terrain, LightPreset.TORCH);
            SoundEffect.play(PresetSound.sweep);
          },
        },
        {
          name: t('feature.light.contextMenu.preset'),
          action: undefined,
          subActions: Object.values(LightPreset).map((preset) => ({
            name: (terrain.lightPreset === preset ? '✔ ' : '') + t('feature.light.preset.' + preset),
            action: () => {
              applyLightPreset(terrain, preset);
              terrain.lightEnabled = true;
              SoundEffect.play(PresetSound.sweep);
            },
          })),
        },
      ],
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
