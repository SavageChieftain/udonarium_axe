import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Transform } from './transform';

describe('Transform', () => {
  describe('constructor', () => {
    it('HTMLElementを渡してインスタンスを作成できる', () => {
      const el = document.createElement('div');
      document.body.appendChild(el);
      const transform = new Transform(el);
      expect(transform).toBeTruthy();
      document.body.removeChild(el);
    });
  });

  describe('clear', () => {
    it('clearで内部状態をリセットする', () => {
      const el = document.createElement('div');
      document.body.appendChild(el);
      const transform = new Transform(el);
      const result = transform.clear();
      expect(result).toBe(transform);
      document.body.removeChild(el);
    });
  });

  describe('globalToLocal', () => {
    it('グローバル座標をローカル座標に変換する', () => {
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
    it('ローカル座標をグローバル座標に変換する', () => {
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
    it('要素間のローカル座標変換を行う', () => {
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
});
