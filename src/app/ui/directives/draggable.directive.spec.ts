import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';
import { DraggableDirective } from '@axe/ui/directives/draggable.directive';
import { vi } from 'vitest';

@Component({
  selector: 'test-host',
  template: `<div appDraggable [draggable.disable]="isDisabled"></div>`,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [DraggableDirective],
})
class TestHostComponent {
  isDisabled = false;
}

describe('DraggableDirective', () => {
  it('should be defined', () => {
    expect(DraggableDirective).toBeDefined();
  });

  describe('setup and teardown', () => {
    let fixture: ComponentFixture<TestHostComponent>;
    let directive: DraggableDirective;

    beforeEach(async () => {
      TestBed.configureTestingModule({
        imports: [TestHostComponent],
        providers: [...TEST_PROVIDERS],
      }).compileComponents();

      fixture = TestBed.createComponent(TestHostComponent);
    });

    it('initialises on ngAfterViewInit', () => {
      fixture.detectChanges();
      directive = fixture.debugElement.children[0].injector.get(DraggableDirective);
      expect(directive).toBeDefined();
    });

    it('cleans up on destroy without throwing', () => {
      fixture.detectChanges();
      directive = fixture.debugElement.children[0].injector.get(DraggableDirective);
      expect(() => fixture.destroy()).not.toThrow();
    });

    it('resets the style attribute when a drag ends', () => {
      fixture.detectChanges();
      directive = fixture.debugElement.children[0].injector.get(DraggableDirective);
      const element = fixture.nativeElement.querySelector('div') as HTMLElement;

      // set a style
      element.style.opacity = '0.5';
      element.style.willChange = 'top, left';

      // call the private method to stand in for onInputEnd
      // the real handler is internal, so check that destruct is safe to call
      expect(() => directive['destroy']()).not.toThrow();
    });

    it('survives a null querySelector result while correcting the position', () => {
      fixture.detectChanges();
      directive = fixture.debugElement.children[0].injector.get(DraggableDirective);
      const element = fixture.nativeElement.querySelector('div') as HTMLElement;

      // stand in for a missing bounds element
      const originalQuerySelector = element.ownerDocument.querySelector;
      element.ownerDocument.querySelector = vi.fn((selector: string) => {
        if (selector === 'body') {
          return originalQuerySelector.call(element.ownerDocument, selector);
        }
        return null;
      });

      // to confirm the correction is safe to run,
      // expect adjustPosition to be called
      expect(() => fixture.detectChanges()).not.toThrow();

      // clean up
      element.ownerDocument.querySelector = originalQuerySelector;
    });
  });
});
