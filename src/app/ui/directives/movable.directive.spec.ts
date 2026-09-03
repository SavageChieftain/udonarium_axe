import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';
import { MovableDirective } from '@axe/ui/directives/movable.directive';

@Component({
  selector: 'test-host',
  template: `<div appMovable [movable.option]="movableOption"></div>`,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [MovableDirective],
})
class TestHostComponent {
  movableOption = {};
}

describe('MovableDirective', () => {
  it('should be defined', () => {
    expect(MovableDirective).toBeDefined();
  });

  describe('with no tabletop object set', () => {
    let fixture: ComponentFixture<TestHostComponent>;

    beforeEach(async () => {
      TestBed.configureTestingModule({
        imports: [TestHostComponent],
        providers: [...TEST_PROVIDERS],
      }).compileComponents();
    });

    beforeEach(() => {
      fixture = TestBed.createComponent(TestHostComponent);
    });

    it('builds without a tabletop object', () => {
      expect(() => fixture.detectChanges()).not.toThrow();
    });

    it('says which piece is moving only while it moves', () => {
      fixture.detectChanges();
      const element = fixture.debugElement.children[0].nativeElement as HTMLElement;
      const directive = fixture.debugElement.children[0].injector.get(MovableDirective);

      expect(element.style.willChange).toBe('');

      directive['promoteWhileMoving'](true);
      expect(element.style.willChange).toBe('transform');

      directive.cancel();
      expect(element.style.willChange).toBe('');
    });

    it('sets a position with no tabletop object', () => {
      fixture.detectChanges();
      const directive = fixture.debugElement.children[0].injector.get(MovableDirective);
      expect(() => directive['setPosition'](null as unknown as TabletopObject)).not.toThrow();
    });

    it('sets a position for an object with no location', () => {
      fixture.detectChanges();
      const directive = fixture.debugElement.children[0].injector.get(MovableDirective);
      expect(() => directive['setPosition']({} as unknown as TabletopObject)).not.toThrow();
    });

    it('does not transition without a tabletop object', () => {
      fixture.detectChanges();
      const directive = fixture.debugElement.children[0].injector.get(MovableDirective);
      expect(directive['shouldTransition'](null as unknown as TabletopObject)).toBe(false);
    });

    it('does not transition for an object with no location', () => {
      fixture.detectChanges();
      const directive = fixture.debugElement.children[0].injector.get(MovableDirective);
      expect(directive['shouldTransition']({} as unknown as TabletopObject)).toBe(false);
    });
  });

  describe('what is stuck to a board', () => {
    let fixture: ComponentFixture<TestHostComponent>;

    beforeEach(async () => {
      TestBed.configureTestingModule({
        imports: [TestHostComponent],
        providers: [...TEST_PROVIDERS],
      }).compileComponents();
      fixture = TestBed.createComponent(TestHostComponent);
      fixture.detectChanges();
    });

    function directiveFor(surface: string | undefined): MovableDirective {
      const directive = fixture.debugElement.children[0].injector.get(MovableDirective);
      directive['tabletopObject'] = { location: { name: 'table', x: 0, y: 0, surface } } as TabletopObject;
      return directive;
    }

    it('keeps the spot it was put on, rather than jumping to a line of the table', () => {
      // A board is not ruled into squares, so what is stuck to one is not snapped to them.
      expect(directiveFor('some-board-identifier').isGridSnap).toBe(false);
    });

    it('still snaps on the table itself, and on a wall of it', () => {
      expect(directiveFor(undefined).isGridSnap).toBe(true);
      expect(directiveFor('north-wall').isGridSnap).toBe(true);
    });
  });
});

describe('MovableDirective drop preview', () => {
  interface Internals {
    input: {
      isDragging: boolean;
      pointer: { x: number; y: number; z: number };
      cancel(): void;
      destroy(): void;
    } | null;
    onInputMoveNow(e: MouseEvent): void;
    surfaceUnderPointer(): HTMLElement | null;
    surfaceElement(): HTMLElement;
    clearDragPreview(): void;
    updateDragPreview(surface: HTMLElement | null): void;
  }

  @Component({
    selector: 'preview-host',
    template: `<div appMovable [movable.option]="{}"></div>`,
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MovableDirective],
  })
  class PreviewHostComponent {}

  function mount(isDragging: boolean): Internals {
    TestBed.configureTestingModule({ imports: [PreviewHostComponent], providers: [...TEST_PROVIDERS] });
    const fixture = TestBed.createComponent(PreviewHostComponent);
    fixture.detectChanges();
    const directive = fixture.debugElement
      .query((node) => node.name === 'div')
      .injector.get(MovableDirective) as unknown as Internals;
    directive.input = {
      isDragging,
      pointer: { x: 0, y: 0, z: 0 },
      cancel: () => undefined,
      destroy: () => undefined,
    };
    return directive;
  }

  it('looks for the face under the pointer once per move', () => {
    const directive = mount(true);
    const own = directive.surfaceElement();
    const look = vi.spyOn(directive, 'surfaceUnderPointer').mockReturnValue(own);
    const preview = vi.spyOn(directive, 'updateDragPreview').mockImplementation(() => undefined);

    directive.onInputMoveNow(new MouseEvent('mousemove'));

    expect(look).toHaveBeenCalledTimes(1);
    expect(preview.mock.calls[0][0]).toBe(own);
  });

  it('is given nothing to draw on the move that grabs, since nothing is being dragged yet', () => {
    // The input handler sets isDragging after the move callback returns, so the first move
    // always runs with it unset, and the preview clears itself whatever face it is handed.
    const directive = mount(false);
    const own = directive.surfaceElement();
    vi.spyOn(directive, 'surfaceUnderPointer').mockReturnValue(own);
    const clear = vi.spyOn(directive, 'clearDragPreview').mockImplementation(() => undefined);

    directive.onInputMoveNow(new MouseEvent('mousemove'));

    expect(clear).toHaveBeenCalled();
  });
});
