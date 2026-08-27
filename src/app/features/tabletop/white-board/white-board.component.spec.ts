import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { GameTable } from '@axe/domain/tabletop/game-table';
import { TableSelecter } from '@axe/domain/tabletop/table-selecter';
import { Terrain } from '@axe/domain/tabletop/terrain';
import { WhiteBoard } from '@axe/domain/tabletop/white-board';
import { WhiteBoardComponent } from '@axe/features/tabletop/white-board/white-board.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('WhiteBoardComponent', () => {
  let fixture: ComponentFixture<WhiteBoardComponent>;
  let component: WhiteBoardComponent;
  let table: GameTable;
  let board: WhiteBoard;

  function place(x: number, y: number, surface?: string): GameCharacter {
    const piece = GameCharacter.create('piece', 1, '');
    piece.location = surface ? { name: 'table', x, y, surface } : { name: 'table', x, y };
    return piece;
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [WhiteBoardComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();

    table = new GameTable();
    table.initialize();
    TableSelecter.instance.viewTableIdentifier = table.identifier;

    board = WhiteBoard.create('board', 6, 4, 1);
    board.location = { name: 'table', x: 100, y: 200 };
    table.appendChild(board);

    fixture = TestBed.createComponent(WhiteBoardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('whiteBoard', board);
  });

  afterEach(() => {
    for (const object of ObjectStore.instance.getObjects()) ObjectStore.instance.remove(object);
  });

  it('is the size it was given, in pixels', () => {
    expect(component.widthPx()).toBe(6 * 50);
    expect(component.heightPx()).toBe(4 * 50);
  });

  it('lies flat until it is tilted, and hinges rather than sinking', async () => {
    expect(component.pitchTransform()).toBe('rotateX(0deg)');

    board.pitch = 90;
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(component.pitchTransform()).toBe('rotateX(-90deg)');
  });

  it('takes the turn it was dragged to, so the board keeps facing where it was left', () => {
    component.onRotated(30);

    expect(board.rotate).toBe(30);
  });

  it('shows only what names it as the face it stands on', () => {
    const mine = place(10, 10, board.identifier);
    const theirs = place(10, 10);

    expect(component.characters().map((piece) => piece.identifier)).toEqual([mine.identifier]);
    expect(component.standingCount()).toBe(1);
    expect(theirs.location.surface).toBeUndefined();
  });

  it('puts everything back where it appeared to be when the board is cleared', () => {
    const piece = place(50, 40, board.identifier);

    component.detachAll(board);

    expect(piece.location.surface).toBeUndefined();
    expect(piece.location.x).toBe(150);
    expect(piece.location.y).toBe(240);
  });

  it('lets a piece hang over the edge', () => {
    const piece = place(10, 10, board.identifier);
    piece.location = { name: 'table', x: -40, y: 260, surface: board.identifier };

    expect(component.characters().map((entry) => entry.identifier)).toContain(piece.identifier);
  });

  it('holds terrain as well as pieces', () => {
    const terrain = Terrain.create('rock', 1, 1, 1, '', '');
    terrain.location = { name: 'table', x: 0, y: 0, surface: board.identifier };
    table.appendChild(terrain);

    expect(component.terrains().map((entry) => entry.identifier)).toEqual([terrain.identifier]);
  });

  it('fades only the face, so what is drawn on the board floats over it', () => {
    board.opacity = 0.2;
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const faded = host.querySelectorAll<HTMLElement>('[style*="opacity"]');

    // The face may be faded to nothing; a plan drawn on it still reads at its own weight.
    expect(faded.length).toBeGreaterThan(0);
    for (const element of faded) {
      expect(element.style.backgroundImage).toBe('');
    }
  });
});
