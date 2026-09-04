import { TestBed } from '@angular/core/testing';
import { MoveRangeService } from '@axe/application/tabletop/move-range.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { DataElement } from '@axe/domain/data/data-element';
import { cellIndexOf } from '@axe/domain/tabletop/fog/cell-grid';
import { GameTable } from '@axe/domain/tabletop/game-table';
import { countCells } from '@axe/domain/tabletop/move/reachable-cells';
import { DoorStyle, Terrain } from '@axe/domain/tabletop/terrain';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const GRID = 50;

describe('MoveRangeService', () => {
  let service: MoveRangeService;
  let table: GameTable;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...TEST_PROVIDERS] });
    table = new GameTable();
    table.width = 12;
    table.height = 12;
    table.gridSize = GRID;
    table.initialize();
    service = TestBed.inject(MoveRangeService);
  });

  afterEach(() => {
    for (const object of ObjectStore.instance.getObjects()) ObjectStore.instance.remove(object);
  });

  function pieceAt(col: number, row: number, walk: number | string | null): GameCharacter {
    const character = GameCharacter.create('コマ', 1, '');
    character.location = { name: 'table', x: col * GRID, y: row * GRID };
    const field = DataElement.findElementByReference(character.rootDataElement!, '移動')!;
    if (walk === null) field.destroy();
    else field.value = walk;
    return character;
  }

  function wallOver(col: number, fromRow: number, depthCells: number): Terrain {
    const terrain = Terrain.create('壁', 1, depthCells, 1, '', '');
    terrain.location = { name: 'table', x: col * GRID, y: fromRow * GRID };
    table.appendChild(terrain);
    return terrain;
  }

  it('shows what a piece can reach the moment it is picked up', () => {
    service.show(pieceAt(5, 5, 2));

    const view = service.range();
    expect(view).not.toBeNull();
    expect(countCells(view!.cells)).toBe(24);
    expect(view!.cells.get(cellIndexOf(view!.grid, 7, 5))).toBe(true);
  });

  it('shows nothing once it is put down', () => {
    service.show(pieceAt(5, 5, 2));
    service.hide();
    expect(service.range()).toBeNull();
  });

  it('shows nothing when the table has the range turned off', () => {
    table.moveRangeEnabled = false;
    service.show(pieceAt(5, 5, 2));
    expect(service.range()).toBeNull();
  });

  it('shows nothing for a piece whose sheet says nothing about walking', () => {
    service.show(pieceAt(5, 5, null));
    expect(service.range()).toBeNull();
  });

  it('shows nothing for a piece that could not take a step', () => {
    service.show(pieceAt(5, 5, 0));
    expect(service.range()).toBeNull();
  });

  it('walks round a wall rather than through it', () => {
    wallOver(6, 3, 4);

    service.show(pieceAt(5, 5, 3));

    const view = service.range()!;
    expect(view.cells.get(cellIndexOf(view.grid, 6, 5))).toBe(false);
    expect(view.cells.get(cellIndexOf(view.grid, 7, 5))).toBe(false);
    expect(view.cells.get(cellIndexOf(view.grid, 5, 2))).toBe(true);
  });

  it('walks through a door somebody has opened', () => {
    const door = wallOver(6, 3, 4);
    door.doorStyle = DoorStyle.SWING;
    door.isDoorOpen = true;

    service.show(pieceAt(5, 5, 3));

    const view = service.range()!;
    expect(view.cells.get(cellIndexOf(view.grid, 7, 5))).toBe(true);
  });

  it('counts a wall that lets sight past as a wall all the same', () => {
    const glass = wallOver(6, 3, 4);
    glass.blocksSight = false;

    service.show(pieceAt(5, 5, 3));

    expect(service.range()!.cells.get(cellIndexOf(service.range()!.grid, 7, 5))).toBe(false);
  });

  it('turns a sheet written in feet into cells', () => {
    table.cellDistance = 5;
    service.show(pieceAt(5, 5, 10));

    expect(countCells(service.range()!.cells)).toBe(24);
  });
});
