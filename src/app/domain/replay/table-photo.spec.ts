import { buildTablePhotoLayout, TABLE_PHOTO_WIDE, type TablePhotoMember } from '@axe/domain/replay/table-photo';

function members(count: number): TablePhotoMember[] {
  return Array.from({ length: count }, (_, index) => ({
    identifier: `c${index}`,
    name: `コマ${index}`,
    imageIdentifier: `img${index}`,
  }));
}

describe('buildTablePhotoLayout()', () => {
  it('誰も居なければ枠を作らないこと', () => {
    const layout = buildTablePhotoLayout([]);

    expect(layout.cells).toEqual([]);
    expect(layout.columns).toBe(0);
    expect(layout.omitted).toBe(0);
  });

  it('枠を紙の中に収めること', () => {
    const layout = buildTablePhotoLayout(members(7));

    for (const cell of layout.cells) {
      expect(cell.x).toBeGreaterThanOrEqual(0);
      expect(cell.y).toBeGreaterThanOrEqual(0);
      expect(cell.x + cell.width).toBeLessThanOrEqual(layout.width);
      expect(cell.y + cell.height).toBeLessThanOrEqual(layout.height);
    }
  });

  it('枠を重ねないこと', () => {
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

  it('欠けた最後の行を中央へ寄せること', () => {
    const layout = buildTablePhotoLayout(members(5));
    const lastRow = layout.cells.slice(layout.columns);
    const left = lastRow[0].x;
    const right = lastRow[lastRow.length - 1].x + lastRow[lastRow.length - 1].width;

    expect(layout.width - right).toBeCloseTo(left, 0);
  });

  it('立ち絵の並びを見出しの下から始めること', () => {
    const layout = buildTablePhotoLayout(members(4));

    for (const cell of layout.cells) expect(cell.y).toBeGreaterThan(layout.subtitle.y);
  });

  it('人数が増えても横に並べすぎないこと', () => {
    expect(buildTablePhotoLayout(members(2)).columns).toBe(2);
    expect(buildTablePhotoLayout(members(6)).columns).toBe(3);
    expect(buildTablePhotoLayout(members(16)).columns).toBe(4);
  });

  it('入りきらない分を黙って落とさず、数を返すこと', () => {
    const layout = buildTablePhotoLayout(members(30));

    expect(layout.cells).toHaveLength(24);
    expect(layout.omitted).toBe(6);
  });

  it('紙の大きさに合わせて寸法を縮めること', () => {
    const wide = buildTablePhotoLayout(members(4), TABLE_PHOTO_WIDE);
    const small = buildTablePhotoLayout(members(4), { width: 960, height: 540 });

    expect(small.title.fontSize).toBeLessThan(wide.title.fontSize);
    expect(small.cells[0].width).toBeLessThan(wide.cells[0].width);
  });
});
