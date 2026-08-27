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
