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
  it('starts hidden', () => {
    const { service } = setupOpenMocks();
    expect(service.isShow).toBe(false);
  });

  it('applies zero, false and empty string from the options', () => {
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

  it('keeps frameless on the service rather than on the panel inputs', () => {
    const { service, childPanelService, parentViewContainerRef, setInput } = setupOpenMocks();

    service.open(DummyBodyComponent, { width: 320, height: 240, frameless: true }, parentViewContainerRef);

    expect(childPanelService.frameless).toBe(true);
    expect(setInput).not.toHaveBeenCalledWith('frameless', true);
  });

  it('falls back to the default container when none is given', () => {
    const { service, childPanelService, setInput, bodyInstance, parentViewContainerRef } = setupOpenMocks();

    PanelService.defaultParentViewContainerRef = parentViewContainerRef;

    const opened = service.open(DummyBodyComponent, { width: 320, height: 240 });

    expect(opened).toBe(bodyInstance);
    expect(childPanelService.width).toBe(320);
    expect(childPanelService.height).toBe(240);
    expect(setInput).toHaveBeenCalledWith('width', 320);
    expect(setInput).toHaveBeenCalledWith('height', 240);
  });

  it('destroys the panel through the child service that made it', () => {
    const { service, childPanelService, parentViewContainerRef, destroy } = setupOpenMocks();

    service.open(DummyBodyComponent, undefined, parentViewContainerRef);
    childPanelService.close();

    expect(destroy).toHaveBeenCalledTimes(1);
  });

  it('clears the child service reference from the destroy hook', () => {
    const { service, childPanelService, parentViewContainerRef, runDestroyCallback } = setupOpenMocks();

    service.open(DummyBodyComponent, undefined, parentViewContainerRef);
    expect(childPanelService.isShow).toBe(true);

    runDestroyCallback();
    expect(childPanelService.isShow).toBe(false);
  });

  it('closes safely and repeatedly even with no panel', () => {
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

    it('leaves a position inside the viewport alone', () => {
      const fallback = new PanelService();
      const adjusted = PanelService.clampPanelOptionToViewport(
        { left: 100, top: 50, width: 400, height: 300 },
        fallback
      );
      expect(adjusted.left).toBe(100);
      expect(adjusted.top).toBe(50);
    });

    it('clamps a panel above the viewport to the top edge', () => {
      const fallback = new PanelService();
      const adjusted = PanelService.clampPanelOptionToViewport(
        { left: 200, top: -100, width: 400, height: 300 },
        fallback
      );
      expect(adjusted.top).toBe(0);
    });

    it('clamps a panel below the viewport to the bottom edge', () => {
      const fallback = new PanelService();
      const adjusted = PanelService.clampPanelOptionToViewport(
        { left: 200, top: 600, width: 400, height: 300 },
        fallback
      );
      // viewportH=720, height=300, maxTop = 420
      expect(adjusted.top).toBe(420);
    });

    it('clamps a panel past the right edge back inside', () => {
      const fallback = new PanelService();
      const adjusted = PanelService.clampPanelOptionToViewport(
        { left: 1100, top: 100, width: 400, height: 300 },
        fallback
      );
      // viewportW=1280, width=400, maxLeft = 880
      expect(adjusted.left).toBe(880);
    });

    it('pins a panel larger than the viewport to the top left', () => {
      const fallback = new PanelService();
      const adjusted = PanelService.clampPanelOptionToViewport(
        { left: 100, top: 100, width: 2000, height: 1500 },
        fallback
      );
      expect(adjusted.left).toBe(0);
      expect(adjusted.top).toBe(0);
    });

    it('does nothing without a position', () => {
      const fallback = new PanelService();
      const adjusted = PanelService.clampPanelOptionToViewport({ width: 400, height: 300 }, fallback);
      expect(adjusted.left).toBeUndefined();
      expect(adjusted.top).toBeUndefined();
    });
  });

  describe('scrollable panel', () => {
    const elementOf = (name: string) => ({ name }) as unknown as HTMLDivElement;

    it('takes the default panel body when nobody claimed it', () => {
      const service = new PanelService();
      const body = elementOf('body');
      service.setDefaultScrollablePanel(body);
      expect(service.scrollablePanel).toBe(body);
    });

    it('keeps a claimed element even when the panel body arrives later', () => {
      const service = new PanelService();
      const log = elementOf('log');
      service.claimScrollablePanel(log);
      service.setDefaultScrollablePanel(elementOf('body'));
      expect(service.scrollablePanel).toBe(log);
    });

    it('lets a claim replace the panel body', () => {
      const service = new PanelService();
      const log = elementOf('log');
      service.setDefaultScrollablePanel(elementOf('body'));
      service.claimScrollablePanel(log);
      expect(service.scrollablePanel).toBe(log);
    });
  });
});
