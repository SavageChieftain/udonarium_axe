import { ChangeDetectionStrategy, Component, Type, viewChild, ViewContainerRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PointerDeviceService } from '@axe/application/input/pointer-device.service';
import { PanelOption, PanelService } from '@axe/application/ui/panel.service';
import { UIPanelComponent } from '@axe/ui/components/ui-panel/ui-panel.component';

export interface PanelDragRecoveryOptions<T> {
  beforeOpen?: () => void;
  initialize?: (component: T) => void;
  panelOption?: PanelOption;
}

@Component({
  standalone: true,
  selector: 'panel-drag-test-host',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: '<ng-template #layer></ng-template>',
})
export class PanelDragTestHostComponent {
  readonly layer = viewChild.required('layer', { read: ViewContainerRef });
}

export async function expectPanelDragRecovery<T>(componentType: Type<T>, options: PanelDragRecoveryOptions<T> = {}) {
  options.beforeOpen?.();

  const hostFixture = TestBed.createComponent(PanelDragTestHostComponent);
  hostFixture.detectChanges();

  const originalUIPanelComponentClass = PanelService.UIPanelComponentClass;
  const originalParentViewContainerRef = PanelService.defaultParentViewContainerRef;

  PanelService.UIPanelComponentClass = UIPanelComponent;
  PanelService.defaultParentViewContainerRef = hostFixture.componentInstance.layer();

  const panelService = TestBed.inject(PanelService);
  const pointerDeviceService = TestBed.inject(PointerDeviceService);

  try {
    const component = panelService.open(componentType, options.panelOption);
    options.initialize?.(component);

    hostFixture.detectChanges();
    await hostFixture.whenStable();

    pointerDeviceService.isDragging = true;
    hostFixture.detectChanges();
    await hostFixture.whenStable();

    let panel = hostFixture.nativeElement.querySelector('.draggable-panel') as HTMLElement | null;
    expect(panel).not.toBeNull();
    expect(panel?.classList.contains('pointer-events-none')).toBe(true);

    pointerDeviceService.isDragging = false;
    hostFixture.detectChanges();
    await hostFixture.whenStable();

    panel = hostFixture.nativeElement.querySelector('.draggable-panel');
    expect(panel).not.toBeNull();
    expect(panel?.classList.contains('pointer-events-none')).toBe(false);
  } finally {
    pointerDeviceService.isDragging = false;
    panelService.close();
    PanelService.UIPanelComponentClass = originalUIPanelComponentClass;
    PanelService.defaultParentViewContainerRef = originalParentViewContainerRef;
    hostFixture.destroy();
  }
}
