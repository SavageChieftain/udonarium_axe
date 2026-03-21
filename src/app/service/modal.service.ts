import {
  ComponentFactoryResolver,
  ComponentRef,
  Inject,
  Injectable,
  Injector,
  Optional,
  ViewContainerRef,
} from '@angular/core';

/*
thanks
http://qiita.com/Quramy/items/ccfcfa0e45dd9e43f041
http://qiita.com/alclimb/items/1c740a432c10b6dc700a
*/

class ModalContext {
  constructor(
    private _resolve: (value: unknown) => void,
    private _reject: (reason?: unknown) => void,
    public option?: unknown
  ) {}
  resolve(value: unknown) {
    this._resolve(value);
    this._resolve = null!;
  }
  reject(reason?: unknown) {
    this._reject(reason);
    this._reject = null!;
  }
}

@Injectable()
export class ModalService {
  private componentFactoryResolver: ComponentFactoryResolver;

  constructor(@Optional() @Inject(ComponentFactoryResolver) componentFactoryResolver?: ComponentFactoryResolver) {
    this.componentFactoryResolver = componentFactoryResolver!;
  }

  private modalContext: ModalContext = null!;
  private count = 0;

  title: string = '無名のモーダル';

  /* Todo */
  static defaultParentViewContainerRef: ViewContainerRef;
  static ModalComponentClass: { new (...args: unknown[]): unknown } = null!;
  get option(): unknown {
    return this.modalContext ? this.modalContext.option : null!;
  }

  get isShow(): boolean {
    return this.count > 0;
  }

  open<T>(
    childComponent: { new (...args: unknown[]): unknown },
    option?: unknown,
    parentViewContainerRef?: ViewContainerRef
  ): Promise<T> {
    if (!parentViewContainerRef) {
      parentViewContainerRef = ModalService.defaultParentViewContainerRef;
    }
    let panelComponentRef: ComponentRef<unknown>;
    return new Promise<T>((resolve, reject) => {
      // Injector 作成
      const _resolve = (val: T) => {
        if (panelComponentRef) {
          panelComponentRef.destroy();
          resolve(val);
          this.count--;
        }
      };

      const _reject = (reason?: unknown) => {
        if (panelComponentRef) {
          panelComponentRef.destroy();
          reject(reason);
          this.count--;
        }
      };

      const childModalService: ModalService = new ModalService();
      childModalService['componentFactoryResolver'] = this.componentFactoryResolver;
      childModalService.modalContext = new ModalContext(_resolve as (val: unknown) => void, _reject, option);
      if (option != null && typeof option === 'object' && 'title' in option) {
        childModalService.title = ((option as Record<string, unknown>).title as string) ?? '';
      }

      const parentInjector = parentViewContainerRef.injector; //parentViewContainerRef.parentInjector;
      const injector = Injector.create([{ provide: ModalService, useValue: childModalService }], parentInjector);

      const panelComponentFactory = this.componentFactoryResolver.resolveComponentFactory(
        ModalService.ModalComponentClass
      );
      const bodyComponentFactory = this.componentFactoryResolver.resolveComponentFactory(childComponent);
      panelComponentRef = parentViewContainerRef.createComponent(
        panelComponentFactory,
        parentViewContainerRef.length,
        injector
      );
      (panelComponentRef.instance as { content: ViewContainerRef }).content.createComponent(bodyComponentFactory);

      panelComponentRef.onDestroy(() => {
        this.count--;
      });

      this.count++;
    });
  }

  resolve(value?: unknown) {
    if (this.modalContext) {
      this.modalContext.resolve(value);
      this.modalContext = null!;
    }
  }

  reject(reason?: unknown) {
    if (this.modalContext) {
      this.modalContext.reject(reason);
      this.modalContext = null!;
    }
  }
}
