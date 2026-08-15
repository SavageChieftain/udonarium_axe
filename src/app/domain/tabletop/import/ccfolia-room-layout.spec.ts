import {
  pieceUnitToTablePosition,
  resolveFieldSize,
  roomCellToTablePosition,
} from '@axe/domain/tabletop/import/ccfolia-room-layout';

const geometry = { fieldWidth: 20, fieldHeight: 10, gridSize: 50 };

describe('roomCellToTablePosition', () => {
  it('moves the origin from the centre of the board to the top left of the table', () => {
    expect(roomCellToTablePosition(0, 0, geometry)).toEqual({ x: 500, y: 250 });
  });

  it('maps a negative cell towards the top left', () => {
    expect(roomCellToTablePosition(-10, -5, geometry)).toEqual({ x: 0, y: 0 });
  });

  it('maps a positive one towards the bottom right', () => {
    expect(roomCellToTablePosition(4, 2, geometry)).toEqual({ x: 700, y: 350 });
  });

  it('leaves a point off the board outside the table', () => {
    expect(roomCellToTablePosition(-14, -9, geometry)).toEqual({ x: -200, y: -200 });
  });
});

describe('pieceUnitToTablePosition', () => {
  it('counts twenty-five units to a cell', () => {
    expect(pieceUnitToTablePosition(100, 50, geometry)).toEqual({ x: 700, y: 350 });
  });

  it('the origin is the centre of the board, as it is for the cells', () => {
    expect(pieceUnitToTablePosition(0, 0, geometry)).toEqual({ x: 500, y: 250 });
  });

  it('maps a point between cells without rounding it', () => {
    expect(pieceUnitToTablePosition(-291, 70, geometry)).toEqual({ x: -82, y: 390 });
  });
});

describe('resolveFieldSize', () => {
  it('returns the size of the board as it is', () => {
    expect(resolveFieldSize(67, 37)).toEqual({ width: 67, height: 37 });
  });

  it('fills a missing size in with the default', () => {
    expect(resolveFieldSize(0, 0)).toEqual({ width: 20, height: 20 });
  });
});
