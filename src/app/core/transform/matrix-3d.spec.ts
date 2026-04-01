import { Matrix3D } from '@axe/core/transform/matrix-3d';

describe('Matrix3D', () => {
  describe('constructor', () => {
    it('単位行列で初期化される', () => {
      const m = new Matrix3D();
      expect(m.m11).toBe(1);
      expect(m.m22).toBe(1);
      expect(m.m33).toBe(1);
      expect(m.m44).toBe(1);
      expect(m.m12).toBe(0);
      expect(m.m13).toBe(0);
      expect(m.m14).toBe(0);
      expect(m.m21).toBe(0);
    });
  });

  describe('identity()', () => {
    it('単位行列にリセットする', () => {
      const m = new Matrix3D();
      m.m11 = 5;
      m.m41 = 10;
      m.identity();
      expect(m.m11).toBe(1);
      expect(m.m41).toBe(0);
      expect(m.m44).toBe(1);
    });
  });

  describe('setData()', () => {
    it('16要素配列から設定する', () => {
      const m = new Matrix3D();
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
      m.setData(data);
      expect(m.m11).toBe(1);
      expect(m.m12).toBe(2);
      expect(m.m44).toBe(16);
      expect(m.m41).toBe(13);
    });

    it('6要素配列(2D matrix)から設定する', () => {
      const m = new Matrix3D();
      m.setData([1, 0, 0, 1, 100, 200]);
      expect(m.m11).toBe(1);
      expect(m.m22).toBe(1);
      expect(m.m41).toBe(100);
      expect(m.m42).toBe(200);
      expect(m.m33).toBe(1);
      expect(m.m44).toBe(1);
    });

    it('nullの場合何もしない', () => {
      const m = new Matrix3D();
      m.setData(null!);
      expect(m.m11).toBe(1);
    });
  });

  describe('scalar()', () => {
    it('全要素にスカラー値を掛ける', () => {
      const m = new Matrix3D();
      m.scalar(2);
      expect(m.m11).toBe(2);
      expect(m.m22).toBe(2);
      expect(m.m33).toBe(2);
      expect(m.m44).toBe(2);
      expect(m.m12).toBe(0);
    });
  });

  describe('setPosition / getPosition', () => {
    it('位置を設定・取得する', () => {
      const m = new Matrix3D();
      m.setPosition({ x: 10, y: 20, z: 30, w: 1 });
      expect(m.m41).toBe(10);
      expect(m.m42).toBe(20);
      expect(m.m43).toBe(30);

      const pos = m.getPosition();
      expect(pos.x).toBe(10);
      expect(pos.y).toBe(20);
      expect(pos.z).toBe(30);
    });
  });

  describe('makePosition()', () => {
    it('位置行列を作成する', () => {
      const m = Matrix3D.makePosition({ x: 5, y: 10, z: 15, w: 1 });
      expect(m.m41).toBe(5);
      expect(m.m42).toBe(10);
      expect(m.m43).toBe(15);
      expect(m.m11).toBe(1);
    });
  });

  describe('multiply()', () => {
    it('単位行列同士の乗算は単位行列', () => {
      const a = new Matrix3D();
      const b = new Matrix3D();
      const result = Matrix3D.multiply(a, b);
      expect(result.m11).toBe(1);
      expect(result.m22).toBe(1);
      expect(result.m33).toBe(1);
      expect(result.m44).toBe(1);
      expect(result.m12).toBe(0);
    });

    it('平行移動行列の乗算で加算される', () => {
      const a = new Matrix3D();
      a.setPosition({ x: 10, y: 0, z: 0, w: 1 });
      const b = new Matrix3D();
      b.setPosition({ x: 5, y: 0, z: 0, w: 1 });
      const result = Matrix3D.multiply(a, b);
      expect(result.m41).toBe(15);
    });
  });

  describe('setCSS()', () => {
    it('matrix(...)文字列をパースする', () => {
      const m = new Matrix3D();
      m.setCSS('matrix(1, 0, 0, 1, 100, 200)');
      expect(m.m11).toBe(1);
      expect(m.m22).toBe(1);
      expect(m.m41).toBe(100);
      expect(m.m42).toBe(200);
    });

    it('matrix3d(...)文字列をパースする', () => {
      const m = new Matrix3D();
      m.setCSS('matrix3d(1,0,0,0, 0,1,0,0, 0,0,1,0, 50,60,70,1)');
      expect(m.m11).toBe(1);
      expect(m.m41).toBe(50);
      expect(m.m42).toBe(60);
      expect(m.m43).toBe(70);
    });

    it('"none"の場合単位行列にリセットする', () => {
      const m = new Matrix3D();
      m.m41 = 999;
      m.setCSS('none');
      expect(m.m41).toBe(0);
      expect(m.m11).toBe(1);
    });

    it('空文字列の場合単位行列にリセットする', () => {
      const m = new Matrix3D();
      m.m41 = 999;
      m.setCSS('');
      expect(m.m41).toBe(0);
    });
  });

  describe('flatten()', () => {
    it('Z関連の値をリセットする', () => {
      const m = new Matrix3D();
      m.m31 = 5;
      m.m32 = 5;
      m.m34 = 5;
      m.m14 = 5;
      m.m24 = 5;
      m.m43 = 5;
      m.flatten();
      expect(m.m31).toBe(0);
      expect(m.m32).toBe(0);
      expect(m.m33).toBe(1);
      expect(m.m34).toBe(0);
      expect(m.m14).toBe(0);
      expect(m.m24).toBe(0);
      expect(m.m43).toBe(0);
      expect(m.m44).toBe(1);
    });
  });

  describe('invert()', () => {
    it('単位行列の逆行列は単位行列', () => {
      const m = new Matrix3D();
      const inv = m.invert(new Matrix3D());
      expect(inv.m11).toBeCloseTo(1);
      expect(inv.m22).toBeCloseTo(1);
      expect(inv.m33).toBeCloseTo(1);
      expect(inv.m44).toBeCloseTo(1);
    });

    it('平行移動行列の逆行列は符号反転', () => {
      const m = new Matrix3D();
      m.setPosition({ x: 10, y: 20, z: 30, w: 1 });
      const inv = m.invert(new Matrix3D());
      expect(inv.m41).toBeCloseTo(-10);
      expect(inv.m42).toBeCloseTo(-20);
      expect(inv.m43).toBeCloseTo(-30);
    });
  });

  describe('project / unproject', () => {
    it('単位行列でのprojectは座標をそのまま返す', () => {
      const m = new Matrix3D();
      const result = m.project({ x: 10, y: 20, z: 0, w: 1 });
      expect(result.x).toBeCloseTo(10);
      expect(result.y).toBeCloseTo(20);
    });

    it('単位行列でのunprojectは座標をそのまま返す', () => {
      const m = new Matrix3D();
      const result = m.unproject({ x: 10, y: 20 });
      expect(result.x).toBeCloseTo(10);
      expect(result.y).toBeCloseTo(20);
    });
  });

  describe('append()', () => {
    it('行列を連結する', () => {
      const a = new Matrix3D();
      a.setPosition({ x: 10, y: 0, z: 0, w: 1 });
      const b = new Matrix3D();
      b.setPosition({ x: 5, y: 0, z: 0, w: 1 });
      a.append(b);
      expect(a.m41).toBe(15);
    });
  });

  describe('toString()', () => {
    it('行列を文字列に変換する', () => {
      const m = new Matrix3D();
      const str = m.toString();
      expect(str).toContain('m11=1.000');
      expect(str).toContain('m22=1.000');
    });

    it('小数桁数を指定できる', () => {
      const m = new Matrix3D();
      const str = m.toString(1);
      expect(str).toContain('m11=1.0');
    });
  });

  describe('makePerspective()', () => {
    it('透視変換行列を作成する', () => {
      const m = Matrix3D.makePerspective(1000);
      expect(m.m34).toBeCloseTo(-0.001);
      expect(m.m11).toBe(1);
    });

    it('perspective=0の場合m34=0', () => {
      const m = Matrix3D.makePerspective(0);
      expect(m.m34).toBe(0);
    });
  });
});
