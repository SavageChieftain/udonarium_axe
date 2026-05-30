import { buildCopyAction, buildLockToggleAction } from '@axe/application/ui/tabletop-context-menu-actions';
import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';

const t = ((key: string) => key) as Parameters<typeof buildLockToggleAction>[2];

describe('buildLockToggleAction', () => {
  it('ロック中なら解除アクションを返し、実行で setLocked(false) を呼ぶ', () => {
    let v = true;
    const action = buildLockToggleAction(true, (next) => (v = next), t);
    expect(action.name).toBe('feature.tabletop.contextMenu.unlock');
    action.action?.();
    expect(v).toBe(false);
  });

  it('未ロックならロックアクションを返し、実行で setLocked(true) を呼ぶ', () => {
    let v = false;
    const action = buildLockToggleAction(false, (next) => (v = next), t);
    expect(action.name).toBe('feature.tabletop.contextMenu.lock');
    action.action?.();
    expect(v).toBe(true);
  });
});

describe('buildCopyAction', () => {
  function makeObj(): {
    obj: TabletopObject;
    cloneObj: { location: { x: number; y: number }; isLock?: boolean; update(): void };
    calls: { cloned: number; updated: number };
  } {
    const calls = { cloned: 0, updated: 0 };
    const cloneObj = {
      identifier: 'copy-1',
      location: { name: 'table', x: 100, y: 200 },
      isLock: true,
      update() {
        calls.updated += 1;
      },
    };
    const obj = {
      identifier: 'src',
      clone() {
        calls.cloned += 1;
        return cloneObj;
      },
    } as unknown as TabletopObject;
    return { obj, cloneObj, calls };
  }

  it('clone を呼び、gridSize 分オフセットして update を呼ぶ', () => {
    const { obj, cloneObj, calls } = makeObj();
    const action = buildCopyAction(obj, 50, t);
    action.action?.();
    expect(calls.cloned).toBe(1);
    expect(calls.updated).toBe(1);
    expect(cloneObj.location.x).toBe(150);
    expect(cloneObj.location.y).toBe(250);
  });

  it('afterClone で clone を変更してから update が呼ばれる', () => {
    const { obj, cloneObj } = makeObj();
    const action = buildCopyAction(obj, 50, t, {
      afterClone: (c) => {
        (c as unknown as { isLock: boolean }).isLock = false;
      },
    });
    action.action?.();
    expect(cloneObj.isLock).toBe(false);
  });
});
