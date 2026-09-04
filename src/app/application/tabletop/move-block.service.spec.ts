import { TestBed } from '@angular/core/testing';
import { MoveBlockService } from '@axe/application/tabletop/move-block.service';
import { MoveRangeService } from '@axe/application/tabletop/move-range.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { DataElement } from '@axe/domain/data/data-element';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { PeerRole } from '@axe/domain/peer/peer-role';
import { cellGridOf, cellIndexOf } from '@axe/domain/tabletop/fog/cell-grid';
import { GameTable, GridType } from '@axe/domain/tabletop/game-table';
import { moveBlockMapOn } from '@axe/domain/tabletop/move/move-block-map';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const GRID = 50;

describe('MoveBlockService', () => {
  let service: MoveBlockService;
  let table: GameTable;

  const grid = () => cellGridOf(table.width, table.height, table.gridSize, table.gridType);

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...TEST_PROVIDERS] });
    table = new GameTable();
    table.width = 12;
    table.height = 12;
    table.gridSize = GRID;
    table.initialize();
    service = TestBed.inject(MoveBlockService);
    PeerCursor.createMyCursor();
    PeerCursor.myCursor.role = PeerRole.GameMaster;
  });

  afterEach(() => {
    service.stopPainting();
    for (const object of ObjectStore.instance.getObjects()) ObjectStore.instance.remove(object);
    PeerCursor.myCursor = null!;
  });

  function paint(col: number, row: number): void {
    service.paintAt(grid(), cellIndexOf(grid(), col, row));
    service.endStroke();
  }

  it('writes a painted cell onto the table', () => {
    service.startPainting();

    paint(4, 4);

    expect(
      moveBlockMapOn(table)!
        .read(grid())
        .get(cellIndexOf(grid(), 4, 4))
    ).toBe(true);
  });

  it('lets nobody but the game master paint', () => {
    PeerCursor.myCursor.role = PeerRole.Player;

    service.startPainting();
    paint(4, 4);

    expect(service.isPainting()).toBe(false);
    expect(moveBlockMapOn(table)).toBeNull();
  });

  it('paints nothing until the brush is taken up', () => {
    paint(4, 4);
    expect(moveBlockMapOn(table)).toBeNull();
  });

  it('rubs a cell out again with the eraser', () => {
    service.startPainting();
    paint(4, 4);

    service.setBrush('erase');
    paint(4, 4);

    expect(
      moveBlockMapOn(table)!
        .read(grid())
        .get(cellIndexOf(grid(), 4, 4))
    ).toBe(false);
  });

  it('wipes the whole map', () => {
    service.startPainting();
    paint(4, 4);
    paint(5, 4);

    service.clearAll();

    expect(moveBlockMapOn(table)!.read(grid()).isEmpty).toBe(true);
  });

  it('starts the map over when the grid under it changes', () => {
    service.startPainting();
    paint(4, 4);

    table.gridType = GridType.HEX_VERTICAL;

    expect(service.blockedOn(grid())!.isEmpty).toBe(true);
  });
});

describe('a reach that runs into painted ground', () => {
  let moveBlock: MoveBlockService;
  let moveRange: MoveRangeService;
  let table: GameTable;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...TEST_PROVIDERS] });
    table = new GameTable();
    table.width = 12;
    table.height = 12;
    table.gridSize = GRID;
    table.initialize();
    moveBlock = TestBed.inject(MoveBlockService);
    moveRange = TestBed.inject(MoveRangeService);
    PeerCursor.createMyCursor();
    PeerCursor.myCursor.role = PeerRole.GameMaster;
  });

  afterEach(() => {
    moveBlock.stopPainting();
    for (const object of ObjectStore.instance.getObjects()) ObjectStore.instance.remove(object);
    PeerCursor.myCursor = null!;
  });

  it('stops where the game master painted', () => {
    const grid = cellGridOf(table.width, table.height, table.gridSize, table.gridType);
    moveBlock.startPainting();
    for (let row = 3; row <= 7; row++) moveBlock.paintAt(grid, cellIndexOf(grid, 6, row));
    moveBlock.endStroke();

    const character = GameCharacter.create('コマ', 1, '');
    character.location = { name: 'table', x: 5 * GRID, y: 5 * GRID };
    DataElement.findElementByReference(character.rootDataElement!, '移動')!.value = 3;
    moveRange.show(character);

    const view = moveRange.range()!;
    expect(view.cells.get(cellIndexOf(view.grid, 6, 5))).toBe(false);
    expect(view.cells.get(cellIndexOf(view.grid, 7, 5))).toBe(false);
    expect(view.cells.get(cellIndexOf(view.grid, 5, 2))).toBe(true);
  });
});
