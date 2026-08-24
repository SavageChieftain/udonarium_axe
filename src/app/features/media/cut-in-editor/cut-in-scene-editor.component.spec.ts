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
    duplicateSelected(): void;
    removeSelected(): void;
    onToggleHidden(layer: CutInLayer): void;
    onReorder(dropped: { held: CutInLayer; over: CutInLayer; side: 'before' | 'after' | null }): void;
    onPointerDown(event: PointerEvent): void;
    onPointerMove(event: PointerEvent): void;
    onPointerUp(event: PointerEvent): void;
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
});
