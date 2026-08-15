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
    it('returns nothing for an empty string', () => {
      expect(parseCellPattern('')).toEqual([]);
    });

    it('reads three cells out of a list', () => {
      expect(parseCellPattern('0,0;1,2;3,-4')).toEqual([
        { gx: 0, gy: 0 },
        { gx: 1, gy: 2 },
        { gx: 3, gy: -4 },
      ]);
    });

    it('forgives spaces and a trailing separator', () => {
      expect(parseCellPattern(' 0, 0 ; 1, 1 ; ')).toEqual([
        { gx: 0, gy: 0 },
        { gx: 1, gy: 1 },
      ]);
    });

    it('drops the repeats', () => {
      expect(parseCellPattern('1,1;1,1;2,2')).toEqual([
        { gx: 1, gy: 1 },
        { gx: 2, gy: 2 },
      ]);
    });

    it('ignores a token it cannot read', () => {
      expect(parseCellPattern('1,1;abc;2,;,3;4,5')).toEqual([
        { gx: 1, gy: 1 },
        { gx: 4, gy: 5 },
      ]);
    });
  });

  describe('serializeCellPattern', () => {
    it('rounds to whole cells and joins them', () => {
      expect(
        serializeCellPattern([
          { gx: 1.7, gy: -2.3 },
          { gx: 3, gy: 4 },
        ])
      ).toBe('1,-2;3,4');
    });

    it('drops the repeats', () => {
      expect(
        serializeCellPattern([
          { gx: 1, gy: 1 },
          { gx: 1, gy: 1 },
        ])
      ).toBe('1,1');
    });

    it('normalises through a read and a write', () => {
      const round = serializeCellPattern(parseCellPattern('0,0;1,1;0,0'));
      expect(round).toBe('0,0;1,1');
    });
  });

  describe('cellPatternBoundingBox', () => {
    it('is nothing when there are no cells', () => {
      expect(cellPatternBoundingBox([])).toEqual({
        minX: 0,
        minY: 0,
        maxX: 0,
        maxY: 0,
        width: 0,
        height: 0,
      });
    });

    it('measures the extent', () => {
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

    it('leaves the cells alone at no turn', () => {
      expect(rotateCellPattern(cells, 0)).toEqual(cells);
    });

    it('turns the cells a quarter', () => {
      expect(rotateCellPattern(cells, 1)).toEqual([
        { gx: 0, gy: 1 },
        { gx: -1, gy: 0 },
      ]);
    });

    it('brings them back round the full turn', () => {
      expect(rotateCellPattern(cells, 4)).toEqual(cells);
    });

    it('normalises a turn the other way', () => {
      expect(rotateCellPattern(cells, -1)).toEqual(rotateCellPattern(cells, 3));
    });
  });

  describe('normalizeCellPattern', () => {
    it('puts the top left of the extent at the origin', () => {
      const normalized = normalizeCellPattern([
        { gx: 2, gy: 3 },
        { gx: 4, gy: 5 },
      ]);
      expect(normalized).toEqual([
        { gx: 0, gy: 0 },
        { gx: 2, gy: 2 },
      ]);
    });

    it('leaves an empty list empty', () => {
      expect(normalizeCellPattern([])).toEqual([]);
    });
  });

  describe('cellKey & cellPatternToSet', () => {
    it('rounds a cell key to whole numbers', () => {
      expect(cellKey(1.7, -2.3)).toBe('1,-2');
    });

    it('gathers the pattern into a set', () => {
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
