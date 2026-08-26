import { ObjectStore } from '@axe/core/sync/object-store';
import { boardSurfaceOf, surfaceOf } from '@axe/domain/tabletop/tabletop-object';
import { clampBoardPitch, MAX_BOARD_PITCH, WhiteBoard } from '@axe/domain/tabletop/white-board';

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
