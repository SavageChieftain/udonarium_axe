import { ChangeDetectionStrategy, Component, viewChild, ViewContainerRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PanelService } from '@axe/application/ui/panel.service';
import { UIPanelComponent } from '@axe/ui/components/ui-panel/ui-panel.component';

@Component({
  standalone: true,
  selector: 'panel-layer-test-host',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: '<ng-template #layer></ng-template>',
})
export class PanelLayerTestHostComponent {
  readonly layer = viewChild.required('layer', { read: ViewContainerRef });
}

/**
 * Somewhere for panels to be put up during a test.
 *
 * The application hands `PanelService` its layer and the frame class when it starts, so
 * anything opening a panel does nothing at all in a test until the same is done here. Returns
 * the undo, to be called from `afterEach`.
 */
export function installPanelLayer(): () => void {
  const hostFixture = TestBed.createComponent(PanelLayerTestHostComponent);
  hostFixture.detectChanges();

  const originalPanelClass = PanelService.UIPanelComponentClass;
  const originalLayer = PanelService.defaultParentViewContainerRef;
  PanelService.UIPanelComponentClass = UIPanelComponent;
  PanelService.defaultParentViewContainerRef = hostFixture.componentInstance.layer();

  return () => {
    PanelService.UIPanelComponentClass = originalPanelClass;
    PanelService.defaultParentViewContainerRef = originalLayer;
    hostFixture.destroy();
  };
}
