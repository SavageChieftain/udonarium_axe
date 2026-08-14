import { GameObjectInventoryService } from '@axe/application/inventory/game-object-inventory.service';
import { GameCharacter } from '@axe/domain/character/game-character';
import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';
import {
  buildInventoryMultiMoveContextMenu,
  buildInventoryObjectContextMenu,
} from '@axe/features/inventory/game-object-inventory/game-object-inventory-context-menu';
import { createSyncTranslate } from '@axe/testing/transloco-testing';

const t = createSyncTranslate('ja');

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

const defaultCallbacks = () => ({
  showDetail: vi.fn(),
  showChatPalette: vi.fn(),
  showRemoteController: vi.fn(),
  cloneGameObject: vi.fn(),
  deleteGameObject: vi.fn(),
});

describe('buildInventoryObjectContextMenu()', () => {
  it('offers the sheet, the palette, the remote and hiding from the list anywhere but the graveyard', () => {
    const character = makeCharacterAt('table');
    const actions = buildInventoryObjectContextMenu(character, makeService(), defaultCallbacks(), t);
    const list = names(actions);
    expect(list).toContain('詳細を表示');
    expect(list).toContain('チャットパレットを表示');
    expect(list).toContain('リモコンを表示');
    expect(list.some((n) => n.includes('インベントリ非表示'))).toBe(true);
  });

  it('offers the sheet alone there, without the palette or the remote', () => {
    const character = makeCharacterAt('graveyard');
    const actions = buildInventoryObjectContextMenu(character, makeService(), defaultCallbacks(), t);
    const list = names(actions);
    expect(list).toContain('詳細を表示');
    expect(list).not.toContain('チャットパレットを表示');
    expect(list).not.toContain('リモコンを表示');
  });

  it('leaves out the place it is already in', () => {
    const character = makeCharacterAt('table');
    const actions = buildInventoryObjectContextMenu(character, makeService(), defaultCallbacks(), t);
    const list = names(actions);
    expect(list).not.toContain('テーブルに移動');
    expect(list).toContain('共有イベントリに移動');
    expect(list).toContain('墓場に移動');
  });

  it('offers deleting in the graveyard alone', () => {
    const graveyardActions = buildInventoryObjectContextMenu(
      makeCharacterAt('graveyard'),
      makeService(),
      defaultCallbacks(),
      t
    );
    expect(names(graveyardActions)).toContain('削除する');

    const tableActions = buildInventoryObjectContextMenu(
      makeCharacterAt('table'),
      makeService(),
      defaultCallbacks(),
      t
    );
    expect(names(tableActions)).not.toContain('削除する');
  });

  it('ticks the item by whether it is hidden from the list', () => {
    const visible = buildInventoryObjectContextMenu(
      makeCharacterAt('table', false),
      makeService(),
      defaultCallbacks(),
      t
    );
    expect(names(visible)).toContain('☐ インベントリ非表示');

    const hidden = buildInventoryObjectContextMenu(
      makeCharacterAt('table', true),
      makeService(),
      defaultCallbacks(),
      t
    );
    expect(names(hidden)).toContain('☑ インベントリ非表示');
  });

  it('always offers a copy, near the end', () => {
    const actions = buildInventoryObjectContextMenu(makeCharacterAt('table'), makeService(), defaultCallbacks(), t);
    expect(names(actions)).toContain('コピーを作る');
  });

  it('opens the sheet from that item', () => {
    const showDetail = vi.fn();
    const character = makeCharacterAt('table');
    const actions = buildInventoryObjectContextMenu(character, makeService(), { ...defaultCallbacks(), showDetail }, t);
    actions.find((a) => a.name === '詳細を表示')!.action!();
    expect(showDetail).toHaveBeenCalledWith(character as unknown as GameCharacter);
  });
});

describe('buildInventoryMultiMoveContextMenu()', () => {
  const moveCallbacks = () => ({
    multiMove: vi.fn(),
    toggleMultiMove: vi.fn(),
    multiDelete: vi.fn(),
  });

  it('leaves out the place the open tab already names', () => {
    const actions = buildInventoryMultiMoveContextMenu('common', moveCallbacks(), t);
    expect(names(actions)).not.toContain('共有イベントリに移動');
    expect(names(actions)).toContain('テーブルに移動');
    expect(names(actions)).toContain('墓場に移動');
  });

  it('offers deleting from the graveyard while that tab is open', () => {
    const actions = buildInventoryMultiMoveContextMenu('graveyard', moveCallbacks(), t);
    expect(names(actions)).toContain('墓場から削除');
  });

  it('offers it nowhere else', () => {
    const actions = buildInventoryMultiMoveContextMenu('table', moveCallbacks(), t);
    expect(names(actions)).not.toContain('墓場から削除');
  });

  it('moves them all and then leaves the moving mode', () => {
    const multiMove = vi.fn();
    const toggleMultiMove = vi.fn();
    const actions = buildInventoryMultiMoveContextMenu(
      'table',
      { multiMove, toggleMultiMove, multiDelete: vi.fn() },
      t
    );
    actions.find((a) => a.name === '共有イベントリに移動')!.action!();
    expect(multiMove).toHaveBeenCalledWith('common');
    expect(toggleMultiMove).toHaveBeenCalled();
  });
});
