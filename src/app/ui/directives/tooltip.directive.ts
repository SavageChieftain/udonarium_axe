import {
  afterNextRender,
  ComponentRef,
  DestroyRef,
  Directive,
  inject,
  input,
  Type,
  ViewContainerRef,
} from '@angular/core';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { ContextMenuService } from '@axe/application/ui/context-menu.service';
import { PointerDeviceService } from '@axe/core/input/pointer-device.service';
import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';

export interface TooltipPanelInstance {
  tabletopObject: TabletopObject | null;
  left: number;
  top: number;
}

@Directive({ selector: '[appTooltip]' })
export class TooltipDirective {
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly pointerDeviceService = inject(PointerDeviceService);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly destroyRef = inject(DestroyRef);

  static TooltipPanelComponentClass: Type<TooltipPanelInstance> | null = null;

  private static activeTooltips: ComponentRef<TooltipPanelInstance>[] = [];

  readonly tabletopObject = input.required<TabletopObject>({ alias: 'appTooltip' });

  private callbackOnMouseEnter = (e: Event) => this.onMouseEnter(e as MouseEvent);
  private callbackOnMouseLeave = (e: Event) => this.onMouseLeave(e as MouseEvent);
  private callbackOnMouseDown = (e: Event) => this.onMouseDown(e as MouseEvent);

  private openTooltipTimer: NodeJS.Timeout | null = null;
  private closeTooltipTimer: NodeJS.Timeout | null = null;

  private tooltipComponentRef: ComponentRef<TooltipPanelInstance> | null = null;
  private deleteOff?: () => void;

  constructor() {
    afterNextRender(() => {
      this.addEventListeners(this.viewContainerRef.element.nativeElement);
    });
    this.destroyRef.onDestroy(() => {
      this.removeEventListeners(this.viewContainerRef.element.nativeElement);
      this.clearTimer();
      this.close();
      this.deleteOff?.();
    });
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
      this.openTooltipTimer = null;
      const magnitude =
        (pointerX - this.pointerDeviceService.pointerX) ** 2 + (pointerY - this.pointerDeviceService.pointerY) ** 2;
      if (magnitude > 4) {
        this.startOpenTimer();
      } else {
        this.open();
      }
    }, 100);
  }

  private startCloseTimer() {
    this.closeTooltipTimer = setTimeout(() => {
      this.closeTooltipTimer = null;
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
    this.closeTooltipTimer = this.openTooltipTimer = null;
  }

  private open() {
    this.closeAll();
    if (this.pointerDeviceService.isDragging) return;
    if (!TooltipDirective.TooltipPanelComponentClass) return;

    const parentViewContainerRef = ContextMenuService.defaultParentViewContainerRef;

    const injector = parentViewContainerRef.injector;

    this.tooltipComponentRef = parentViewContainerRef.createComponent(TooltipDirective.TooltipPanelComponentClass, {
      index: parentViewContainerRef.length,
      injector,
    });

    this.tooltipComponentRef.instance.tabletopObject = this.tabletopObject();
    this.tooltipComponentRef.instance.left = this.pointerDeviceService.pointerX;
    this.tooltipComponentRef.instance.top = this.pointerDeviceService.pointerY;

    this.addEventListeners(this.tooltipComponentRef.location.nativeElement);
    document.body.addEventListener('touchstart', this.callbackOnMouseDown, true);
    document.body.addEventListener('mousedown', this.callbackOnMouseDown, true);

    this.deleteOff = this.objectChange.objectDeleted$.subscribe((e) => {
      if (this.tabletopObject() && this.tabletopObject().identifier === e.identifier) this.closeAll();
    });

    this.tooltipComponentRef.onDestroy(() => {
      const ref = this.tooltipComponentRef;
      this.tooltipComponentRef = null;
      if (ref) this.removeEventListeners(ref.location.nativeElement);
      document.body.removeEventListener('touchstart', this.callbackOnMouseDown, true);
      document.body.removeEventListener('mousedown', this.callbackOnMouseDown, true);
      this.clearTimer();
      this.deleteOff?.();
      this.deleteOff = undefined;
    });
    TooltipDirective.activeTooltips.push(this.tooltipComponentRef);
  }

  private close() {
    if (!this.tooltipComponentRef) return;
    const index = TooltipDirective.activeTooltips.indexOf(this.tooltipComponentRef);
    if (index >= 0) TooltipDirective.activeTooltips.splice(index, 1);

    this.tooltipComponentRef.destroy();
    this.tooltipComponentRef = null;
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
