import { Signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ObjectStore } from '@axe/core/sync/object-store';
import { WhiteBoard } from '@axe/domain/tabletop/white-board';
import { MapScene, sceneHeightPx, sceneWidthPx, ShapeItem } from '@axe/features/map-editor/model/scene';
import { serializeScene } from '@axe/features/map-editor/model/serialize';
import { WhiteBoardEditorComponent } from '@axe/features/tabletop/white-board/white-board-editor.component';
import {
  BoardPoint,
  BoardTool,
  createBoardScene,
  freehandLayer,
  MarkRef,
  MarkStyle,
  penStroke,
  shapeBetween,
  shapeLayer,
  textLayer,
  wordsAt,
} from '@axe/features/tabletop/white-board/white-board-scene';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

interface EditorInternals {
  bindToBoard(board: WhiteBoard): void;
  onKeyDown(event: KeyboardEvent): void;
  onKeyUp(event: KeyboardEvent): void;
  undo(): void;
  touched(): void;
  hold(marks: MarkRef[]): void;
  ticks(axis: 'x' | 'y'): { at: number; px: number }[];
  redraw(): Promise<void>;
  scene: MapScene;
  tool: WritableSignal<BoardTool>;
  held: Signal<MarkRef[]>;
  laying: WritableSignal<BoardPoint[]>;
  panning: Signal<boolean>;
  zoom: WritableSignal<number>;
}

interface Call {
  method: string;
  args: unknown[];
}

const STYLE: MarkStyle = { color: '#123456', width: 3, fontSize: 24 };

function recordingContext(): { context: CanvasRenderingContext2D; calls: Call[]; count(method: string): number } {
  const calls: Call[] = [];
  const state: Record<string, unknown> = {
    globalAlpha: 1,
    fillStyle: '#000',
    strokeStyle: '#000',
    lineWidth: 1,
    lineJoin: 'miter',
    lineCap: 'butt',
    font: '10px sans-serif',
    textAlign: 'left',
    textBaseline: 'alphabetic',
  };
  const context = new Proxy(
    {},
    {
      get(_, prop: string) {
        if (prop === 'measureText') return (text: string) => ({ width: text.length * 10 });
        if (prop === 'createPattern' || prop === 'createLinearGradient' || prop === 'createRadialGradient') {
          return () => ({ addColorStop: () => undefined });
        }
        if (prop === 'getLineDash') return () => [];
        if (prop in state) return state[prop];
        return (...args: unknown[]) => {
          calls.push({ method: prop, args });
        };
      },
      set(_, prop: string, value: unknown) {
        state[prop] = value;
        calls.push({ method: `set ${prop}`, args: [value] });
        return true;
      },
    }
  ) as CanvasRenderingContext2D;
  return { context, calls, count: (method) => calls.filter((call) => call.method === method).length };
}

