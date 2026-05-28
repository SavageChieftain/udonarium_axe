import {
  cellKey,
  cellPatternBoundingBox,
  cellPatternToSet,
  normalizeCellPattern,
  parseCellPattern,
  rotateCellPattern,
  serializeCellPattern,
} from '@axe/domain/tabletop/cell-pattern';

describe('cell-pattern', () => {
  describe('parseCellPattern', () => {
    it('空文字列は空配列', () => {
      expect(parseCellPattern('')).toEqual([]);
    });

    it('"0,0;1,2;3,-4" を3要素にパース', () => {
      expect(parseCellPattern('0,0;1,2;3,-4')).toEqual([
        { gx: 0, gy: 0 },
        { gx: 1, gy: 2 },
        { gx: 3, gy: -4 },
      ]);
    });

    it('空白や末尾セパレータを許容', () => {
      expect(parseCellPattern(' 0, 0 ; 1, 1 ; ')).toEqual([
        { gx: 0, gy: 0 },
        { gx: 1, gy: 1 },
      ]);
    });

    it('重複は除去', () => {
      expect(parseCellPattern('1,1;1,1;2,2')).toEqual([
        { gx: 1, gy: 1 },
        { gx: 2, gy: 2 },
      ]);
    });

    it('不正トークンは無視', () => {
      expect(parseCellPattern('1,1;abc;2,;,3;4,5')).toEqual([
        { gx: 1, gy: 1 },
        { gx: 4, gy: 5 },
      ]);
    });
  });

  describe('serializeCellPattern', () => {
    it('整数化して結合', () => {
      expect(
        serializeCellPattern([
          { gx: 1.7, gy: -2.3 },
          { gx: 3, gy: 4 },
        ])
      ).toBe('1,-2;3,4');
    });

    it('重複を除去', () => {
      expect(
        serializeCellPattern([
          { gx: 1, gy: 1 },
          { gx: 1, gy: 1 },
        ])
      ).toBe('1,1');
    });

    it('parse -> serialize で正規化される', () => {
      const round = serializeCellPattern(parseCellPattern('0,0;1,1;0,0'));
      expect(round).toBe('0,0;1,1');
    });
  });

  describe('cellPatternBoundingBox', () => {
    it('空のときはゼロ', () => {
      expect(cellPatternBoundingBox([])).toEqual({
        minX: 0,
        minY: 0,
        maxX: 0,
        maxY: 0,
        width: 0,
        height: 0,
      });
    });

    it('範囲を正しく算出', () => {
      expect(
        cellPatternBoundingBox([
          { gx: -1, gy: 2 },
          { gx: 3, gy: -4 },
          { gx: 0, gy: 0 },
        ])
      ).toEqual({ minX: -1, minY: -4, maxX: 3, maxY: 2, width: 5, height: 7 });
    });
  });

  describe('rotateCellPattern', () => {
    const cells = [
      { gx: 1, gy: 0 },
      { gx: 0, gy: 1 },
    ];

    it('quadrants=0 で同一', () => {
      expect(rotateCellPattern(cells, 0)).toEqual(cells);
    });

    it('90°回転で (1,0) -> (0,1), (0,1) -> (-1,0)', () => {
      expect(rotateCellPattern(cells, 1)).toEqual([
        { gx: 0, gy: 1 },
        { gx: -1, gy: 0 },
      ]);
    });

    it('360°回転で元に戻る', () => {
      expect(rotateCellPattern(cells, 4)).toEqual(cells);
    });

    it('負の回転も正規化', () => {
      expect(rotateCellPattern(cells, -1)).toEqual(rotateCellPattern(cells, 3));
    });
  });

  describe('normalizeCellPattern', () => {
    it('bounding box の左上が (0,0) になる', () => {
      const normalized = normalizeCellPattern([
        { gx: 2, gy: 3 },
        { gx: 4, gy: 5 },
      ]);
      expect(normalized).toEqual([
        { gx: 0, gy: 0 },
        { gx: 2, gy: 2 },
      ]);
    });

    it('空配列は空のまま', () => {
      expect(normalizeCellPattern([])).toEqual([]);
    });
  });

  describe('cellKey & cellPatternToSet', () => {
    it('cellKey は整数化', () => {
      expect(cellKey(1.7, -2.3)).toBe('1,-2');
    });

    it('cellPatternToSet で集合化', () => {
      const set = cellPatternToSet([
        { gx: 1, gy: 2 },
        { gx: 3, gy: 4 },
        { gx: 1, gy: 2 },
      ]);
      expect(set.size).toBe(2);
      expect(set.has('1,2')).toBe(true);
      expect(set.has('3,4')).toBe(true);
    });
  });
});
