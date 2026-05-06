import { ComponentRef, Injectable, Injector, signal, ViewContainerRef } from '@angular/core';

class ModalContext {
  constructor(
    private _resolve: ((value: unknown) => void) | null,
    private _reject: ((reason?: unknown) => void) | null,
    public option?: unknown
  ) {}
  resolve(value: unknown) {
    this._resolve?.(value);
    this._resolve = null;
  }
  reject(reason?: unknown) {
    this._reject?.(reason);
    this._reject = null;
  }
}

@Injectable()
export class ModalService {
  private modalContext: ModalContext | null = null;
  private count = 0;

  private readonly _title = signal('無名のモーダル');
  get title(): string {
    return this._title();
  }
  set title(value: string) {
    this._title.set(value);
  }

  private readonly _titleTooltip = signal('');
  get titleTooltip(): string {
    return this._titleTooltip();
  }
  set titleTooltip(value: string) {
    this._titleTooltip.set(value);
  }

  static defaultParentViewContainerRef: ViewContainerRef;
  static ModalComponentClass: { new (...args: unknown[]): unknown } = null!;
  get option(): unknown {
    return this.modalContext?.option;
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
        }
      };

      const _reject = (reason?: unknown) => {
        if (panelComponentRef) {
          panelComponentRef.destroy();
          reject(reason);
        }
      };

      const childModalService: ModalService = new ModalService();
      childModalService.modalContext = new ModalContext(_resolve as (val: unknown) => void, _reject, option);
      if (option != null && typeof option === 'object' && 'title' in option) {
        childModalService.title = ((option as Record<string, unknown>).title as string) ?? '';
      }

      const parentInjector = parentViewContainerRef.injector;
      const injector = Injector.create([{ provide: ModalService, useValue: childModalService }], parentInjector);

      panelComponentRef = parentViewContainerRef.createComponent(ModalService.ModalComponentClass, {
        index: parentViewContainerRef.length,
        injector,
      });
      (panelComponentRef.instance as { content: () => ViewContainerRef }).content().createComponent(childComponent);

      panelComponentRef.onDestroy(() => {
        this.count--;
      });

      this.count++;
    });
  }

  resolve(value?: unknown) {
    if (this.modalContext) {
      this.modalContext.resolve(value);
      this.modalContext = null;
    }
  }

  reject(reason?: unknown) {
    if (this.modalContext) {
      this.modalContext.reject(reason);
      this.modalContext = null;
    }
  }
}
