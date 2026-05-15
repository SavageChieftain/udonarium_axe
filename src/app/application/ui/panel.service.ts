import { ComponentRef, Injectable, ViewContainerRef } from '@angular/core';
import { EventChannel } from '@axe/core/event/event-channel';
import { CardStack } from '@axe/domain/card/card-stack';
import { ChatTab } from '@axe/domain/chat/chat-tab';

declare const Type: FunctionConstructor;
interface Type<T> {
  new (...args: unknown[]): T;
}

export interface PanelOption {
  title?: string;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  minWidth?: number;
  minHeight?: number;

  isCutIn?: boolean;
  cutInIdentifier?: string;
  invisible?: boolean;
}

interface UIPanelInstance {
  content: () => ViewContainerRef;
}

export interface ChatPortraitDecoration {
  chatTabidentifier: string;
  isTilteTop: boolean;
  dispByMouse: boolean;
}
export interface CardStackListDecoration {
  cardStackidentifier: string;
}

type PanelServiceAssignableKey =
  | 'title'
  | 'top'
  | 'left'
  | 'width'
  | 'height'
  | 'minWidth'
  | 'minHeight'
  | 'isCutIn'
  | 'cutInIdentifier'
  | 'invisible';

@Injectable()
export class PanelService {
  static defaultParentViewContainerRef: ViewContainerRef;
  static UIPanelComponentClass: { new (...args: unknown[]): UIPanelInstance } = null!;
  static chatPortraitComponentClass: Type<unknown> | null = null;
  static cardStackListComponentClass: Type<unknown> | null = null;
  private panelComponentRef: ComponentRef<UIPanelInstance> | null = null;
  title: string = '無名のパネル';
  titleTooltip: string = '';
  left: number = 0;
  top: number = 0;
  width: number = 100;
  height: number = 100;
  minWidth: number = 100;
  minHeight: number = 100;
  isCutIn: boolean = false;
  cutInIdentifier: string = '';
  invisible: boolean = false;
  chatTab: ChatTab | null = null;
  cardStack: CardStack | null = null;
  scrollablePanel: HTMLDivElement | null = null;
  readonly scrollToBottom$ = new EventChannel<void>();
  get isShow(): boolean {
    return this.panelComponentRef !== null;
  }

  open<T>(childComponent: Type<T>, option?: PanelOption, parentViewContainerRef?: ViewContainerRef): T {
    if (!parentViewContainerRef) {
      parentViewContainerRef = PanelService.defaultParentViewContainerRef;
    }
    const injector = parentViewContainerRef.injector;

    const panelComponentRef = parentViewContainerRef.createComponent(PanelService.UIPanelComponentClass, {
      index: parentViewContainerRef.length,
      injector,
    });
    const bodyComponentRef: ComponentRef<T> = panelComponentRef.instance.content().createComponent(childComponent);

    const childPanelService: PanelService = panelComponentRef.injector.get(PanelService);

    childPanelService.panelComponentRef = panelComponentRef;
    if (option) this.applyPanelOption(panelComponentRef, childPanelService, option);
    panelComponentRef.onDestroy(() => {
      childPanelService.panelComponentRef = null;
    });

    return bodyComponentRef.instance as T;
  }

  openLazy<T>(
    factory: () => Promise<Type<T>>,
    option?: PanelOption,
    setup?: (instance: T) => void,
    parentViewContainerRef?: ViewContainerRef
  ): void {
    factory().then((childComponent) => {
      const instance = this.open(childComponent, option, parentViewContainerRef);
      setup?.(instance);
    });
  }

  private applyPanelOption(
    panelComponentRef: ComponentRef<UIPanelInstance>,
    childPanelService: PanelService,
    option: PanelOption
  ) {
    const withInput = ['title', 'top', 'left', 'width', 'height', 'minWidth', 'minHeight'] as const;
    for (const key of withInput) {
      const value = option[key];
      if (value === undefined) continue;
      this.setPanelServiceValue(childPanelService, key, value);
      panelComponentRef.setInput(key, value);
    }

    const serviceOnly = ['isCutIn', 'cutInIdentifier', 'invisible'] as const;
    for (const key of serviceOnly) {
      const value = option[key];
      if (value === undefined) continue;
      this.setPanelServiceValue(childPanelService, key, value);
    }
  }

  private setPanelServiceValue<K extends PanelServiceAssignableKey>(
    panelService: PanelService,
    key: K,
    value: PanelService[K]
  ) {
    panelService[key] = value;
  }

  close() {
    if (this.panelComponentRef) {
      this.panelComponentRef.destroy();
      this.panelComponentRef = null;
    }
  }
}
