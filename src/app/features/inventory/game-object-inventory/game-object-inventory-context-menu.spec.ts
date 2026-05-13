import { GameObjectInventoryService } from '@axe/application/inventory/game-object-inventory.service';
import { GameCharacter } from '@axe/domain/character/game-character';
import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';
import {
  buildInventoryMultiMoveContextMenu,
  buildInventoryObjectContextMenu,
} from '@axe/features/inventory/game-object-inventory/game-object-inventory-context-menu';

function makeService(): GameObjectInventoryService {
  return { notifyInventoryUpdate: vi.fn() } as unknown as GameObjectInventoryService;
}

function makeCharacterAt(locationName: string, hideInventory = false): TabletopObject {
  return {
    name: 'taro',
    location: { name: locationName },
    setLocation: vi.fn(),
    hideInventory,
  } as unknown as TabletopObject;
}

function names(actions: { name: string }[]): string[] {
  return actions.map((a) => a.name);
}

describe('buildInventoryObjectContextMenu()', () => {
  it('graveyard 以外では「詳細を表示」「チャットパレット」「リモコン」「インベントリ非表示」が並ぶ', () => {
    const character = makeCharacterAt('table');
    const cb = {
      showDetail: vi.fn(),
      showChatPalette: vi.fn(),
      showRemoteController: vi.fn(),
      cloneGameObject: vi.fn(),
      deleteGameObject: vi.fn(),
    };
    const actions = buildInventoryObjectContextMenu(character, makeService(), cb);
    const list = names(actions);
    expect(list).toContain('詳細を表示');
    expect(list).toContain('チャットパレットを表示');
    expect(list).toContain('リモコンを表示');
    expect(list.some((n) => n.includes('インベントリ非表示'))).toBe(true);
  });

  it('graveyard 配下では「詳細を表示」のみで「チャットパレット」「リモコン」が出ない', () => {
    const character = makeCharacterAt('graveyard');
    const actions = buildInventoryObjectContextMenu(character, makeService(), {
      showDetail: vi.fn(),
      showChatPalette: vi.fn(),
      showRemoteController: vi.fn(),
      cloneGameObject: vi.fn(),
      deleteGameObject: vi.fn(),
    });
    const list = names(actions);
    expect(list).toContain('詳細を表示');
    expect(list).not.toContain('チャットパレットを表示');
    expect(list).not.toContain('リモコンを表示');
  });

  it('現在いる location は移動先候補から外れる', () => {
    const character = makeCharacterAt('table');
    const actions = buildInventoryObjectContextMenu(character, makeService(), {
      showDetail: vi.fn(),
      showChatPalette: vi.fn(),
      showRemoteController: vi.fn(),
      cloneGameObject: vi.fn(),
      deleteGameObject: vi.fn(),
    });
    const list = names(actions);
    expect(list).not.toContain('テーブルに移動');
    expect(list).toContain('共有イベントリに移動');
    expect(list).toContain('墓場に移動');
  });

  it('graveyard でだけ「削除する」が出る', () => {
    const graveyardActions = buildInventoryObjectContextMenu(makeCharacterAt('graveyard'), makeService(), {
      showDetail: vi.fn(),
      showChatPalette: vi.fn(),
      showRemoteController: vi.fn(),
      cloneGameObject: vi.fn(),
      deleteGameObject: vi.fn(),
    });
    expect(names(graveyardActions)).toContain('削除する');

    const tableActions = buildInventoryObjectContextMenu(makeCharacterAt('table'), makeService(), {
      showDetail: vi.fn(),
      showChatPalette: vi.fn(),
      showRemoteController: vi.fn(),
      cloneGameObject: vi.fn(),
      deleteGameObject: vi.fn(),
    });
    expect(names(tableActions)).not.toContain('削除する');
  });

  it('hideInventory フラグでチェックマーク表示が切り替わる', () => {
    const visible = buildInventoryObjectContextMenu(makeCharacterAt('table', false), makeService(), {
      showDetail: vi.fn(),
      showChatPalette: vi.fn(),
      showRemoteController: vi.fn(),
      cloneGameObject: vi.fn(),
      deleteGameObject: vi.fn(),
    });
    expect(names(visible)).toContain('☐ インベントリ非表示');

    const hidden = buildInventoryObjectContextMenu(makeCharacterAt('table', true), makeService(), {
      showDetail: vi.fn(),
      showChatPalette: vi.fn(),
      showRemoteController: vi.fn(),
      cloneGameObject: vi.fn(),
      deleteGameObject: vi.fn(),
    });
    expect(names(hidden)).toContain('☑ インベントリ非表示');
  });

  it('「コピーを作る」は常に末尾近くに含まれる', () => {
    const actions = buildInventoryObjectContextMenu(makeCharacterAt('table'), makeService(), {
      showDetail: vi.fn(),
      showChatPalette: vi.fn(),
      showRemoteController: vi.fn(),
      cloneGameObject: vi.fn(),
      deleteGameObject: vi.fn(),
    });
    expect(names(actions)).toContain('コピーを作る');
  });

  it('「詳細を表示」のアクションが showDetail コールバックを呼ぶ', () => {
    const showDetail = vi.fn();
    const character = makeCharacterAt('table');
    const actions = buildInventoryObjectContextMenu(character, makeService(), {
      showDetail,
      showChatPalette: vi.fn(),
      showRemoteController: vi.fn(),
      cloneGameObject: vi.fn(),
      deleteGameObject: vi.fn(),
    });
    actions.find((a) => a.name === '詳細を表示')!.action!();
    expect(showDetail).toHaveBeenCalledWith(character as unknown as GameCharacter);
  });
});

describe('buildInventoryMultiMoveContextMenu()', () => {
  it('選択中のタブと同名 location は除外される', () => {
    const actions = buildInventoryMultiMoveContextMenu('common', {
      multiMove: vi.fn(),
      toggleMultiMove: vi.fn(),
      multiDelete: vi.fn(),
    });
    expect(names(actions)).not.toContain('共有イベントリに移動');
    expect(names(actions)).toContain('テーブルに移動');
    expect(names(actions)).toContain('墓場に移動');
  });

  it('selectedTab が graveyard のとき「墓場から削除」が出る', () => {
    const actions = buildInventoryMultiMoveContextMenu('graveyard', {
      multiMove: vi.fn(),
      toggleMultiMove: vi.fn(),
      multiDelete: vi.fn(),
    });
    expect(names(actions)).toContain('墓場から削除');
  });

  it('selectedTab が graveyard 以外なら「墓場から削除」は出ない', () => {
    const actions = buildInventoryMultiMoveContextMenu('table', {
      multiMove: vi.fn(),
      toggleMultiMove: vi.fn(),
      multiDelete: vi.fn(),
    });
    expect(names(actions)).not.toContain('墓場から削除');
  });

  it('移動アクションは multiMove(location) と toggleMultiMove() を順に呼ぶ', () => {
    const multiMove = vi.fn();
    const toggleMultiMove = vi.fn();
    const actions = buildInventoryMultiMoveContextMenu('table', {
      multiMove,
      toggleMultiMove,
      multiDelete: vi.fn(),
    });
    actions.find((a) => a.name === '共有イベントリに移動')!.action!();
    expect(multiMove).toHaveBeenCalledWith('common');
    expect(toggleMultiMove).toHaveBeenCalled();
  });
});
