import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SelectionSignalService } from '@axe/application/ui/selection-signal.service';
import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';
import { SelectableDirective } from '@axe/ui/directives/selectable.directive';

function makeObj(id: string, alias = 'character'): TabletopObject {
  return { identifier: id, aliasName: alias } as unknown as TabletopObject;
}

@Component({
  imports: [SelectableDirective],
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

  it('Ctrl+クリックで選択をトグルする', () => {
    const { fixture, host, el } = makeFixture();
    host.target.set(makeObj('id-1'));
    fixture.detectChanges();

    el.dispatchEvent(new PointerEvent('pointerdown', { button: 0, ctrlKey: true }));
    expect(service.isSelected('id-1')).toBe(true);

    el.dispatchEvent(new PointerEvent('pointerdown', { button: 0, ctrlKey: true }));
    expect(service.isSelected('id-1')).toBe(false);
  });

  it('Ctrl+クリックは stopPropagation して MovableDirective の drag-start を抑止する', () => {
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

  it('既存選択がある状態で未選択オブジェクトを Ctrl 無しでクリックすると replace される', () => {
    const { fixture, host, el } = makeFixture();
    host.target.set(makeObj('id-2'));
    fixture.detectChanges();
    service.addSelection('id-1');

    el.dispatchEvent(new PointerEvent('pointerdown', { button: 0 }));
    expect(service.isSelected('id-1')).toBe(false);
    expect(service.isSelected('id-2')).toBe(true);
  });

  it('未選択状態で Ctrl 無しクリックでは何もしない（既存ドラッグ動作を維持）', () => {
    const { fixture, host, el } = makeFixture();
    host.target.set(makeObj('id-1'));
    fixture.detectChanges();

    el.dispatchEvent(new PointerEvent('pointerdown', { button: 0 }));
    expect(service.isSelected('id-1')).toBe(false);
  });

  it('選択時に app-selected クラスが付く', async () => {
    const { fixture, host, el } = makeFixture();
    host.target.set(makeObj('id-1'));
    fixture.detectChanges();
    service.addSelection('id-1');
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    fixture.detectChanges();
    expect(el.classList.contains('app-selected')).toBe(true);
  });
});
