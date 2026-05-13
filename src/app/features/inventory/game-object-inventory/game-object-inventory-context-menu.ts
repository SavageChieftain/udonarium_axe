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
}

/** 1 オブジェクト分のコンテキストメニュー（詳細表示・移動先・コピー・削除等）を組み立てる。 */
export function buildInventoryObjectContextMenu(
  gameObject: TabletopObject,
  inventoryService: GameObjectInventoryService,
  callbacks: InventoryContextMenuCallbacks
): ContextMenuAction[] {
  const actions: ContextMenuAction[] = [];

  actions.push({
    name: '詳細を表示',
    action: () => callbacks.showDetail(gameObject as GameCharacter),
  });

  if (gameObject.location.name !== 'graveyard') {
    actions.push({
      name: 'チャットパレットを表示',
      action: () => callbacks.showChatPalette(gameObject as GameCharacter),
    });
    actions.push({
      name: 'リモコンを表示',
      action: () => callbacks.showRemoteController(gameObject as GameCharacter),
    });
    const character = gameObject as GameCharacter;
    actions.push(
      character.hideInventory
        ? {
            name: '☑ インベントリ非表示',
            action: () => {
              character.hideInventory = false;
              inventoryService.notifyInventoryUpdate();
              SoundEffect.play(PresetSound.sweep);
            },
          }
        : {
            name: '☐ インベントリ非表示',
            action: () => {
              character.hideInventory = true;
              inventoryService.notifyInventoryUpdate();
              SoundEffect.play(PresetSound.sweep);
            },
          }
    );
  }

  actions.push(ContextMenuSeparator);
  for (const location of inventoryLocations()) {
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
      name: '削除する',
      action: () => {
        callbacks.deleteGameObject(gameObject);
        SoundEffect.play(PresetSound.sweep);
      },
    });
  }

  actions.push(ContextMenuSeparator);
  actions.push({
    name: 'コピーを作る',
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

/** 一括移動モードのコンテキストメニュー。墓場タブのときだけ「墓場から削除」が出る。 */
export function buildInventoryMultiMoveContextMenu(
  selectedTab: string,
  callbacks: MultiMoveContextMenuCallbacks
): ContextMenuAction[] {
  const actions: ContextMenuAction[] = [];

  for (const location of inventoryLocations()) {
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
      name: '墓場から削除',
      action: () => {
        callbacks.multiDelete();
        callbacks.toggleMultiMove();
        SoundEffect.play(PresetSound.sweep);
      },
    });
  }

  return actions;
}

/** 4 つの inventory location 定義。peer 接続前はピア ID が空のままだが invokation 時に最新値を取得する。 */
function inventoryLocations(): Array<{ name: string; alias: string }> {
  return [
    { name: 'table', alias: 'テーブルに移動' },
    { name: 'common', alias: '共有イベントリに移動' },
    { name: Network.peerId, alias: '個人イベントリに移動' },
    { name: 'graveyard', alias: '墓場に移動' },
  ];
}
