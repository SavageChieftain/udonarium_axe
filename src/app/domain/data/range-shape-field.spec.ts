import {
  decodeRangeShapeField,
  defaultRangeShapeFieldValue,
  encodeRangeShapeField,
  isRangeShapeGridType,
} from '@axe/domain/data/range-shape-field';

describe('range-shape-field', () => {
  describe('isRangeShapeGridType', () => {
    it('square / hex-vertical / hex-horizontal を真と判定', () => {
      expect(isRangeShapeGridType('square')).toBe(true);
      expect(isRangeShapeGridType('hex-vertical')).toBe(true);
      expect(isRangeShapeGridType('hex-horizontal')).toBe(true);
    });

    it('未知の値や数値を偽と判定', () => {
      expect(isRangeShapeGridType('hex')).toBe(false);
      expect(isRangeShapeGridType('')).toBe(false);
      expect(isRangeShapeGridType(123)).toBe(false);
      expect(isRangeShapeGridType(null)).toBe(false);
    });
  });

  describe('encode/decode 往復', () => {
    it('全フィールドが保たれる', () => {
      const original = {
        name: '攻撃',
        cellPattern: '0,0;1,0;0,1',
        gridType: 'square' as const,
        gridColor: '#ABCDEF',
        rangeColor: '#FEDCBA',
        isRotatable: true,
      };
      const decoded = decodeRangeShapeField(encodeRangeShapeField(original));
      expect(decoded).toEqual(original);
    });

    it('isRotatable 未指定は false', () => {
      const decoded = decodeRangeShapeField('{"gridType":"square"}');
      expect(decoded?.isRotatable).toBe(false);
    });
  });

  describe('decodeRangeShapeField', () => {
    it('空文字列は null', () => {
      expect(decodeRangeShapeField('')).toBeNull();
      expect(decodeRangeShapeField('   ')).toBeNull();
    });

    it('null / 数値は null', () => {
      expect(decodeRangeShapeField(null)).toBeNull();
      expect(decodeRangeShapeField(123)).toBeNull();
    });

    it('JSON 破損は null', () => {
      expect(decodeRangeShapeField('not json')).toBeNull();
      expect(decodeRangeShapeField('{')).toBeNull();
    });

    it('gridType が不正な値なら null', () => {
      expect(decodeRangeShapeField('{"gridType":"bad"}')).toBeNull();
      expect(decodeRangeShapeField('{}')).toBeNull();
    });

    it('一部欠けているフィールドはデフォルトで埋まる', () => {
      const decoded = decodeRangeShapeField('{"gridType":"square"}');
      expect(decoded).toEqual({
        name: '',
        cellPattern: '',
        gridType: 'square',
        gridColor: '#FFFF00',
        rangeColor: '#000000',
        isRotatable: false,
      });
    });
  });

  describe('defaultRangeShapeFieldValue', () => {
    it('デフォルトは square + 黄色グリッド + 黒レンジ + 回転不可', () => {
      expect(defaultRangeShapeFieldValue()).toEqual({
        name: '',
        cellPattern: '',
        gridType: 'square',
        gridColor: '#FFFF00',
        rangeColor: '#000000',
        isRotatable: false,
      });
    });
  });
});
