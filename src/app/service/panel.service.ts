import { ComponentFactoryResolver, ComponentRef, Injectable, ViewContainerRef, inject } from '@angular/core';
import { ChatTab } from '@axe/chat-tab';
import { CardStack } from '@axe/card-stack';

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

  isCutIn?: boolean; //この方式でよいか検討のこと
  cutInIdentifier?: string;
}

interface UIPanelInstance {
  content: ViewContainerRef;
}

@Injectable()
export class PanelService {
  private componentFactoryResolver = inject(ComponentFactoryResolver);

  /* Todo */
  static defaultParentViewContainerRef: ViewContainerRef;
  static UIPanelComponentClass: { new (...args: unknown[]): UIPanelInstance } = null!;
  private panelComponentRef!: ComponentRef<UIPanelInstance>;
  title: string = '無名のパネル';
  left: number = 0;
  top: number = 0;
  width: number = 100;
  height: number = 100;
  isCutIn: boolean = false; //この方式でよいか検討のこと
  cutInIdentifier: string = '';
  chatTab: ChatTab = null!;
  cardStack: CardStack = null!;
  scrollablePanel: HTMLDivElement = null!;
  get isShow(): boolean {
    return this.panelComponentRef ? true : false;
  }

  open<T>(childComponent: Type<T>, option?: PanelOption, parentViewContainerRef?: ViewContainerRef): T {
    if (!parentViewContainerRef) {
      parentViewContainerRef = PanelService.defaultParentViewContainerRef;
    }
    const injector = parentViewContainerRef.injector;

    const panelComponentFactory = this.componentFactoryResolver.resolveComponentFactory(
      PanelService.UIPanelComponentClass
    );
    const bodyComponentFactory = this.componentFactoryResolver.resolveComponentFactory(childComponent);

    const panelComponentRef = parentViewContainerRef.createComponent(
      panelComponentFactory,
      parentViewContainerRef.length,
      injector
    );
    const bodyComponentRef: ComponentRef<T> = panelComponentRef.instance.content.createComponent(bodyComponentFactory);

    const childPanelService: PanelService = panelComponentRef.injector.get(PanelService);

    childPanelService.panelComponentRef = panelComponentRef;
    if (option) {
      if (option.title) childPanelService.title = option.title;
      if (option.top) childPanelService.top = option.top;
      if (option.left) childPanelService.left = option.left;
      if (option.width) childPanelService.width = option.width;
      if (option.height) childPanelService.height = option.height;
      if (option.isCutIn) {
        childPanelService.isCutIn = option.isCutIn; //この方式でよいか検討のこと
      }
      if (option.cutInIdentifier) {
        childPanelService.cutInIdentifier = option.cutInIdentifier; //この方式でよいか検討のこと
      }

      //      if (option.chatTab){
      //         childPanelService.chatTab = option.chatTab;  //この方式でよいか検討のこと
      //      }
    }
    panelComponentRef.onDestroy(() => {
      childPanelService.panelComponentRef = null!;
    });

    return <T>bodyComponentRef.instance;
  }

  close() {
    if (this.panelComponentRef) {
      this.panelComponentRef.destroy();
      this.panelComponentRef = null!;
    }
  }
}
