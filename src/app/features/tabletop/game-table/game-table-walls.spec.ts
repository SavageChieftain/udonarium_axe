import { GameTable } from '@axe/domain/tabletop/game-table';
import {
  WALL_SIDES,
  wallBackground,
  wallFaceFor,
  wallIsMirrored,
} from '@axe/features/tabletop/game-table/game-table-walls';

describe('game table walls', () => {
  it('lists the four walls north, south, west, east, with their labels', () => {
    expect(WALL_SIDES.map((side) => side.surface)).toEqual(['north-wall', 'south-wall', 'west-wall', 'east-wall']);
    expect(WALL_SIDES.map((side) => side.labelPrefix)).toEqual(['N', 'S', 'W', 'E']);
    expect(WALL_SIDES.map((side) => side.along)).toEqual(['width', 'width', 'depth', 'depth']);
  });

  it('reads which walls a table shows and what hangs on them', () => {
    const table = {
      showNorthWall: true,
      showSouthWall: false,
      showWestWall: true,
      showEastWall: false,
      northWallImageIdentifier: 'n',
      southWallImageIdentifier: 's',
      westWallImageIdentifier: 'w',
      eastWallImageIdentifier: 'e',
    } as GameTable;
    expect(WALL_SIDES.map((side) => side.shown(table))).toEqual([true, false, true, false]);
    expect(WALL_SIDES.map((side) => side.imageIdentifier(table))).toEqual(['n', 's', 'w', 'e']);
  });

  it('draws the south and west walls from the far end of their faces', () => {
    expect(wallIsMirrored('south-wall')).toBe(true);
    expect(wallIsMirrored('west-wall')).toBe(true);
    expect(wallIsMirrored('north-wall')).toBe(false);
    expect(wallIsMirrored('floor')).toBe(false);
  });

  it('describes each face by the edge it runs along and the way it looks', () => {
    expect(wallFaceFor('north-wall', 500, 300, 100)).toEqual({
      ax: 0,
      ay: 0,
      bx: 500,
      by: 0,
      nx: 0,
      ny: 1,
      heightPx: 100,
    });
    expect(wallFaceFor('east-wall', 500, 300, 100)).toEqual({
      ax: 500,
      ay: 0,
      bx: 500,
      by: 300,
      nx: -1,
      ny: 0,
      heightPx: 100,
    });
    expect(wallFaceFor('floor', 500, 300, 100)).toBeNull();
  });

  it('lays the grid over the picture only when there is one', () => {
    expect(wallBackground('a.png', '')).toEqual({
      surfaceBackground: 'url(a.png)',
      surfaceBackgroundSize: '100% 100%',
      surfaceBackgroundRepeat: 'no-repeat',
    });
    expect(wallBackground('a.png', 'data:g').surfaceBackground).toBe('url(data:g), url(a.png)');
  });
});
