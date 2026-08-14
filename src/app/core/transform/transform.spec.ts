import { Transform } from '@axe/core/transform/transform';

describe('Transform', () => {
  type TransformPrivateApi = {
    getPosition: (node: HTMLElement) => { x: number; y: number };
  };

  describe('constructor', () => {
    it('can be built from an element', () => {
      const el = document.createElement('div');
      document.body.appendChild(el);
      const transform = new Transform(el);
      expect(transform).toBeTruthy();
      document.body.removeChild(el);
    });
  });

  describe('clear', () => {
    it('resets its state when cleared', () => {
      const el = document.createElement('div');
      document.body.appendChild(el);
      const transform = new Transform(el);
      const result = transform.clear();
      expect(result).toBe(transform);
      document.body.removeChild(el);
    });
  });

  describe('globalToLocal', () => {
    it('converts a global point into a local one', () => {
      const el = document.createElement('div');
      document.body.appendChild(el);
      const transform = new Transform(el);
      const point = transform.globalToLocal(100, 200);
      expect(point).toHaveProperty('x');
      expect(point).toHaveProperty('y');
      expect(point).toHaveProperty('z');
      expect(point).toHaveProperty('w');
      document.body.removeChild(el);
    });
  });

  describe('localToGlobal', () => {
    it('converts a local point into a global one', () => {
      const el = document.createElement('div');
      document.body.appendChild(el);
      const transform = new Transform(el);
      const point = transform.localToGlobal(50, 75);
      expect(point).toHaveProperty('x');
      expect(point).toHaveProperty('y');
      expect(point).toHaveProperty('z');
      expect(point).toHaveProperty('w');
      document.body.removeChild(el);
    });
  });

  describe('localToLocal', () => {
    it('converts a point from one element to another', () => {
      const el1 = document.createElement('div');
      const el2 = document.createElement('div');
      document.body.appendChild(el1);
      document.body.appendChild(el2);
      const transform = new Transform(el1);
      const point = transform.localToLocal(10, 20, 0, el2);
      expect(point).toHaveProperty('x');
      expect(point).toHaveProperty('y');
      document.body.removeChild(el1);
      document.body.removeChild(el2);
    });
  });

  describe('getPosition', () => {
    it('measures a node with no parent without throwing', () => {
      const host = document.createElement('div');
      document.body.appendChild(host);
      const transform = new Transform(host) as unknown as TransformPrivateApi;

      const offsetParent = {
        clientLeft: 5,
        clientTop: 7,
      } as HTMLElement;

      const detached = {
        offsetLeft: 11,
        offsetTop: 13,
        offsetParent,
        parentElement: null,
      } as unknown as HTMLElement;

      expect(() => transform.getPosition(detached)).not.toThrow();
      expect(transform.getPosition(detached)).toEqual({ x: 5, y: 7 });

      document.body.removeChild(host);
    });
  });
});
