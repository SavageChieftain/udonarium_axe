import { AfterViewInit, ComponentRef, Directive, inject, Input, OnDestroy, ViewContainerRef } from '@angular/core';
import { EventSystem } from '@axe/core/index';
import { PointerDeviceService } from '@axe/core/pointer-device.service';
import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';
import { OverviewPanelComponent } from '@axe/features/inventory/overview-panel/overview-panel.component';
import { ContextMenuService } from '@axe/shared/context-menu.service';

@Directive({ selector: '[appTooltip]' })
export class TooltipDirective implements AfterViewInit, OnDestroy {
  private viewContainerRef = inject(ViewContainerRef);
  private pointerDeviceService = inject(PointerDeviceService);

  private static activeTooltips: ComponentRef<OverviewPanelComponent>[] = [];

  @Input('appTooltip') tabletopObject: TabletopObject;

  private callbackOnMouseEnter = (e: Event) => this.onMouseEnter(e as MouseEvent);
  private callbackOnMouseLeave = (e: Event) => this.onMouseLeave(e as MouseEvent);
  private callbackOnMouseDown = (e: Event) => this.onMouseDown(e as MouseEvent);

  private openTooltipTimer!: NodeJS.Timeout;
  private closeTooltipTimer!: NodeJS.Timeout;

  private tooltipComponentRef!: ComponentRef<OverviewPanelComponent>;

  ngAfterViewInit() {
    this.addEventListeners(this.viewContainerRef.element.nativeElement);
  }

  ngOnDestroy() {
    this.removeEventListeners(this.viewContainerRef.element.nativeElement);
    this.clearTimer();
    this.close();
  }

  private onMouseEnter(_e: MouseEvent) {
    this.clearTimer();
    if (!this.tooltipComponentRef) this.startOpenTimer();
  }

  private onMouseLeave(_e: MouseEvent) {
    this.clearTimer();
    if (this.tooltipComponentRef) this.startCloseTimer();
  }

  private onMouseDown(e: MouseEvent) {
    if (!this.tooltipComponentRef) return;
    if (
      !this.tooltipComponentRef.location.nativeElement.contains(e.target as Node) &&
      !this.viewContainerRef.element.nativeElement.contains(e.target as Node)
    ) {
      this.closeAll();
    }
  }

  private startOpenTimer() {
    const pointerX = this.pointerDeviceService.pointerX;
    const pointerY = this.pointerDeviceService.pointerY;

    this.openTooltipTimer = setTimeout(() => {
      this.openTooltipTimer = null!;
      const magnitude =
        (pointerX - this.pointerDeviceService.pointerX) ** 2 + (pointerY - this.pointerDeviceService.pointerY) ** 2;
      if (4 < magnitude) {
        this.startOpenTimer();
      } else {
        this.open();
      }
    }, 100);
  }

  private startCloseTimer() {
    this.closeTooltipTimer = setTimeout(() => {
      this.closeTooltipTimer = null!;
      if (
        this.tooltipComponentRef &&
        this.tooltipComponentRef.location.nativeElement.contains(document.activeElement)
      ) {
        this.startCloseTimer();
      } else {
        this.closeAll();
      }
    }, 400); // ポップアップのクローズタイミング
  }

  private clearTimer() {
    if (this.closeTooltipTimer) clearTimeout(this.closeTooltipTimer);
    if (this.openTooltipTimer) clearTimeout(this.openTooltipTimer);
    this.closeTooltipTimer = this.openTooltipTimer = null!;
  }

  private open() {
    this.closeAll();
    if (this.pointerDeviceService.isDragging) return;

    const parentViewContainerRef = ContextMenuService.defaultParentViewContainerRef;

    const injector = parentViewContainerRef.injector;

    this.tooltipComponentRef = parentViewContainerRef.createComponent(OverviewPanelComponent, {
      index: parentViewContainerRef.length,
      injector,
    });

    this.tooltipComponentRef.instance.tabletopObject = this.tabletopObject;
    this.tooltipComponentRef.instance.left = this.pointerDeviceService.pointerX;
    this.tooltipComponentRef.instance.top = this.pointerDeviceService.pointerY;

    this.addEventListeners(this.tooltipComponentRef.location.nativeElement);
    document.body.addEventListener('touchstart', this.callbackOnMouseDown, true);
    document.body.addEventListener('mousedown', this.callbackOnMouseDown, true);

    EventSystem.register(this).on('DELETE_GAME_OBJECT', (event) => {
      if (this.tabletopObject && this.tabletopObject.identifier === event.data.identifier) this.closeAll();
    });

    this.tooltipComponentRef.onDestroy(() => {
      this.removeEventListeners(this.tooltipComponentRef.location.nativeElement);
      document.body.removeEventListener('touchstart', this.callbackOnMouseDown, true);
      document.body.removeEventListener('mousedown', this.callbackOnMouseDown, true);
      this.clearTimer();
      this.tooltipComponentRef = null!;
      EventSystem.unregister(this);
    });
    TooltipDirective.activeTooltips.push(this.tooltipComponentRef);
  }

  private close() {
    if (!this.tooltipComponentRef) return;
    const index = TooltipDirective.activeTooltips.indexOf(this.tooltipComponentRef);
    if (0 <= index) TooltipDirective.activeTooltips.splice(index, 1);

    this.tooltipComponentRef.destroy();
    this.tooltipComponentRef = null!;
  }

  private closeAll() {
    TooltipDirective.activeTooltips.forEach((componentRef) => componentRef.destroy());
    TooltipDirective.activeTooltips = [];
    this.close();
  }

  private addEventListeners(element: Element) {
    element.addEventListener('mouseenter', this.callbackOnMouseEnter, false);
    element.addEventListener('mouseleave', this.callbackOnMouseLeave, false);
  }

  private removeEventListeners(element: Element) {
    element.removeEventListener('mouseenter', this.callbackOnMouseEnter, false);
    element.removeEventListener('mouseleave', this.callbackOnMouseLeave, false);
  }
}
