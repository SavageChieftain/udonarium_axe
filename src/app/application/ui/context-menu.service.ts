import { ComponentRef, inject, Injectable, ViewContainerRef } from '@angular/core';
import { RolePermissionService } from '@axe/application/permission/role-permission.service';
import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';

interface ContextMenuPoint {
  x: number;
  y: number;
}

export enum ContextMenuType {
  ACTION = 'action',
  SEPARATOR = 'separator',
}

export const ContextMenuSeparator: ContextMenuAction = {
  name: '',
  enabled: true,
  type: ContextMenuType.SEPARATOR,
};

export interface ContextMenuAction {
  name: string;
  action?: () => void;
  enabled?: boolean;
  altitudeHandle?: TabletopObject;
  type?: ContextMenuType;
  subActions?: ContextMenuAction[];
}

@Injectable()
export class ContextMenuService {
  static defaultParentViewContainerRef: ViewContainerRef;
  static ContextMenuComponentClass: { new (...args: unknown[]): unknown } = null!;
  private readonly rolePermission = inject(RolePermissionService);
  private panelComponentRef: ComponentRef<unknown> | null = null;

  title: string = '';
  actions: ContextMenuAction[] = [];
  position: ContextMenuPoint = { x: 0, y: 0 };
  /** Where the menu sits, for a caller that lives above where menus usually go. Zero is the usual place. */
  layer: number = 0;

  get isShow(): boolean {
    return this.panelComponentRef !== null;
  }

  open(
    position: ContextMenuPoint,
    actions: ContextMenuAction[],
    title?: string,
    options?: { layer?: number; parentViewContainerRef?: ViewContainerRef }
  ) {
    this.close();
    if (!this.rolePermission.canEditTabletop) return;

    const parentViewContainerRef = options?.parentViewContainerRef ?? ContextMenuService.defaultParentViewContainerRef;
    const injector = parentViewContainerRef.injector;

    const panelComponentRef = parentViewContainerRef.createComponent(ContextMenuService.ContextMenuComponentClass, {
      index: parentViewContainerRef.length,
      injector,
    });

    const childPanelService: ContextMenuService = panelComponentRef.injector.get(ContextMenuService);

    childPanelService.panelComponentRef = panelComponentRef;
    if (actions) {
      childPanelService.actions = actions;
    }
    if (position) {
      childPanelService.position.x = position.x;
      childPanelService.position.y = position.y;
    }

    childPanelService.title = title != null ? title : '';
    childPanelService.layer = options?.layer ?? 0;

    panelComponentRef.onDestroy(() => {
      childPanelService.panelComponentRef = null;
    });
  }

  close() {
    if (this.panelComponentRef) {
      this.panelComponentRef.destroy();
      this.panelComponentRef = null;
    }
  }
}
