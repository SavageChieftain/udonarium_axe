import { ComponentRef, ViewContainerRef } from '@angular/core';
import { PanelOption, PanelService } from '@axe/shared/ui/panel.service';

class DummyBodyComponent {}

function setupOpenMocks(initialChildState?: Partial<PanelService>) {
  const service = new PanelService();
  const childPanelService = new PanelService();
  Object.assign(childPanelService, initialChildState);

  const bodyInstance = new DummyBodyComponent();
  const setInput = vi.fn();
  const destroy = vi.fn();
  let destroyCallback: (() => void) | undefined;

  const panelComponentRef = {
    instance: {
      content: () =>
        ({
          createComponent: () => ({ instance: bodyInstance }) as ComponentRef<DummyBodyComponent>,
        }) as unknown as ViewContainerRef,
    },
    injector: {
      get: () => childPanelService,
    },
    setInput,
    destroy,
    onDestroy: (callback: () => void) => {
      destroyCallback = callback;
    },
  } as unknown as ComponentRef<{ content: () => ViewContainerRef }>;

  const parentViewContainerRef = {
    injector: {},
    length: 0,
    createComponent: () => panelComponentRef,
  } as unknown as ViewContainerRef;

  return {
    service,
    childPanelService,
    panelComponentRef,
    parentViewContainerRef,
    setInput,
    destroy,
    bodyInstance,
    runDestroyCallback: () => destroyCallback?.(),
  };
}

describe('PanelService', () => {
  it('初期状態では isShow=false であること', () => {
    const { service } = setupOpenMocks();
    expect(service.isShow).toBe(false);
  });

  it('open: option の 0 / false / 空文字を正しく適用する', () => {
    const { service, childPanelService, parentViewContainerRef, setInput, bodyInstance } = setupOpenMocks({
      title: 'old-title',
      top: 999,
      left: 999,
      width: 999,
      height: 999,
      isCutIn: true,
      cutInIdentifier: 'old-id',
    });

    const option: PanelOption = {
      title: '',
      top: 0,
      left: 0,
      width: 0,
      height: 0,
      isCutIn: false,
      cutInIdentifier: '',
    };

    const opened = service.open(DummyBodyComponent, option, parentViewContainerRef);

    expect(opened).toBe(bodyInstance);
    expect(childPanelService.title).toBe('');
    expect(childPanelService.top).toBe(0);
    expect(childPanelService.left).toBe(0);
    expect(childPanelService.width).toBe(0);
    expect(childPanelService.height).toBe(0);
    expect(childPanelService.isCutIn).toBe(false);
    expect(childPanelService.cutInIdentifier).toBe('');

    expect(setInput).toHaveBeenCalledTimes(5);
    expect(setInput).toHaveBeenCalledWith('title', '');
    expect(setInput).toHaveBeenCalledWith('top', 0);
    expect(setInput).toHaveBeenCalledWith('left', 0);
    expect(setInput).toHaveBeenCalledWith('width', 0);
    expect(setInput).toHaveBeenCalledWith('height', 0);
  });

  it('open: parentViewContainerRef 未指定時は defaultParentViewContainerRef を使う', () => {
    const { service, childPanelService, setInput, bodyInstance, parentViewContainerRef } = setupOpenMocks();

    PanelService.defaultParentViewContainerRef = parentViewContainerRef;

    const opened = service.open(DummyBodyComponent, { width: 320, height: 240 });

    expect(opened).toBe(bodyInstance);
    expect(childPanelService.width).toBe(320);
    expect(childPanelService.height).toBe(240);
    expect(setInput).toHaveBeenCalledWith('width', 320);
    expect(setInput).toHaveBeenCalledWith('height', 240);
  });

  it('close: 生成された childPanelService から panel を destroy できる', () => {
    const { service, childPanelService, parentViewContainerRef, destroy } = setupOpenMocks();

    service.open(DummyBodyComponent, undefined, parentViewContainerRef);
    childPanelService.close();

    expect(destroy).toHaveBeenCalledTimes(1);
  });

  it('open: 登録した onDestroy で childPanelService の panelComponentRef をクリアする', () => {
    const { service, childPanelService, parentViewContainerRef, runDestroyCallback } = setupOpenMocks();

    service.open(DummyBodyComponent, undefined, parentViewContainerRef);
    expect(childPanelService.isShow).toBe(true);

    runDestroyCallback();
    expect(childPanelService.isShow).toBe(false);
  });

  it('close: panel 未生成でも例外を投げず、複数回呼べること', () => {
    const { service, childPanelService, parentViewContainerRef, destroy } = setupOpenMocks();

    expect(() => service.close()).not.toThrow();
    service.open(DummyBodyComponent, undefined, parentViewContainerRef);
    childPanelService.close();
    expect(() => childPanelService.close()).not.toThrow();
    expect(destroy).toHaveBeenCalledTimes(1);
  });
});
