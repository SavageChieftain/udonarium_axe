import { TranslateFn } from '@axe/application/i18n/translate.token';
import { GameObjectInventoryService } from '@axe/application/inventory/game-object-inventory.service';
import { ContextMenuAction, ContextMenuSeparator } from '@axe/application/ui/context-menu.service';
import { buildCopyAction, buildLockToggleAction } from '@axe/application/ui/tabletop-context-menu-actions';
import { Network } from '@axe/core/index';
import { GameCharacter } from '@axe/domain/character/game-character';
import { DataElement, DataElementFieldType } from '@axe/domain/data/data-element';
import { decodeRangeShapeField, RangeShapeFieldValue } from '@axe/domain/data/range-shape-field';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { buildDisclosureContextMenu } from '@axe/features/disclosure/disclosure-context-menu';

export interface RegisteredRangeShape {
  label: string;
  value: RangeShapeFieldValue;
}

export function collectRegisteredRangeShapes(char: GameCharacter): RegisteredRangeShape[] {
  const result: RegisteredRangeShape[] = [];
  const walk = (element: DataElement): void => {
    if (element.fieldType === DataElementFieldType.RANGE_SHAPE) {
      const value = decodeRangeShapeField(element.currentValue);
      if (value) {
        const label = value.name?.trim() || element.name?.trim() || '';
        result.push({ label, value });
      }
    }
    for (const child of element.children) walk(child);
  };
  for (const child of char.children) {
    if (child instanceof DataElement) walk(child);
  }
  return result;
}

const BUFF_VIEW_MENU_MODES = ['icon', 'detail', 'count'] as const;

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function buildGameCharacterContextMenu(
  char: GameCharacter,
  gridSize: number,
  inventoryService: GameObjectInventoryService,
  callbacks: {
    onShowDetail: () => void;
    onShowChatPalette: () => void;
    onShowRemoteController: () => void;
    onShowBuffEdit: () => void;
    onSelectBuffView?: (mode: string) => void;
    onShowLightSettings: () => void;
    onInvokeRangeShape?: (value: RangeShapeFieldValue) => void;
  },
  t: TranslateFn,
  overlapEntries: ContextMenuAction[] = [],
  buffViewMode = 'icon'
): ContextMenuAction[] {
  const registeredShapes = callbacks.onInvokeRangeShape ? collectRegisteredRangeShapes(char) : [];

  // 1. 開く / 確認
  const openActions: ContextMenuAction[] = [
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
    ...(callbacks.onSelectBuffView
      ? [
          {
            name: t('feature.character.contextMenu.buffView'),
            action: undefined,
            subActions: BUFF_VIEW_MENU_MODES.map((mode) => ({
              name: (buffViewMode === mode ? '✔ ' : '') + t(`feature.character.buff.view${capitalize(mode)}`),
              action: () => callbacks.onSelectBuffView?.(mode),
            })),
          },
        ]
      : []),
    {
      name: t('feature.character.contextMenu.lightSettings'),
      action: () => callbacks.onShowLightSettings(),
    },
    ...(registeredShapes.length > 0 && callbacks.onInvokeRangeShape
      ? [
          {
            name: t('feature.character.contextMenu.invokeRangeShape'),
            action: undefined,
            subActions: registeredShapes.map((shape, index) => ({
              name: shape.label || t('feature.range.custom.unnamedShape', { index: index + 1 }),
              action: () => {
                callbacks.onInvokeRangeShape?.(shape.value);
              },
            })),
          } as ContextMenuAction,
        ]
      : []),
  ];

  // 2. 表示設定
  const displayActions: ContextMenuAction[] = [
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
    {
      name: t('feature.character.contextMenu.displaySettings'),
      action: undefined,
      subActions: [
        char.hideName
          ? {
              name: t('feature.character.contextMenu.hideNameOn'),
              action: () => {
                char.hideName = false;
                SoundEffect.play(PresetSound.sweep);
              },
            }
          : {
              name: t('feature.character.contextMenu.hideNameOff'),
              action: () => {
                char.hideName = true;
                SoundEffect.play(PresetSound.sweep);
              },
            },
        char.hideBuff
          ? {
              name: t('feature.character.contextMenu.hideBuffOn'),
              action: () => {
                char.hideBuff = false;
                SoundEffect.play(PresetSound.sweep);
              },
            }
          : {
              name: t('feature.character.contextMenu.hideBuffOff'),
              action: () => {
                char.hideBuff = true;
                SoundEffect.play(PresetSound.sweep);
              },
            },
        ...(PeerCursor.isMyselfGameMaster
          ? [
              char.isNpc
                ? {
                    name: t('feature.character.contextMenu.npcOn'),
                    action: () => {
                      char.isNpc = false;
                      SoundEffect.play(PresetSound.sweep);
                    },
                  }
                : {
                    name: t('feature.character.contextMenu.npcOff'),
                    action: () => {
                      char.isNpc = true;
                      SoundEffect.play(PresetSound.sweep);
                    },
                  },
            ]
          : []),
      ],
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
  ];

  // 4. 移動
  const moveActions: ContextMenuAction[] = [
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
  ];

  return [
    ...(overlapEntries.length > 0 ? [...overlapEntries, ContextMenuSeparator] : []),
    ...openActions,
    ContextMenuSeparator,
    ...displayActions,
    // 3. 公開範囲 / オーナー（権限があるときのみ。先頭にセパレータを含む）
    ...buildDisclosureContextMenu(char, t),
    ContextMenuSeparator,
    ...moveActions,
    ContextMenuSeparator,
    buildLockToggleAction(char.isLock, (next) => (char.isLock = next), t),
    buildCopyAction(char, gridSize, t),
  ];
}
