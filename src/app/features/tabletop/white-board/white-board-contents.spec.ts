import { GameCharacter } from '@axe/domain/character/game-character';
import { WhiteBoard } from '@axe/domain/tabletop/white-board';
import {
  detachAllFrom,
  detachFromBoard,
  gatherOverBoard,
  standingOn,
} from '@axe/features/tabletop/white-board/white-board-contents';

describe('white board contents', () => {
  let board: WhiteBoard;

  function piece(x: number, y: number, surface?: string): GameCharacter {
    const character = GameCharacter.create('piece', 1, '');
    character.location = { name: 'table', x, y, surface };
    return character;
  }

  beforeEach(() => {
    board = WhiteBoard.create('board', 4, 3, 1);
    board.location = { name: 'table', x: 100, y: 200 };
  });

  afterEach(() => {
    board.destroy();
  });

  it('counts only what names the board as the face it stands on', () => {
    const mine = piece(10, 10, board.identifier);
    const theirs = piece(10, 10);
    const elsewhere = piece(10, 10, 'north-wall');

    expect(standingOn(board, [mine, theirs, elsewhere])).toEqual([mine]);
  });

  it('hands a piece back in the place it appeared to be, not the corner', () => {
    const held = piece(50, 40, board.identifier);

    detachFromBoard(board, held);

    expect(held.location.surface).toBeUndefined();
    expect(held.location.x).toBe(150);
    expect(held.location.y).toBe(240);
  });

  it('takes up what lies over the board, in the board own coordinates', () => {
    const over = piece(150, 240);
    const beside = piece(20, 20);

    expect(gatherOverBoard(board, 200, 150, [over, beside])).toBe(1);
    expect(over.location.surface).toBe(board.identifier);
    expect(over.location.x).toBe(50);
    expect(over.location.y).toBe(40);
    expect(beside.location.surface).toBeUndefined();
  });

  it('leaves alone what is already standing on some other board', () => {
    const other = piece(150, 240, 'another-board');

    expect(gatherOverBoard(board, 200, 150, [other])).toBe(0);
    expect(other.location.surface).toBe('another-board');
  });

  it('clears the board in one go', () => {
    const first = piece(10, 20, board.identifier);
    const second = piece(30, 40, board.identifier);

    detachAllFrom(board, [first, second]);

    expect(first.location.surface).toBeUndefined();
    expect(second.location.surface).toBeUndefined();
    expect(first.location.x).toBe(110);
    expect(second.location.y).toBe(240);
  });
});
