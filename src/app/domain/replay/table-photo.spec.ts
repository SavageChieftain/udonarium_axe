import { buildTablePhotoLayout, TABLE_PHOTO_WIDE, type TablePhotoMember } from '@axe/domain/replay/table-photo';

function members(count: number): TablePhotoMember[] {
  return Array.from({ length: count }, (_, index) => ({
    identifier: `c${index}`,
    name: `コマ${index}`,
    imageIdentifier: `img${index}`,
  }));
}

describe('buildTablePhotoLayout()', () => {
  it('builds no frames for nobody', () => {
    const layout = buildTablePhotoLayout([]);

    expect(layout.cells).toEqual([]);
    expect(layout.columns).toBe(0);
    expect(layout.omitted).toBe(0);
  });

  it('keeps the frames inside the sheet', () => {
    const layout = buildTablePhotoLayout(members(7));

    for (const cell of layout.cells) {
      expect(cell.x).toBeGreaterThanOrEqual(0);
      expect(cell.y).toBeGreaterThanOrEqual(0);
      expect(cell.x + cell.width).toBeLessThanOrEqual(layout.width);
      expect(cell.y + cell.height).toBeLessThanOrEqual(layout.height);
    }
  });

  it('lays no frame over another', () => {
    const layout = buildTablePhotoLayout(members(9));

    for (const [index, cell] of layout.cells.entries()) {
      for (const other of layout.cells.slice(index + 1)) {
        const apart =
          cell.x + cell.width <= other.x ||
          other.x + other.width <= cell.x ||
          cell.y + cell.height <= other.y ||
          other.y + other.height <= cell.y;
        expect(apart).toBe(true);
      }
    }
  });

  it('centres a last row that is not full', () => {
    const layout = buildTablePhotoLayout(members(5));
    const lastRow = layout.cells.slice(layout.columns);
    const left = lastRow[0].x;
    const right = lastRow[lastRow.length - 1].x + lastRow[lastRow.length - 1].width;

    expect(layout.width - right).toBeCloseTo(left, 0);
  });

  it('starts the portraits below the heading', () => {
    const layout = buildTablePhotoLayout(members(4));

    for (const cell of layout.cells) expect(cell.y).toBeGreaterThan(layout.subtitle.y);
  });

  it('puts no more across a row however many there are', () => {
    expect(buildTablePhotoLayout(members(2)).columns).toBe(2);
    expect(buildTablePhotoLayout(members(6)).columns).toBe(3);
    expect(buildTablePhotoLayout(members(16)).columns).toBe(4);
  });

  it('returns the count of who did not fit rather than dropping them in silence', () => {
    const layout = buildTablePhotoLayout(members(30));

    expect(layout.cells).toHaveLength(24);
    expect(layout.omitted).toBe(6);
  });

  it('scales the measurements to the size of the sheet', () => {
    const wide = buildTablePhotoLayout(members(4), TABLE_PHOTO_WIDE);
    const small = buildTablePhotoLayout(members(4), { width: 960, height: 540 });

    expect(small.title.fontSize).toBeLessThan(wide.title.fontSize);
    expect(small.cells[0].width).toBeLessThan(wide.cells[0].width);
  });
});
