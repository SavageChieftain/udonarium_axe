import { GridFaceCache, gridFaceKey, GridLook } from '@axe/features/tabletop/game-table/grid-face-cache';

const look: GridLook = { gridSize: 50, gridType: 0, gridColor: '#000000', gridFontColor: '#000000' };

describe('GridFaceCache', () => {
  it('hands back the face it drew before rather than drawing it again', () => {
    const cache = new GridFaceCache();
    let drawn = 0;
    const draw = () => {
      drawn += 1;
      return `face-${drawn}`;
    };

    expect(cache.remember('key', draw)).toBe('face-1');
    expect(cache.remember('key', draw)).toBe('face-1');
    expect(drawn).toBe(1);
  });

  it('draws again after a face that could not be drawn', () => {
    const cache = new GridFaceCache();

    expect(cache.dataUrl(look, 100, 80, 0, 0, '', null)).toBe('');

    const key = gridFaceKey(look, 100, 80, 0, 0, '', null);
    expect(cache.remember(key, () => 'data:image/png;base64,drawn')).toBe('data:image/png;base64,drawn');
  });
});
