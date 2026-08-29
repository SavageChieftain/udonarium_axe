import { ComponentRef, Injectable, reflectComponentType, signal, ViewContainerRef } from '@angular/core';
import { EventChannel } from '@axe/core/event/event-channel';
import { Logger } from '@axe/core/logging/logger';
import { CardStack } from '@axe/domain/card/card-stack';
import { ChatTab } from '@axe/domain/chat/chat-tab';

declare const Type: FunctionConstructor;
interface Type<T> {
  new (...args: unknown[]): T;
}

function panelKindOf(childComponent: Type<unknown>): string {
  const selector = reflectComponentType(childComponent as never)?.selector;
  return selector && selector.length > 0 ? selector : '';
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
  minimizeToContent?: boolean;
  frameless?: boolean;

  /**
   * A name that only one panel at a time may hold.
   *
   * A button that opens a panel under this name can close it again with `closeSingle`, so
   * pressing it twice puts the panel away rather than burying the screen in copies of it.
   */
  single?: string;
}

interface UIPanelInstance {
  content: () => ViewContainerRef;
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
  | 'invisible'
  | 'minimizeToContent'
  | 'frameless';

@Injectable()
export class PanelService {
  static defaultParentViewContainerRef: ViewContainerRef;
  static UIPanelComponentClass: { new (...args: unknown[]): UIPanelInstance } = null!;
  static chatPortraitComponentClass: Type<unknown> | null = null;
  static cardStackListComponentClass: Type<unknown> | null = null;
  private panelComponentRef: ComponentRef<UIPanelInstance> | null = null;
  private static readonly singles = new Map<string, ComponentRef<UIPanelInstance>>();
  title: string = '';
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
  minimizeToContent: boolean = false;
  frameless: boolean = false;
  readonly isMinimized = signal(false);
  /** What kind of panel this is, taken from the selector of what it was opened with. */
  readonly panelKind = signal('');
  chatTab: ChatTab | null = null;
  cardStack: CardStack | null = null;
  scrollablePanel: HTMLDivElement | null = null;
  private isScrollablePanelClaimed = false;
  readonly scrollToBottom$ = new EventChannel<void>();
  get isShow(): boolean {
    return this.panelComponentRef !== null;
  }

  setDefaultScrollablePanel(panel: HTMLDivElement): void {
    if (this.isScrollablePanelClaimed) return;
    this.scrollablePanel = panel;
  }

  claimScrollablePanel(panel: HTMLDivElement): void {
    this.isScrollablePanelClaimed = true;
    this.scrollablePanel = panel;
  }

  /** Closes the panel holding this name, and says whether there was one to close. */
  closeSingle(name: string): boolean {
    const open = PanelService.singles.get(name);
    if (!open) return false;
    open.destroy();
    return true;
  }

  open<T>(childComponent: Type<T>, option?: PanelOption, parentViewContainerRef?: ViewContainerRef): T {
    if (!parentViewContainerRef) {
      parentViewContainerRef = PanelService.defaultParentViewContainerRef;
    }
    const injector = parentViewContainerRef.injector;

    if (option?.single) PanelService.singles.get(option.single)?.destroy();

    const panelComponentRef = parentViewContainerRef.createComponent(PanelService.UIPanelComponentClass, {
      index: parentViewContainerRef.length,
      injector,
    });
    const bodyComponentRef: ComponentRef<T> = panelComponentRef.instance.content().createComponent(childComponent);

    const childPanelService: PanelService = panelComponentRef.injector.get(PanelService);

    childPanelService.panelComponentRef = panelComponentRef;
    childPanelService.panelKind.set(panelKindOf(childComponent));
    if (option) this.applyPanelOption(panelComponentRef, childPanelService, option);
    const single = option?.single;
    if (single) PanelService.singles.set(single, panelComponentRef);
    panelComponentRef.onDestroy(() => {
      childPanelService.panelComponentRef = null;
      if (single && PanelService.singles.get(single) === panelComponentRef) PanelService.singles.delete(single);
    });

    return bodyComponentRef.instance as T;
  }

  openLazy<T>(
    factory: () => Promise<Type<T>>,
    option?: PanelOption,
    setup?: (instance: T) => void,
    parentViewContainerRef?: ViewContainerRef
  ): void {
    // A panel that fails to arrive says nothing for itself: the promise rejects into nowhere
    // and the reader is left looking at a menu item that appears to do nothing.
    factory()
      .then((childComponent) => {
        const instance = this.open(childComponent, option, parentViewContainerRef);
        setup?.(instance);
      })
      .catch((reason) => {
        Logger.error('[PanelService] パネルを開けませんでした', reason);
      });
  }

  private applyPanelOption(
    panelComponentRef: ComponentRef<UIPanelInstance>,
    childPanelService: PanelService,
    option: PanelOption
  ) {
    const adjusted = PanelService.clampPanelOptionToViewport(option, childPanelService);
    const withInput = ['title', 'top', 'left', 'width', 'height', 'minWidth', 'minHeight'] as const;
    for (const key of withInput) {
      const value = adjusted[key];
      if (value === undefined) continue;
      this.setPanelServiceValue(childPanelService, key, value);
      panelComponentRef.setInput(key, value);
    }

    const serviceOnly = ['isCutIn', 'cutInIdentifier', 'invisible', 'minimizeToContent', 'frameless'] as const;
    for (const key of serviceOnly) {
      const value = adjusted[key];
      if (value === undefined) continue;
      this.setPanelServiceValue(childPanelService, key, value);
    }
  }

  static clampPanelOptionToViewport(option: PanelOption, fallback: PanelService): PanelOption {
    if (typeof window === 'undefined') return option;
    const width = option.width ?? fallback.width;
    const height = option.height ?? fallback.height;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const adjusted: PanelOption = { ...option };
    if (option.left !== undefined) {
      const maxLeft = Math.max(0, viewportW - width);
      adjusted.left = Math.max(0, Math.min(option.left, maxLeft));
    }
    if (option.top !== undefined) {
      const maxTop = Math.max(0, viewportH - height);
      adjusted.top = Math.max(0, Math.min(option.top, maxTop));
    }
    return adjusted;
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