describe('WhiteBoardEditorComponent', () => {
  function board(cols: number, rows: number): WhiteBoard {
    const made = WhiteBoard.create('ホワイトボード', cols, rows, 1);
    made.scene = serializeScene(createBoardScene(cols, rows, 50));
    return made;
  }

  function mount(): {
    fixture: ComponentFixture<WhiteBoardEditorComponent>;
    editor: EditorInternals;
    board: WhiteBoard;
  } {
    TestBed.configureTestingModule({ imports: [WhiteBoardEditorComponent], providers: [...TEST_PROVIDERS] });
    const fixture = TestBed.createComponent(WhiteBoardEditorComponent);
    const editor = fixture.componentInstance as unknown as EditorInternals;
    const made = board(20, 15);
    editor.bindToBoard(made);
    return { fixture, editor, board: made };
  }

  function key(init: KeyboardEventInit & { key: string }): KeyboardEvent {
    return new KeyboardEvent('keydown', { cancelable: true, ...init });
  }

  function addRect(editor: EditorInternals, from: BoardPoint, to: BoardPoint): ShapeItem {
    const item = shapeBetween('rect', from, to, STYLE);
    shapeLayer(editor.scene).items.push(item);
    return item;
  }

  function shapes(editor: EditorInternals): ShapeItem[] {
    return shapeLayer(editor.scene).items;
  }

  afterEach(() => {
    ObjectStore.instance.getObjects().forEach((object) => ObjectStore.instance.delete(object, false));
    ObjectStore.instance.clearDeleteHistory();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('undoes back to the board as it was opened, not to a blank sheet', () => {
    const { editor } = mount();
    expect(sceneWidthPx(editor.scene)).toBe(1000);

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

  describe('keyboard', () => {
    it.each<[string, BoardTool]>([
      ['v', 'select'],
      ['p', 'pen'],
      ['m', 'marker'],
      ['e', 'eraser'],
      ['l', 'line'],
      ['a', 'arrow'],
      ['r', 'shape'],
      ['t', 'text'],
      ['n', 'note'],
    ])('picks the %s tool on %s', (pressed, tool) => {
      const { editor } = mount();
      editor.tool.set(pressed === 'p' ? 'select' : 'pen');
      const event = key({ key: pressed });

      editor.onKeyDown(event);

      expect(editor.tool()).toBe(tool);
      expect(event.defaultPrevented).toBe(true);
    });

    it('leaves the keys alone while something is being typed', () => {
      const { editor } = mount();
      const input = document.createElement('input');
      document.body.appendChild(input);
      const event = key({ key: 'v' });
      input.dispatchEvent(event);

      editor.onKeyDown(event);

      expect(editor.tool()).toBe('pen');
      input.remove();
    });

    it('undoes on ctrl+z and redoes on ctrl+y or ctrl+shift+z', () => {
      const { editor } = mount();
      freehandLayer(editor.scene).strokes.push(penStroke([0, 0, 10, 10], STYLE));
      editor.touched();

      editor.onKeyDown(key({ key: 'z', ctrlKey: true }));
      expect(editor.scene.layers).toHaveLength(0);

      editor.onKeyDown(key({ key: 'y', ctrlKey: true }));
      expect(editor.scene.layers).toHaveLength(1);

      editor.onKeyDown(key({ key: 'z', ctrlKey: true }));
      editor.onKeyDown(key({ key: 'z', ctrlKey: true, shiftKey: true }));
      expect(editor.scene.layers).toHaveLength(1);
    });

    it('removes what is held on delete', () => {
      const { editor } = mount();
      const rect = addRect(editor, { x: 10, y: 10 }, { x: 60, y: 40 });
      editor.hold([{ kind: 'shape', id: rect.id }]);

      editor.onKeyDown(key({ key: 'Delete' }));

      expect(shapes(editor)).toHaveLength(0);
      expect(editor.held()).toHaveLength(0);
    });

    it('holds every mark on ctrl+a', () => {
      const { editor } = mount();
      addRect(editor, { x: 10, y: 10 }, { x: 60, y: 40 });
      addRect(editor, { x: 100, y: 100 }, { x: 160, y: 140 });
      textLayer(editor.scene).items.push(wordsAt({ x: 200, y: 200 }, 'hello', STYLE));

      editor.onKeyDown(key({ key: 'a', ctrlKey: true }));

      expect(editor.held()).toHaveLength(3);
    });

    it('duplicates what is held on ctrl+d and takes hold of the copy', () => {
      const { editor } = mount();
      const rect = addRect(editor, { x: 10, y: 10 }, { x: 60, y: 40 });
      editor.hold([{ kind: 'shape', id: rect.id }]);

      editor.onKeyDown(key({ key: 'd', ctrlKey: true }));

      expect(shapes(editor)).toHaveLength(2);
      expect(editor.held()[0].id).not.toBe(rect.id);
      expect(shapes(editor)[1].points.slice(0, 2)).toEqual([26, 26]);
    });

    it('copies on ctrl+c and pastes on ctrl+v', () => {
      const { editor } = mount();
      const rect = addRect(editor, { x: 10, y: 10 }, { x: 60, y: 40 });
      editor.hold([{ kind: 'shape', id: rect.id }]);

      editor.onKeyDown(key({ key: 'c', ctrlKey: true }));
      editor.onKeyDown(key({ key: 'v', ctrlKey: true }));
      editor.onKeyDown(key({ key: 'v', ctrlKey: true }));

      expect(shapes(editor)).toHaveLength(3);
    });

    it('brings forward on ctrl+] and sends back on ctrl+[', () => {
      const { editor } = mount();
      const under = addRect(editor, { x: 10, y: 10 }, { x: 60, y: 40 });
      const over = addRect(editor, { x: 20, y: 20 }, { x: 70, y: 50 });
      editor.hold([{ kind: 'shape', id: under.id }]);

      editor.onKeyDown(key({ key: ']', ctrlKey: true }));
      expect(shapes(editor).map((item) => item.id)).toEqual([over.id, under.id]);

      editor.onKeyDown(key({ key: '[', ctrlKey: true }));
      expect(shapes(editor).map((item) => item.id)).toEqual([under.id, over.id]);
    });

    it('sets a path down on enter and throws it away on escape', () => {
      const { editor } = mount();
      editor.tool.set('path');
      editor.laying.set([
        { x: 0, y: 0 },
        { x: 50, y: 20 },
        { x: 80, y: 90 },
      ]);

      editor.onKeyDown(key({ key: 'Escape' }));
      expect(editor.laying()).toHaveLength(0);
      expect(shapes(editor)).toHaveLength(0);

      editor.laying.set([
        { x: 0, y: 0 },
        { x: 50, y: 20 },
      ]);
      editor.onKeyDown(key({ key: 'Enter' }));
      expect(shapes(editor)).toHaveLength(1);
      expect(editor.tool()).toBe('select');
      expect(editor.held()).toHaveLength(1);
    });

    it('pans only while the space bar is held', () => {
      const { editor } = mount();

      editor.onKeyDown(key({ key: ' ' }));
      expect(editor.panning()).toBe(true);

      editor.onKeyUp(new KeyboardEvent('keyup', { key: ' ' }));
      expect(editor.panning()).toBe(false);
    });

    it('zooms with ctrl and plus, minus and zero', () => {
      const { editor } = mount();

      editor.onKeyDown(key({ key: '=', ctrlKey: true }));
      expect(editor.zoom()).toBeCloseTo(1.15);

      editor.onKeyDown(key({ key: '-', ctrlKey: true }));
      expect(editor.zoom()).toBeCloseTo(1);

      editor.zoom.set(2);
      editor.onKeyDown(key({ key: '0', ctrlKey: true }));
      expect(editor.zoom()).toBe(1);
    });
  });

  describe('rulers', () => {
    it('writes a number every fifty pixels at full size', () => {
      const { editor } = mount();

      const marks = editor.ticks('x');

      expect(marks).toHaveLength(21);
      expect(marks[1]).toEqual({ at: 50, px: 50 });
      expect(marks.at(-1)).toEqual({ at: 1000, px: 1000 });
    });

    it('spaces the numbers out when the sheet is shrunk', () => {
      const { editor } = mount();
      editor.zoom.set(0.5);

      const marks = editor.ticks('y');

      expect(marks.map((mark) => mark.at)).toEqual([0, 100, 200, 300, 400, 500, 600, 700]);
      expect(marks[1].px).toBe(50);
    });

    it('keeps the fifty pixel step when the sheet is enlarged', () => {
      const { editor } = mount();
      editor.zoom.set(2);

      const marks = editor.ticks('x');

      expect(marks).toHaveLength(21);
      expect(marks[1]).toEqual({ at: 50, px: 100 });
    });
  });

  describe('saving', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it('writes the drawing down a breath after the last change', () => {
      const { fixture, editor, board } = mount();
      fixture.detectChanges();
      vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => callback(null));
      const before = board.scene;
      freehandLayer(editor.scene).strokes.push(penStroke([0, 0, 10, 10], STYLE));
      editor.touched();

      vi.advanceTimersByTime(599);
      expect(board.scene).toBe(before);

      vi.advanceTimersByTime(1);
      expect(board.scene).not.toBe(before);
      expect(board.scene).toContain('freehand');
    });

    it('writes it down at once when the editor is closed within that breath', () => {
      const { fixture, editor, board } = mount();
      fixture.detectChanges();
      const before = board.scene;
      freehandLayer(editor.scene).strokes.push(penStroke([0, 0, 10, 10], STYLE));
      editor.touched();

      fixture.destroy();

      expect(board.scene).not.toBe(before);
      expect(board.scene).toContain('freehand');
      const written = board.scene;
      vi.runAllTimers();
      expect(board.scene).toBe(written);
    });
  });

  describe('redraw', () => {
    it('paints the marks, the ruling and the hold onto a sheet of the board size', async () => {
      const recorder = recordingContext();
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
        () => recorder.context as unknown as RenderingContext
      );
      const { fixture, editor } = mount();
      fixture.detectChanges();
      freehandLayer(editor.scene).strokes.push(penStroke([0, 0, 10, 10, 20, 5], STYLE));
      const rect = addRect(editor, { x: 100, y: 100 }, { x: 160, y: 140 });
      textLayer(editor.scene).items.push(wordsAt({ x: 200, y: 200 }, 'hello', STYLE));
      editor.hold([{ kind: 'shape', id: rect.id }]);
      await fixture.whenStable();
      recorder.calls.length = 0;

      await editor.redraw();

      const canvas = fixture.nativeElement.querySelector('canvas') as HTMLCanvasElement;
      expect(canvas.width).toBe(1000);
      expect(canvas.height).toBe(750);
      expect(recorder.calls.filter((call) => call.method === 'fillText').map((call) => call.args[0])).toEqual([
        'hello',
      ]);
      expect(recorder.calls.some((call) => call.method === 'set strokeStyle' && call.args[0] === '#123456')).toBe(true);
      expect(recorder.calls.some((call) => call.method === 'setLineDash' && String(call.args[0]) === '4,3')).toBe(true);
      expect(recorder.calls.some((call) => call.method === 'strokeRect' && String(call.args) === '100,100,60,40')).toBe(
        true
      );
      expect(recorder.count('rect')).toBe(1);
      expect(recorder.count('lineTo')).toBe(4);
    });
  });
});
