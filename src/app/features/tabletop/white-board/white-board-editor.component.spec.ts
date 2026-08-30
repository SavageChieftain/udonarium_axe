import { TestBed } from '@angular/core/testing';
import { ObjectStore } from '@axe/core/sync/object-store';
import { WhiteBoard } from '@axe/domain/tabletop/white-board';
import { sceneHeightPx, sceneWidthPx } from '@axe/features/map-editor/model/scene';
import { serializeScene } from '@axe/features/map-editor/model/serialize';
import { WhiteBoardEditorComponent } from '@axe/features/tabletop/white-board/white-board-editor.component';
import { createBoardScene } from '@axe/features/tabletop/white-board/white-board-scene';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('WhiteBoardEditorComponent', () => {
  function board(cols: number, rows: number): WhiteBoard {
    const made = WhiteBoard.create('ホワイトボード', cols, rows, 1);
    made.scene = serializeScene(createBoardScene(cols, rows, 50));
    return made;
  }

  afterEach(() => {
    ObjectStore.instance.getObjects().forEach((object) => ObjectStore.instance.delete(object, false));
    ObjectStore.instance.clearDeleteHistory();
  });

  it('undoes back to the board as it was opened, not to a blank sheet', () => {
    TestBed.configureTestingModule({ imports: [WhiteBoardEditorComponent], providers: [...TEST_PROVIDERS] });
    const fixture = TestBed.createComponent(WhiteBoardEditorComponent);
    const editor = fixture.componentInstance as unknown as {
      bindToBoard(board: WhiteBoard): void;
      undo(): void;
      scene: ReturnType<typeof createBoardScene>;
      touched(): void;
    };

    editor.bindToBoard(board(20, 15));
    expect(sceneWidthPx(editor.scene)).toBe(1000);

    // Something drawn, then taken back again.
    editor.scene.layers.push({
      id: 'freehand-0',
      kind: 'freehand',
      name: 'freehand',
      visible: true,
      locked: false,
      opacity: 1,
      strokes: [{ id: 'stroke-0', points: [0, 0, 10, 10], color: '#000000', width: 2 }],
    });
    editor.touched();

    editor.undo();

    expect(sceneWidthPx(editor.scene)).toBe(1000);
    expect(sceneHeightPx(editor.scene)).toBe(750);
    expect(editor.scene.layers).toHaveLength(0);
  });
});
