import { ComponentRef, Injectable, ViewContainerRef } from '@angular/core';
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
  altitudeHande?: TabletopObject;
  type?: ContextMenuType;
  subActions?: ContextMenuAction[];
}

@Injectable()
export class ContextMenuService {
  static defaultParentViewContainerRef: ViewContainerRef;
  static ContextMenuComponentClass: { new (...args: unknown[]): unknown } = null!;
  private panelComponentRef: ComponentRef<unknown> | null = null;

  title: string = '';
  actions: ContextMenuAction[] = [];
  position: ContextMenuPoint = { x: 0, y: 0 };

  get isShow(): boolean {
    return this.panelComponentRef !== null;
  }

  open(
    position: ContextMenuPoint,
    actions: ContextMenuAction[],
    title?: string,
    parentViewContainerRef?: ViewContainerRef
  ) {
    this.close();
    if (!parentViewContainerRef) {
      parentViewContainerRef = ContextMenuService.defaultParentViewContainerRef;
    }
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
