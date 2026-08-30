import { asTableFacingMark, TABLE_FACING_MARKS } from '@axe/domain/tabletop/table-facing-mark';

describe('asTableFacingMark()', () => {
  it('keeps a way of showing facing that it knows', () => {
    for (const mark of TABLE_FACING_MARKS) expect(asTableFacingMark(mark)).toBe(mark);
  });

  it('shows nothing for a table that says nothing, or says something it does not know', () => {
    expect(asTableFacingMark(undefined)).toBe('none');
    expect(asTableFacingMark('')).toBe('none');
    expect(asTableFacingMark('compass')).toBe('none');
    expect(asTableFacingMark(7)).toBe('none');
  });
});
