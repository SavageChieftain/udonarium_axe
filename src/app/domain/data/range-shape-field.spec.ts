import {
  decodeRangeShapeField,
  defaultRangeShapeFieldValue,
  encodeRangeShapeField,
  isRangeShapeGridType,
} from '@axe/domain/data/range-shape-field';

describe('range-shape-field', () => {
  describe('isRangeShapeGridType', () => {
    it('is true for the three grids it knows', () => {
      expect(isRangeShapeGridType('square')).toBe(true);
      expect(isRangeShapeGridType('hex-vertical')).toBe(true);
      expect(isRangeShapeGridType('hex-horizontal')).toBe(true);
    });

    it('is false for anything else', () => {
      expect(isRangeShapeGridType('hex')).toBe(false);
      expect(isRangeShapeGridType('')).toBe(false);
      expect(isRangeShapeGridType(123)).toBe(false);
      expect(isRangeShapeGridType(null)).toBe(false);
    });
  });

  describe('the round trip', () => {
    it('keeps every field', () => {
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

    it('reads a missing turnable flag as false', () => {
      const decoded = decodeRangeShapeField('{"gridType":"square"}');
      expect(decoded?.isRotatable).toBe(false);
    });
  });

  describe('decodeRangeShapeField', () => {
    it('returns nothing for an empty string', () => {
      expect(decodeRangeShapeField('')).toBeNull();
      expect(decodeRangeShapeField('   ')).toBeNull();
    });

    it('returns nothing for anything that is not text', () => {
      expect(decodeRangeShapeField(null)).toBeNull();
      expect(decodeRangeShapeField(123)).toBeNull();
    });

    it('returns nothing for broken json', () => {
      expect(decodeRangeShapeField('not json')).toBeNull();
      expect(decodeRangeShapeField('{')).toBeNull();
    });

    it('returns nothing for a grid type it does not know', () => {
      expect(decodeRangeShapeField('{"gridType":"bad"}')).toBeNull();
      expect(decodeRangeShapeField('{}')).toBeNull();
    });

    it('fills the missing fields in with their defaults', () => {
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
    it('starts on squares, with the default colours, and cannot be turned', () => {
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
