import { convertMoveLength, isLengthUnit, parseMoveUnit } from '@axe/domain/tabletop/move/move-units';

describe('parseMoveUnit()', () => {
  it('knows the three units by the names a sheet writes them under', () => {
    expect(parseMoveUnit('マス')).toBe('cell');
    expect(parseMoveUnit('cells')).toBe('cell');
    expect(parseMoveUnit('メートル')).toBe('metre');
    expect(parseMoveUnit('m')).toBe('metre');
    expect(parseMoveUnit('フィート')).toBe('foot');
    expect(parseMoveUnit('ft')).toBe('foot');
    expect(parseMoveUnit('FEET')).toBe('foot');
  });

  it('reads nothing out of a unit nobody here knows, or none at all', () => {
    expect(parseMoveUnit('間')).toBeNull();
    expect(parseMoveUnit('')).toBeNull();
    expect(parseMoveUnit(null)).toBeNull();
  });
});

describe('convertMoveLength()', () => {
  it('turns feet into metres and back', () => {
    expect(convertMoveLength(30, 'foot', 'metre')).toBeCloseTo(9.144, 3);
    expect(convertMoveLength(9.144, 'metre', 'foot')).toBeCloseTo(30, 3);
  });

  it('leaves a length alone where it is already in that unit', () => {
    expect(convertMoveLength(30, 'foot', 'foot')).toBe(30);
  });

  it('leaves cells alone, a count of them being nobody’s length', () => {
    expect(convertMoveLength(4, 'cell', 'metre')).toBe(4);
    expect(convertMoveLength(4, 'metre', 'cell')).toBe(4);
    expect(isLengthUnit('cell')).toBe(false);
  });
});
