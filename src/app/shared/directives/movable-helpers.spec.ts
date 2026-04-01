import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';
import {
  applyPointerEvents,
  calcSnapNum,
  collectCollidableElements,
  shouldTransitionTo,
  toTransformCss,
} from '@axe/shared/directives/movable-helpers';

describe('movable-helpers', () => {
  describe('calcSnapNum', () => {
    it('interval が 0 以下なら元の値を返す', () => {
      expect(calcSnapNum(13, 0)).toBe(13);
      expect(calcSnapNum(13, -1)).toBe(13);
    });

    it('正数をグリッドに丸める', () => {
      expect(calcSnapNum(13, 25)).toBe(25);
      expect(calcSnapNum(36, 25)).toBe(25);
    });

    it('負数をグリッドに丸める', () => {
      expect(calcSnapNum(-13, 25)).toBe(-25);
      expect(calcSnapNum(-36, 25)).toBe(-25);
    });
  });

  describe('toTransformCss', () => {
    it('translate3d 文字列を返す', () => {
      expect(toTransformCss(1, 2, 3, 'scale(2)')).toBe('translate3d(1px,2px,3px) scale(2)');
    });
  });

  describe('shouldTransitionTo', () => {
    it('object または location がなければ false', () => {
      expect(shouldTransitionTo(null, 0, 0, 0)).toBe(false);
      expect(shouldTransitionTo({} as TabletopObject, 0, 0, 0)).toBe(false);
    });

    it('位置が異なれば true', () => {
      const object = {
        location: { x: 1, y: 2 },
        posZ: 3,
      } as TabletopObject;
      expect(shouldTransitionTo(object, 0, 0, 0)).toBe(true);
    });

    it('位置が同じなら false', () => {
      const object = {
        location: { x: 1, y: 2 },
        posZ: 3,
      } as TabletopObject;
      expect(shouldTransitionTo(object, 1, 2, 3)).toBe(false);
    });
  });

  describe('collectCollidableElements / applyPointerEvents', () => {
    it('root が collidable なら root のみ返す', () => {
      const root = document.createElement('div');
      root.style.pointerEvents = 'auto';
      const result = collectCollidableElements(root);
      expect(result).toEqual([root]);
    });

    it('root が non-collidable なら子要素から収集する', () => {
      const root = document.createElement('div');
      root.style.pointerEvents = 'none';
      const child = document.createElement('span');
      child.style.pointerEvents = 'auto';
      root.appendChild(child);
      const result = collectCollidableElements(root);
      expect(result).toEqual([child]);
    });

    it('applyPointerEvents で一括反映できる', () => {
      const a = document.createElement('div');
      const b = document.createElement('span');
      applyPointerEvents([a, b], false);
      expect(a.style.pointerEvents).toBe('none');
      expect(b.style.pointerEvents).toBe('none');
      applyPointerEvents([a, b], true);
      expect(a.style.pointerEvents).toBe('auto');
      expect(b.style.pointerEvents).toBe('auto');
    });
  });
});
