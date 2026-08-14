import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';
import { RotableDirective } from '@axe/ui/directives/rotable.directive';
import { vi } from 'vitest';

@Component({
  selector: 'test-host',
  template: `<div appRotable [rotable.option]="rotableOption"></div>`,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [RotableDirective],
})
class TestHostComponent {
  rotableOption = {};
}

describe('RotableDirective', () => {
  it('should be defined', () => {
    expect(RotableDirective).toBeDefined();
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

    it('registers the update handler safely with no tabletop object', () => {
      fixture.detectChanges();
      const directive = fixture.debugElement.children[0].injector.get(RotableDirective);
      expect(directive['tabletopObject']).toBeFalsy();
      // with no tabletop object, initialize registers nothing
      // the guard is unnecessary, but the branch is covered here
    });

    it('survives an input start before the handler is ready', () => {
      fixture.detectChanges();
      const directive = fixture.debugElement.children[0].injector.get(RotableDirective);
      const writableDirective = directive as unknown as {
        [key: string]: unknown;
        onInputStart: (event: MouseEvent | TouchEvent) => void;
      };
      writableDirective['grabbingSelecter'] = '';
      writableDirective['input'] = null;

      const element = fixture.nativeElement.querySelector('div') as HTMLElement;
      const event = {
        target: element,
        button: 0,
        stopPropagation: vi.fn(),
      } as unknown as MouseEvent;

      expect(() => writableDirective.onInputStart(event)).not.toThrow();
    });
  });
});
