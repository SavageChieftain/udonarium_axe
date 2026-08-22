import { TranslateFn } from '@axe/application/i18n/translate.token';
import { GameObjectInventoryService } from '@axe/application/inventory/game-object-inventory.service';
import { ContextMenuAction, ContextMenuSeparator } from '@axe/application/ui/context-menu.service';
import { Network } from '@axe/core/index';
import { GameCharacter } from '@axe/domain/character/game-character';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';

interface InventoryContextMenuCallbacks {
  showDetail: (character: GameCharacter) => void;
  showChatPalette: (character: GameCharacter) => void;
  showRemoteController: (character: GameCharacter) => void;
  cloneGameObject: (gameObject: TabletopObject) => void;
  deleteGameObject: (gameObject: TabletopObject) => void;
  setFolder: (gameObject: TabletopObject, folderPath: string) => void;
  createFolder: (gameObject: TabletopObject) => void;
}

export interface InventoryFolderAssignCallbacks {
  setFolder: (folderPath: string) => void;
  createFolder: () => void;
}

export function buildInventoryFolderAssignMenu(
  currentPath: string | null,
  folderPaths: readonly string[],
  callbacks: InventoryFolderAssignCallbacks,
  t: TranslateFn
): ContextMenuAction[] {
  const actions: ContextMenuAction[] = folderPaths.map((folderPath) => ({
    name: `${currentPath === folderPath ? '◉' : '○'} ${folderPath}`,
    action: () => callbacks.setFolder(folderPath),
  }));

  if (actions.length > 0) actions.push(ContextMenuSeparator);
  actions.push({
    name: t('feature.inventory.contextMenu.newFolder'),
    action: () => callbacks.createFolder(),
  });
  if (currentPath == null || currentPath.length > 0) {
    actions.push({
      name: t('feature.inventory.contextMenu.removeFromFolder'),
      action: () => callbacks.setFolder(''),
    });
  }

  return actions;
}

export interface InventoryFolderContextMenuCallbacks {
  renameFolder: () => void;
  createSubfolder: () => void;
  deleteFolder: () => void;
  selectFolder: () => void;
  collapseAll: () => void;
  expandAll: () => void;
}

export function buildInventoryFolderContextMenu(
  folderPath: string,
  isMultiMove: boolean,
  callbacks: InventoryFolderContextMenuCallbacks,
  t: TranslateFn
): ContextMenuAction[] {
  const actions: ContextMenuAction[] = [];

  if (folderPath.length > 0) {
    actions.push({
      name: t('feature.inventory.contextMenu.renameFolder'),
      action: () => callbacks.renameFolder(),
    });
    actions.push({
      name: t('feature.inventory.contextMenu.newSubfolder'),
      action: () => callbacks.createSubfolder(),
    });
    actions.push({
      name: t('feature.inventory.contextMenu.deleteFolder'),
      action: () => callbacks.deleteFolder(),
    });
    actions.push(ContextMenuSeparator);
  }

  if (isMultiMove) {
    actions.push({
      name: t('feature.inventory.contextMenu.selectFolder'),
      action: () => callbacks.selectFolder(),
    });
    actions.push(ContextMenuSeparator);
  }

  actions.push({ name: t('feature.inventory.contextMenu.collapseAll'), action: () => callbacks.collapseAll() });
  actions.push({ name: t('feature.inventory.contextMenu.expandAll'), action: () => callbacks.expandAll() });

  return actions;
}

export function buildInventoryObjectContextMenu(
  gameObject: TabletopObject,
  inventoryService: GameObjectInventoryService,
  callbacks: InventoryContextMenuCallbacks,
  t: TranslateFn,
  folderPaths: readonly string[] = []
): ContextMenuAction[] {
  const actions: ContextMenuAction[] = [];

  actions.push({
    name: t('feature.character.contextMenu.showDetail'),
    action: () => callbacks.showDetail(gameObject as GameCharacter),
  });

  if (gameObject.location.name !== 'graveyard') {
    actions.push({
      name: t('feature.character.contextMenu.showChatPalette'),
      action: () => callbacks.showChatPalette(gameObject as GameCharacter),
    });
    actions.push({
      name: t('feature.character.contextMenu.showRemoteController'),
      action: () => callbacks.showRemoteController(gameObject as GameCharacter),
    });
    const character = gameObject as GameCharacter;
    actions.push(
      character.hideInventory
        ? {
            name: t('feature.character.contextMenu.hideInventoryOn'),
            action: () => {
              character.hideInventory = false;
              inventoryService.notifyInventoryUpdate();
              SoundEffect.play(PresetSound.sweep);
            },
          }
        : {
            name: t('feature.character.contextMenu.hideInventoryOff'),
            action: () => {
              character.hideInventory = true;
              inventoryService.notifyInventoryUpdate();
              SoundEffect.play(PresetSound.sweep);
            },
          }
    );
  }

  actions.push({
    name: t('feature.inventory.contextMenu.folder'),
    subActions: buildInventoryFolderAssignMenu(
      (gameObject as GameCharacter).folderName ?? '',
      folderPaths,
      {
        setFolder: (folderPath) => callbacks.setFolder(gameObject, folderPath),
        createFolder: () => callbacks.createFolder(gameObject),
      },
      t
    ),
  });

  actions.push(ContextMenuSeparator);
  for (const location of inventoryLocations(t)) {
    if (gameObject.location.name === location.name) continue;
    actions.push({
      name: location.alias,
      action: () => {
        gameObject.setLocation(location.name);
        SoundEffect.play(PresetSound.piecePut);
      },
    });
  }

  if (gameObject.location.name === 'graveyard') {
    actions.push({
      name: t('feature.tabletop.contextMenu.delete'),
      action: () => {
        callbacks.deleteGameObject(gameObject);
        SoundEffect.play(PresetSound.sweep);
      },
    });
  }

  actions.push(ContextMenuSeparator);
  actions.push({
    name: t('feature.tabletop.contextMenu.copy'),
    action: () => {
      callbacks.cloneGameObject(gameObject);
      SoundEffect.play(PresetSound.piecePut);
    },
  });

  return actions;
}

interface MultiMoveContextMenuCallbacks {
  multiMove: (location: string) => void;
  toggleMultiMove: () => void;
  multiDelete: () => void;
}

export function buildInventoryMultiMoveContextMenu(
  selectedTab: string,
  callbacks: MultiMoveContextMenuCallbacks,
  t: TranslateFn
): ContextMenuAction[] {
  const actions: ContextMenuAction[] = [];

  for (const location of inventoryLocations(t)) {
    if (selectedTab === location.name) continue;
    actions.push({
      name: location.alias,
      action: () => {
        callbacks.multiMove(location.name);
        callbacks.toggleMultiMove();
        SoundEffect.play(PresetSound.piecePut);
      },
    });
  }

  if (selectedTab === 'graveyard') {
    actions.push({
      name: t('feature.inventory.contextMenu.multiDelete'),
      action: () => {
        callbacks.multiDelete();
        callbacks.toggleMultiMove();
        SoundEffect.play(PresetSound.sweep);
      },
    });
  }

  return actions;
}

function inventoryLocations(t: TranslateFn): Array<{ name: string; alias: string }> {
  return [
    { name: 'table', alias: t('feature.inventory.contextMenu.moveTable') },
    { name: 'common', alias: t('feature.inventory.contextMenu.moveCommon') },
    { name: Network.peerId, alias: t('feature.inventory.contextMenu.movePersonal') },
    { name: 'graveyard', alias: t('feature.inventory.contextMenu.moveGraveyard') },
  ];
}
