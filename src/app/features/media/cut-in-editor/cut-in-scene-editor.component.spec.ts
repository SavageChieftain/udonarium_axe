import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ObjectStore } from '@axe/core/sync/object-store';
import { CutIn } from '@axe/domain/media/cut-in';
import { CutInLayer } from '@axe/domain/media/cut-in-layer';
import { CutInSceneEditorComponent } from '@axe/features/media/cut-in-editor/cut-in-scene-editor.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('CutInSceneEditorComponent', () => {
  let fixture: ComponentFixture<CutInSceneEditorComponent>;
  let component: CutInSceneEditorComponent;
  let store: ObjectStore;
  let cutIn: CutIn;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [CutInSceneEditorComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    store = ObjectStore.instance;
    store.getObjects().forEach((object) => store.delete(object, false));
    store.clearDeleteHistory();

    cutIn = new CutIn();
    cutIn.initialize();
    cutIn.width = 640;
    cutIn.height = 360;

    fixture = TestBed.createComponent(CutInSceneEditorComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('cutIn', cutIn);
    fixture.componentRef.setInput('isEditable', true);
    fixture.detectChanges();
  });

  afterEach(() => {
    store.getObjects().forEach((object) => store.delete(object, false));
    store.clearDeleteHistory();
  });

  type EditorApi = {
    addImageLayer(): void;
    addTextLayer(): void;
    addFillLayer(): void;
    duplicateSelected(): void;
    removeSelected(): void;
    onToggleHidden(layer: CutInLayer): void;
    onReorder(dropped: { held: CutInLayer; over: CutInLayer; side: 'before' | 'after' | null }): void;
    onPointerDown(event: PointerEvent): void;
    onPointerMove(event: PointerEvent): void;
    onPointerUp(event: PointerEvent): void;
    onKeyDown(event: KeyboardEvent): void;
    onMoveSound(moved: { fromMs: number; toMs: number }): void;
    onRemoveSound(removed: { ms: number }): void;
    undo(): void;
    redo(): void;
    canUndo(): boolean;
    canRedo(): boolean;
    changed(): void;
    selectedIdentifier: { set(value: string): void };
  };

  function editor(): EditorApi {
    return component as unknown as EditorApi;
  }

  function pointer(type: string, x: number, y: number): PointerEvent {
    return { type, clientX: x, clientY: y, shiftKey: false, pointerId: 1, target: null } as unknown as PointerEvent;
  }

  function drag(from: [number, number], to: [number, number]): void {
    editor().onPointerDown(pointer('pointerdown', from[0], from[1]));
    editor().onPointerMove(pointer('pointermove', to[0], to[1]));
    editor().onPointerUp(pointer('pointerup', to[0], to[1]));
  }

  it('starts with no scene at all', () => {
    expect(component.scene()).toBeNull();
    expect(component.layers()).toEqual([]);
  });

  it('makes a scene the first time a layer is added', () => {
    editor().addImageLayer();

    expect(component.scene()).not.toBeNull();
    expect(component.layers()).toHaveLength(1);
    expect(cutIn.isComposed).toBe(true);
  });

  it('stops the cut-in following the size of one picture', () => {
    cutIn.originalSize = true;

    editor().addImageLayer();

    expect(cutIn.originalSize).toBe(false);
  });

  it('lays each new layer in the middle of the cut-in', () => {
    editor().addImageLayer();

    const layer = component.layers()[0];
    expect(layer.x + layer.width / 2).toBe(320);
    expect(layer.y + layer.height / 2).toBe(180);
  });

  it('lays down words and bands as well as pictures', () => {
    editor().addTextLayer();
    editor().addFillLayer();

    expect(component.layers().map((layer) => layer.kind)).toEqual(['text', 'fill']);
  });

  it('gives a new text layer something to say', () => {
    editor().addTextLayer();

    expect(component.layers()[0].text.length).toBeGreaterThan(0);
  });

  it('runs a band across the whole width', () => {
    editor().addFillLayer();

    expect(component.layers()[0].width).toBe(640);
  });

  it('selects what it just added', () => {
    editor().addImageLayer();

    expect(component.selected()).toBe(component.layers()[0]);
  });

  it('duplicates the selected layer and selects the copy', () => {
    editor().addImageLayer();
    const first = component.selected()!;

    editor().duplicateSelected();

    expect(component.layers()).toHaveLength(2);
    expect(component.selected()).not.toBe(first);
  });

  it('deletes the selected layer and selects nothing', () => {
    editor().addImageLayer();

    editor().removeSelected();

    expect(component.layers()).toEqual([]);
    expect(component.selected()).toBeNull();
  });

  it('turns a layer off and on again', () => {
    editor().addImageLayer();
    const layer = component.layers()[0];

    editor().onToggleHidden(layer);
    expect(layer.hidden).toBe(true);

    editor().onToggleHidden(layer);
    expect(layer.hidden).toBe(false);
  });

  it('moves a layer up the stack', () => {
    editor().addImageLayer();
    editor().addImageLayer();
    const [first, second] = component.layers();

    editor().onReorder({ held: first, over: second, side: 'after' });

    expect(component.layers()).toEqual([second, first]);
  });

  describe('dragging on the stage', () => {
    it('picks up the layer under the pointer', () => {
      editor().addImageLayer();
      const layer = component.layers()[0];
      editor().selectedIdentifier.set('');

      editor().onPointerDown(pointer('pointerdown', layer.x + 10, layer.y + 10));

      expect(component.selected()).toBe(layer);
    });

    it('lets go of the selection on empty stage', () => {
      editor().addImageLayer();

      editor().onPointerDown(pointer('pointerdown', 5, 5));

      expect(component.selected()).toBeNull();
    });

    it('moves the layer by as far as the pointer went', () => {
      editor().addImageLayer();
      const layer = component.layers()[0];
      const from = { x: layer.x, y: layer.y };

      drag([layer.x + 10, layer.y + 10], [layer.x + 40, layer.y + 30]);

      expect(layer.x).toBe(from.x + 30);
      expect(layer.y).toBe(from.y + 20);
    });

    it('resizes from a corner, leaving the far one where it was', () => {
      editor().addImageLayer();
      const layer = component.layers()[0];
      const right = layer.x + layer.width;

      drag([layer.x, layer.y], [layer.x + 20, layer.y + 10]);

      expect(layer.x).toBe(right - layer.width);
      expect(layer.width).toBeLessThan(320);
    });

    it('turns the layer by the grip above it', () => {
      editor().addImageLayer();
      const layer = component.layers()[0];
      const box = { x: layer.x, y: layer.y, width: layer.width, height: layer.height };

      // From straight above the middle round to the right of it: a quarter turn.
      drag([box.x + box.width / 2, box.y - 22], [box.x + box.width + 200, box.y + box.height / 2]);

      expect(layer.rotation).toBeGreaterThan(60);
      expect(layer.rotation).toBeLessThan(120);
      expect(layer.x).toBe(box.x);
    });

    it('can be turned again after being let go of', () => {
      editor().addImageLayer();
      const layer = component.layers()[0];
      const box = { x: layer.x, y: layer.y, width: layer.width, height: layer.height };
      const pivot = { x: box.x + box.width / 2, y: box.y + box.height / 2 };

      // A quarter turn, released, and then the grip taken hold of where it now is.
      drag([pivot.x, box.y - 22], [pivot.x + 200, pivot.y]);
      const afterFirst = layer.rotation;
      expect(afterFirst).toBeGreaterThan(60);

      // A quarter turn swings the grip from above the box round to the right of the pivot.
      drag([pivot.x + box.height / 2 + 22, pivot.y], [pivot.x, pivot.y + 200]);

      expect(layer.rotation).toBeGreaterThan(afterFirst + 30);
    });

    it('picks a turned layer up by the body it is drawn with', () => {
      editor().addImageLayer();
      const layer = component.layers()[0];
      layer.rotation = 90;
      layer.width = 200;
      layer.height = 100;
      layer.x = 100;
      layer.y = 100;
      editor().selectedIdentifier.set('');

      // Turned a quarter, the box covers where its top-left corner is drawn.
      editor().onPointerDown(pointer('pointerdown', 200, 80));

      expect(component.selected()).toBe(layer);
    });

    it('writes a drag onto the key standing at the scrubber', () => {
      editor().addImageLayer();
      const layer = component.layers()[0];
      const from = layer.x;
      layer.tracks = '{"x":[{"t":0,"v":' + from + '},{"t":1000,"v":' + from + '}]}';

      drag([layer.x + 10, layer.y + 10], [layer.x + 50, layer.y + 10]);

      expect(layer.x).toBe(from);
      expect(layer.trackSet.x?.[0].v).toBe(from + 40);
    });

    it('leaves a locked layer alone', () => {
      editor().addImageLayer();
      const layer = component.layers()[0];
      layer.locked = true;
      const from = { x: layer.x, y: layer.y };

      drag([layer.x + 10, layer.y + 10], [layer.x + 40, layer.y + 30]);

      expect(layer.x).toBe(from.x);
      expect(layer.y).toBe(from.y);
    });

    it('changes nothing for a reader', () => {
      editor().addImageLayer();
      const layer = component.layers()[0];
      fixture.componentRef.setInput('isEditable', false);
      fixture.detectChanges();
      const from = { x: layer.x, y: layer.y };

      drag([layer.x + 10, layer.y + 10], [layer.x + 40, layer.y + 30]);

      expect(layer.x).toBe(from.x);
      expect(layer.y).toBe(from.y);
    });
  });

  describe('taking a change back', () => {
    function key(name: string, chord = true, shift = false): KeyboardEvent {
      return {
        key: name,
        ctrlKey: chord,
        metaKey: false,
        shiftKey: shift,
        target: document.createElement('div'),
        preventDefault: () => {},
      } as unknown as KeyboardEvent;
    }

    it('has nothing to take back to begin with', () => {
      expect(editor().canUndo()).toBe(false);
      expect(editor().canRedo()).toBe(false);
    });

    it('takes an added layer away again', () => {
      editor().addImageLayer();
      expect(editor().canUndo()).toBe(true);

      editor().undo();

      expect(component.layers()).toEqual([]);
    });

    it('puts it back', () => {
      editor().addImageLayer();
      editor().undo();

      editor().redo();

      expect(component.layers()).toHaveLength(1);
    });

    it('takes a whole drag back in one step', () => {
      editor().addImageLayer();
      const layer = component.layers()[0];
      const from = { x: layer.x, y: layer.y };
      drag([layer.x + 10, layer.y + 10], [layer.x + 60, layer.y + 40]);

      editor().undo();

      expect(component.layers()[0].x).toBe(from.x);
      expect(component.layers()[0].y).toBe(from.y);
    });

    it('takes a deleted layer back, keeping what it was called', () => {
      editor().addImageLayer();
      component.layers()[0].name = '立ち絵';
      // The properties panel commits after every write; this stands in for that.
      editor().changed();
      editor().removeSelected();

      editor().undo();

      expect(component.layers()).toHaveLength(1);
      expect(component.layers()[0].name).toBe('立ち絵');
    });

    it('lets go of a selection that was taken away', () => {
      editor().addImageLayer();
      editor().undo();

      expect(component.selected()).toBeNull();
    });

    it('listens for the keys', () => {
      editor().addImageLayer();

      editor().onKeyDown(key('z'));
      expect(component.layers()).toEqual([]);

      editor().onKeyDown(key('z', true, true));
      expect(component.layers()).toHaveLength(1);
    });

    it('changes nothing for a reader', () => {
      editor().addImageLayer();
      fixture.componentRef.setInput('isEditable', false);
      fixture.detectChanges();

      editor().undo();

      expect(component.layers()).toHaveLength(1);
    });
  });

  describe('the sounds a scene drops', () => {
    it('has none to begin with', () => {
      editor().addImageLayer();

      expect(component.sounds()).toEqual([]);
    });

    it('slides one along the clock', () => {
      editor().addImageLayer();
      component.scene()!.sounds = '[{"t":200,"a":"se-1","v":100}]';

      editor().onMoveSound({ fromMs: 200, toMs: 900 });

      expect(component.sounds().map((sound) => sound.t)).toEqual([900]);
    });

    it('takes one away', () => {
      editor().addImageLayer();
      component.scene()!.sounds = '[{"t":200,"a":"se-1","v":100}]';

      editor().onRemoveSound({ ms: 200 });

      expect(component.sounds()).toEqual([]);
    });

    it('changes nothing for a reader', () => {
      editor().addImageLayer();
      component.scene()!.sounds = '[{"t":200,"a":"se-1","v":100}]';
      fixture.componentRef.setInput('isEditable', false);
      fixture.detectChanges();

      editor().onRemoveSound({ ms: 200 });

      expect(component.sounds()).toHaveLength(1);
    });
  });
});
