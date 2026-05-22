import { ComponentRef, ViewContainerRef } from '@angular/core';
import { PanelOption, PanelService } from '@axe/application/ui/panel.service';

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
      minWidth: 999,
      minHeight: 999,
      isCutIn: true,
      cutInIdentifier: 'old-id',
    });

    const option: PanelOption = {
      title: '',
      top: 0,
      left: 0,
      width: 0,
      height: 0,
      minWidth: 0,
      minHeight: 0,
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
    expect(childPanelService.minWidth).toBe(0);
    expect(childPanelService.minHeight).toBe(0);
    expect(childPanelService.isCutIn).toBe(false);
    expect(childPanelService.cutInIdentifier).toBe('');

    expect(setInput).toHaveBeenCalledTimes(7);
    expect(setInput).toHaveBeenCalledWith('title', '');
    expect(setInput).toHaveBeenCalledWith('top', 0);
    expect(setInput).toHaveBeenCalledWith('left', 0);
    expect(setInput).toHaveBeenCalledWith('width', 0);
    expect(setInput).toHaveBeenCalledWith('height', 0);
    expect(setInput).toHaveBeenCalledWith('minWidth', 0);
    expect(setInput).toHaveBeenCalledWith('minHeight', 0);
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

  describe('clampPanelOptionToViewport', () => {
    let originalInnerWidth: number;
    let originalInnerHeight: number;

    beforeEach(() => {
      originalInnerWidth = window.innerWidth;
      originalInnerHeight = window.innerHeight;
      Object.defineProperty(window, 'innerWidth', { value: 1280, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 720, configurable: true });
    });

    afterEach(() => {
      Object.defineProperty(window, 'innerWidth', { value: originalInnerWidth, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: originalInnerHeight, configurable: true });
    });

    it('ビューポート内の位置はそのまま', () => {
      const fallback = new PanelService();
      const adjusted = PanelService.clampPanelOptionToViewport(
        { left: 100, top: 50, width: 400, height: 300 },
        fallback
      );
      expect(adjusted.left).toBe(100);
      expect(adjusted.top).toBe(50);
    });

    it('上方向にはみ出る (top<0) なら 0 にクランプ', () => {
      const fallback = new PanelService();
      const adjusted = PanelService.clampPanelOptionToViewport(
        { left: 200, top: -100, width: 400, height: 300 },
        fallback
      );
      expect(adjusted.top).toBe(0);
    });

    it('下方向にはみ出る (top + height > viewport) なら viewport - height にクランプ', () => {
      const fallback = new PanelService();
      const adjusted = PanelService.clampPanelOptionToViewport(
        { left: 200, top: 600, width: 400, height: 300 },
        fallback
      );
      // viewportH=720, height=300, maxTop = 420
      expect(adjusted.top).toBe(420);
    });

    it('右方向にはみ出る (left + width > viewport) なら viewport - width にクランプ', () => {
      const fallback = new PanelService();
      const adjusted = PanelService.clampPanelOptionToViewport(
        { left: 1100, top: 100, width: 400, height: 300 },
        fallback
      );
      // viewportW=1280, width=400, maxLeft = 880
      expect(adjusted.left).toBe(880);
    });

    it('パネルがビューポートより大きい場合は左/上端 (0) に寄せる', () => {
      const fallback = new PanelService();
      const adjusted = PanelService.clampPanelOptionToViewport(
        { left: 100, top: 100, width: 2000, height: 1500 },
        fallback
      );
      expect(adjusted.left).toBe(0);
      expect(adjusted.top).toBe(0);
    });

    it('left/top 未指定なら何もしない', () => {
      const fallback = new PanelService();
      const adjusted = PanelService.clampPanelOptionToViewport({ width: 400, height: 300 }, fallback);
      expect(adjusted.left).toBeUndefined();
      expect(adjusted.top).toBeUndefined();
    });
  });
});
