import { ObjectStore } from '@axe/core/sync/object-store';
import { boardSurfaceOf, surfaceOf } from '@axe/domain/tabletop/tabletop-object';
import {
  clampBoardPitch,
  MAX_BOARD_PITCH,
  setBoardHeightKeepingFoot,
  WhiteBoard,
} from '@axe/domain/tabletop/white-board';

describe('WhiteBoard', () => {
  let board: WhiteBoard;

  beforeEach(() => {
    board = WhiteBoard.create('board', 6, 4, 1);
  });

  afterEach(() => {
    ObjectStore.instance.remove(board);
  });

  it('arrives at the size it was asked for, lying flat and solid', () => {
    expect(board.name).toBe('board');
    expect(board.width).toBe(6);
    expect(board.height).toBe(4);
    expect(board.opacity).toBe(1);
    expect(board.pitch).toBe(0);
    expect(board.isStanding).toBe(false);
  });

  it('stands up once it is tilted at all', () => {
    board.pitch = 30;

    expect(board.isStanding).toBe(true);
  });

  it('can be seen through when its opacity is turned down', () => {
    board.opacity = 0.25;

    expect(board.opacity).toBe(0.25);
  });

  it('holds to angles a board can actually be at', () => {
    expect(clampBoardPitch(-40)).toBe(0);
    expect(clampBoardPitch(400)).toBe(MAX_BOARD_PITCH);
    expect(clampBoardPitch(Number.NaN)).toBe(0);
    expect(clampBoardPitch(44.6)).toBe(45);
  });
});

describe('boardSurfaceOf()', () => {
  it('names the board a piece is standing on', () => {
    expect(boardSurfaceOf({ location: { surface: 'some-board' } })).toBe('some-board');
  });

  it('says nothing for a piece on the table itself', () => {
    expect(boardSurfaceOf({ location: {} })).toBe('');
    expect(boardSurfaceOf({ location: { surface: 'floor' } })).toBe('');
    expect(boardSurfaceOf({ location: { surface: 'north-wall' } })).toBe('');
  });

  it('leaves a piece on a board counted as being on the floor of the table', () => {
    expect(surfaceOf({ location: { surface: 'some-board' } })).toBe('floor');
  });
});

describe('setBoardHeightKeepingFoot()', () => {
  let board: WhiteBoard;

  beforeEach(() => {
    board = WhiteBoard.create('board', 6, 4, 1);
  });

  afterEach(() => {
    board.destroy();
  });

  it('leaves the foot where it was, however deep the board is made', () => {
    board.location = { name: 'table', x: 100, y: -350 };
    const foot = board.location.y + board.height * 50;

    setBoardHeightKeepingFoot(board, 10, 50);

    expect(board.height).toBe(10);
    expect(board.location.y + board.height * 50).toBe(foot);
  });

  it('walks the corner north as the board grows, rather than the foot south', () => {
    board.location = { name: 'table', x: 0, y: 0 };

    setBoardHeightKeepingFoot(board, board.height + 2, 50);

    expect(board.location.y).toBe(-100);
  });

  it('keeps whatever face the board was standing on', () => {
    board.location = { name: 'table', x: 0, y: 0, surface: 'north-wall' };

    setBoardHeightKeepingFoot(board, 8, 50);

    expect(board.location.surface).toBe('north-wall');
  });
});

describe('the pictures a board carries', () => {
  function boardWith(scene: unknown): WhiteBoard {
    const board = WhiteBoard.create('board', 6, 4, 1);
    board.scene = JSON.stringify(scene);
    return board;
  }

  it('names every picture stuck onto it, however deep in the drawing it sits', () => {
    const board = boardWith({
      layers: [
        { kind: 'image', items: [{ imageIdentifier: 'one' }, { imageIdentifier: 'two' }] },
        { kind: 'freehand', strokes: [] },
      ],
    });

    expect([...board.carriedImageIdentifiers].sort()).toEqual(['one', 'two']);
    board.destroy();
  });

  it('names a picture that a fill wears as a texture, not only one stuck on outright', () => {
    const board = boardWith({
      layers: [
        { kind: 'cell', cells: { '0,0': { type: 'texture', textureId: 'image:painted-ground' } } },
        { kind: 'shape', items: [{ fill: { type: 'texture', textureId: 'image:a-fill' } }] },
      ],
    });

    expect([...board.carriedImageIdentifiers].sort()).toEqual(['a-fill', 'painted-ground']);
    board.destroy();
  });

  it('passes over a texture that names one of the pictures it came with', () => {
    const board = boardWith({ layers: [{ kind: 'cell', cells: { '0,0': { type: 'texture', textureId: 'brick' } } }] });

    expect(board.carriedImageIdentifiers).toEqual([]);
    board.destroy();
  });

  it('names each picture once, however many times it was stuck on', () => {
    const board = boardWith({
      layers: [{ kind: 'image', items: [{ imageIdentifier: 'same' }, { imageIdentifier: 'same' }] }],
    });

    expect(board.carriedImageIdentifiers).toEqual(['same']);
    board.destroy();
  });

  it('names none for a board with nothing drawn on it', () => {
    const board = WhiteBoard.create('board', 6, 4, 1);

    expect(board.carriedImageIdentifiers).toEqual([]);
    board.destroy();
  });

  it('names none rather than throwing when the drawing cannot be read', () => {
    const board = WhiteBoard.create('board', 6, 4, 1);
    board.scene = 'not a drawing at all';

    expect(board.carriedImageIdentifiers).toEqual([]);
    board.destroy();
  });

  it('passes over a name that is not a name', () => {
    const board = boardWith({ layers: [{ kind: 'image', items: [{ imageIdentifier: '' }, { imageIdentifier: 7 }] }] });

    expect(board.carriedImageIdentifiers).toEqual([]);
    board.destroy();
  });
});
