import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SelectionSignalService } from '@axe/application/ui/selection-signal.service';
import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';
import { makeFakeTabletopObject } from '@axe/testing/factories/tabletop-object.factory';
import { SelectableDirective } from '@axe/ui/directives/selectable.directive';

function makeObj(id: string, alias = 'character'): TabletopObject {
  return makeFakeTabletopObject({ identifier: id, aliasName: alias });
}

@Component({
  imports: [SelectableDirective],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<div data-host [appSelectable]="target()"></div>`,
})
class HostComponent {
  readonly target = signal<TabletopObject | null>(null);
}

function makeFixture(): { fixture: ComponentFixture<HostComponent>; host: HostComponent; el: HTMLElement } {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  const el = fixture.nativeElement.querySelector('[data-host]') as HTMLElement;
  return { fixture, host: fixture.componentInstance, el };
}

describe('SelectableDirective', () => {
  let service: SelectionSignalService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    service = TestBed.inject(SelectionSignalService);
  });

  it('toggles the selection on ctrl-click', () => {
    const { fixture, host, el } = makeFixture();
    host.target.set(makeObj('id-1'));
    fixture.detectChanges();

    el.dispatchEvent(new PointerEvent('pointerdown', { button: 0, ctrlKey: true }));
    expect(service.isSelected('id-1')).toBe(true);

    el.dispatchEvent(new PointerEvent('pointerdown', { button: 0, ctrlKey: true }));
    expect(service.isSelected('id-1')).toBe(false);
  });

  it('stops a ctrl-click from starting a drag', () => {
    const { fixture, host, el } = makeFixture();
    host.target.set(makeObj('id-1'));
    fixture.detectChanges();
    const ev = new PointerEvent('pointerdown', { button: 0, ctrlKey: true, cancelable: true });
    const stopSpy = vi.spyOn(ev, 'stopPropagation');
    const preventSpy = vi.spyOn(ev, 'preventDefault');
    el.dispatchEvent(ev);
    expect(stopSpy).toHaveBeenCalled();
    expect(preventSpy).toHaveBeenCalled();
  });

  it('replaces the selection when clicking an unselected object without ctrl', () => {
    const { fixture, host, el } = makeFixture();
    host.target.set(makeObj('id-2'));
    fixture.detectChanges();
    service.addSelection('id-1');

    el.dispatchEvent(new PointerEvent('pointerdown', { button: 0 }));
    expect(service.isSelected('id-1')).toBe(false);
    expect(service.isSelected('id-2')).toBe(true);
  });

  it('does nothing on a plain click with no selection, leaving dragging as it was', () => {
    const { fixture, host, el } = makeFixture();
    host.target.set(makeObj('id-1'));
    fixture.detectChanges();

    el.dispatchEvent(new PointerEvent('pointerdown', { button: 0 }));
    expect(service.isSelected('id-1')).toBe(false);
  });

  it('marks a selected object with the selected class', async () => {
    const { fixture, host, el } = makeFixture();
    host.target.set(makeObj('id-1'));
    fixture.detectChanges();
    service.addSelection('id-1');
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    fixture.detectChanges();
    expect(el.classList.contains('app-selected')).toBe(true);
  });
});
