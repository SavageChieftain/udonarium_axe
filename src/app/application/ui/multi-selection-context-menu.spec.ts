import { ContextMenuAction, ContextMenuSeparator } from '@axe/application/ui/context-menu.service';
import {
  buildMultiSelectionContextMenu,
  tryBuildMultiSelectionContextMenu,
} from '@axe/application/ui/multi-selection-context-menu';
import { SelectionSignalService } from '@axe/application/ui/selection-signal.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';

const t = ((key: string, params?: Record<string, unknown>) => {
  if (params?.count != null) return `${key}(${params.count})`;
  return key;
}) as Parameters<typeof buildMultiSelectionContextMenu>[1]['t'];

function makeObj(id: string, opts: { isLock?: boolean } = {}): TabletopObject {
  const cloneCalls = { x: 0, y: 0 };
  const obj: Record<string, unknown> = {
    identifier: id,
    aliasName: 'character',
    isLock: opts.isLock ?? false,
    location: { name: 'table', x: 100, y: 100 },
    setLocation(_n: string) {
      this.lastSetLocation = _n;
    },
    update() {
      this.updateCalls = ((this.updateCalls as number | undefined) ?? 0) + 1;
    },
    clone(): unknown {
      const newId = `${id}-clone`;
      cloneCalls.x += 1;
      const inner: Record<string, unknown> = {
        identifier: newId,
        aliasName: 'character',
        location: { name: 'table', x: (obj.location as { x: number }).x, y: (obj.location as { y: number }).y },
      };
      inner.update = () => {
        inner.updateCalls = ((inner.updateCalls as number | undefined) ?? 0) + 1;
      };
      return inner;
    },
  };
  return obj as unknown as TabletopObject;
}

describe('buildMultiSelectionContextMenu', () => {
  it('一覧 / 一括コピー / 墓場 / クリア のアクションを返す', () => {
    const selection = new SelectionSignalService();
    const objs = [makeObj('a'), makeObj('b'), makeObj('c')];
    selection.replaceSelection(['a', 'b', 'c']);
    const menu = buildMultiSelectionContextMenu(objs, { t, selectionSignalService: selection, gridSize: 50 });

    expect(menu[0].name).toContain('countLabel(3)');
    expect(menu[1]).toBe(ContextMenuSeparator);
    expect((menu[2] as ContextMenuAction).name).toContain('copyAll');
    expect((menu[3] as ContextMenuAction).name).toContain('moveAllGraveyard');
    expect((menu[5] as ContextMenuAction).name).toContain('clear');
  });

  it('clear アクションで選択がクリアされる', () => {
    const selection = new SelectionSignalService();
    selection.replaceSelection(['a', 'b']);
    const menu = buildMultiSelectionContextMenu([makeObj('a'), makeObj('b')], {
      t,
      selectionSignalService: selection,
      gridSize: 50,
    });
    const clearAction = menu[5] as ContextMenuAction;
    clearAction.action?.();
    expect(selection.selectionSize()).toBe(0);
  });

  it('ロック中オブジェクトは copyAll/moveAll の対象外', () => {
    const selection = new SelectionSignalService();
    const a = makeObj('a');
    const b = makeObj('b', { isLock: true });
    selection.replaceSelection(['a', 'b']);
    const menu = buildMultiSelectionContextMenu([a, b], { t, selectionSignalService: selection, gridSize: 50 });
    const moveAll = menu[3] as ContextMenuAction;
    moveAll.action?.();
    expect((a as unknown as { lastSetLocation?: string }).lastSetLocation).toBe('graveyard');
    expect((b as unknown as { lastSetLocation?: string }).lastSetLocation).toBeUndefined();
  });
});

describe('tryBuildMultiSelectionContextMenu', () => {
  it('選択数 <= 1 では null を返す', () => {
    const selection = new SelectionSignalService();
    selection.addSelection('a');
    const objectStore = ObjectStore.instance;
    const obj = makeObj('a');
    expect(
      tryBuildMultiSelectionContextMenu({ self: obj, selectionSignalService: selection, objectStore, t, gridSize: 50 })
    ).toBeNull();
  });

  it('self が選択集合に含まれていない場合は null を返す', () => {
    const selection = new SelectionSignalService();
    selection.replaceSelection(['a', 'b']);
    const objectStore = ObjectStore.instance;
    const other = makeObj('c');
    expect(
      tryBuildMultiSelectionContextMenu({
        self: other,
        selectionSignalService: selection,
        objectStore,
        t,
        gridSize: 50,
      })
    ).toBeNull();
  });
});
