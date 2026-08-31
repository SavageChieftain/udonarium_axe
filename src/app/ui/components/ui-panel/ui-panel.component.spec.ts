import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PanelService } from '@axe/application/ui/panel.service';
import { ViewportService } from '@axe/application/ui/viewport.service';
import { PointerDeviceService } from '@axe/core/input/pointer-device.service';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';
import { UIPanelComponent } from '@axe/ui/components/ui-panel/ui-panel.component';

describe('UIPanelComponent', () => {
  let component: UIPanelComponent;
  let fixture: ComponentFixture<UIPanelComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [UIPanelComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UIPanelComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('the buttons the content puts in the bar', () => {
    function controls(): HTMLButtonElement[] {
      return [...fixture.nativeElement.querySelectorAll('.material-icons')]
        .filter((icon) => icon.textContent === 'inventory')
        .map((icon) => icon.closest('button') as HTMLButtonElement);
    }

    it('draws one for each the content asked for, and presses it', () => {
      const press = vi.fn();
      component.panelService.headerControls.set([{ icon: 'inventory', label: '荷物', active: false, press }]);
      fixture.detectChanges();

      expect(controls()).toHaveLength(1);
      expect(controls()[0].title).toBe('荷物');

      controls()[0].click();

      expect(press).toHaveBeenCalled();
    });

    it('shows which of them is on', () => {
      component.panelService.headerControls.set([
        { icon: 'inventory', label: '荷物', active: true, press: () => undefined },
      ]);
      fixture.detectChanges();

      expect(controls()[0].getAttribute('aria-pressed')).toBe('true');
    });
  });

  describe('shrinking when the content asks', () => {
    it('shrinks the panel when the content asks', () => {
      fixture.detectChanges();

      component.panelService.minimizeRequest$.emit(true);
      fixture.detectChanges();

      expect(component.isMinimized()).toBe(true);
      expect(component.panelService.isMinimized()).toBe(true);
    });

    it('lets it out again', () => {
      fixture.detectChanges();
      component.panelService.minimizeRequest$.emit(true);

      component.panelService.minimizeRequest$.emit(false);
      fixture.detectChanges();

      expect(component.isMinimized()).toBe(false);
    });

    it('does nothing when it is already the way it was asked for', () => {
      fixture.detectChanges();
      component.panelService.minimizeRequest$.emit(true);
      const height = component.height;

      component.panelService.minimizeRequest$.emit(true);

      expect(component.isMinimized()).toBe(true);
      expect(component.height).toBe(height);
    });
  });

  describe('a panel with its box taken off', () => {
    function panel(): HTMLElement {
      return fixture.nativeElement.querySelector('.draggable-panel');
    }

    function titleBar(): HTMLElement {
      return panel().firstElementChild as HTMLElement;
    }

    it('keeps its ground until it is asked to go', () => {
      fixture.detectChanges();

      expect(component.unboxed).toBe(false);
      expect(titleBar().style.background).toBe('');
    });

    it('drops the ground under itself and under its bar', () => {
      component.panelService.isGhost.set(true);
      fixture.detectChanges();

      expect(component.unboxed).toBe(true);
      expect(panel().classList.contains('bg-transparent!')).toBe(true);
      expect(titleBar().style.background).toBe('transparent');
    });

    it('leaves the buttons to be found, since nothing else is left to take hold of', () => {
      component.panelService.isGhost.set(true);
      fixture.detectChanges();

      const buttons = fixture.nativeElement.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(0);
      expect((buttons[0].parentElement as HTMLElement).className).toContain('bg-black/60');
    });
  });

  describe('the bar that fades a panel', () => {
    const STORAGE_KEY = 'ui-panel-transparency';

    beforeEach(() => localStorage.removeItem(STORAGE_KEY));
    afterEach(() => localStorage.removeItem(STORAGE_KEY));

    function panel(): HTMLElement {
      return fixture.nativeElement.querySelector('.draggable-panel');
    }

    function bar(): HTMLInputElement | null {
      return fixture.nativeElement.querySelector('[data-testid="panel-transparency"]');
    }

    it('leaves a panel as it is until the bar is moved', () => {
      fixture.detectChanges();

      expect(component.panelOpacity()).toBe(1);
      expect(panel().style.opacity).toBe('');
    });

    it('fades the panel as the bar goes up', () => {
      component.setTransparency(50);
      fixture.detectChanges();

      expect(component.panelOpacity()).toBeCloseTo(0.625, 5);
      expect(Number(panel().style.opacity)).toBeCloseTo(0.625, 5);
    });

    it('still leaves a panel to be seen at the far end of the bar', () => {
      component.setTransparency(100);
      fixture.detectChanges();

      expect(component.panelOpacity()).toBe(0.25);
      expect(Number(panel().style.opacity)).toBeGreaterThan(0);
    });

    it('holds a panel whole while it has the focus, and lets it fade once that goes', () => {
      component.setTransparency(100);
      fixture.detectChanges();

      panel().dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      fixture.detectChanges();
      expect(component.panelOpacity()).toBe(1);
      expect(panel().style.opacity).toBe('');

      panel().dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
      fixture.detectChanges();
      expect(component.panelOpacity()).toBe(0.25);
    });

    it("keeps the focus while it moves between the panel's own parts", () => {
      component.setTransparency(100);
      fixture.detectChanges();
      panel().dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

      panel().dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: bar() }));
      fixture.detectChanges();

      expect(component.panelOpacity()).toBe(1);
    });

    it('shows what the bar is set to while the bar is the thing being used', () => {
      component.setTransparency(100);
      panel().dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      fixture.detectChanges();
      const input = bar()!;

      input.dispatchEvent(new FocusEvent('focus'));
      fixture.detectChanges();
      expect(component.panelOpacity()).toBe(0.25);

      input.dispatchEvent(new FocusEvent('blur'));
      fixture.detectChanges();
      expect(component.panelOpacity()).toBe(1);
    });

    it('holds the bar to its own two ends', () => {
      component.setTransparency(140);
      expect(component.transparency()).toBe(100);

      component.setTransparency(-20);
      expect(component.transparency()).toBe(0);

      component.setTransparency(Number.NaN);
      expect(component.transparency()).toBe(0);
    });

    it('takes what the reader drags the bar to', () => {
      fixture.detectChanges();
      const input = bar()!;

      input.value = '75';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(component.transparency()).toBe(75);
    });

    function openAs(kind: string) {
      const opened = TestBed.createComponent(UIPanelComponent);
      opened.debugElement.injector.get(PanelService).panelKind.set(kind);
      opened.detectChanges();
      return opened;
    }

    it('opens the next panel of the same kind where the bar was left', () => {
      fixture.debugElement.injector.get(PanelService).panelKind.set('chat-window');
      component.setTransparency(70);

      expect(openAs('chat-window').componentInstance.transparency()).toBe(70);
      expect(localStorage.getItem(STORAGE_KEY)).toBe('{"chat-window":70}');
    });

    it('leaves the other kinds of panel as they were', () => {
      fixture.debugElement.injector.get(PanelService).panelKind.set('chat-window');
      component.setTransparency(70);

      expect(openAs('game-character-sheet').componentInstance.transparency()).toBe(0);
    });

    it('leaves the bar out where a panel fills the screen', () => {
      const viewport = TestBed.inject(ViewportService);
      (viewport as unknown as { _isCompact: { set(value: boolean): void } })._isCompact.set(true);
      fixture.detectChanges();

      expect(bar()).toBeNull();
    });
  });

  describe('without a frame', () => {
    function panel(): HTMLElement {
      return fixture.nativeElement.querySelector('.draggable-panel');
    }

    function titleBar(): HTMLElement {
      return fixture.nativeElement.querySelector('.bg-ui-titlebar');
    }

    function setFrameless(frameless: boolean): void {
      fixture.debugElement.injector.get(PanelService).frameless = frameless;
      fixture.detectChanges();
    }

    it('drops the box and the title bar', () => {
      setFrameless(true);

      expect(titleBar().style.display).toBe('none');
      expect(panel().classList.contains('bg-transparent!')).toBe(true);
      expect(panel().classList.contains('border-transparent!')).toBe(true);
      expect(panel().classList.contains('shadow-none!')).toBe(true);
    });

    it('lets what is under it be clicked', () => {
      setFrameless(true);

      expect(panel().style.pointerEvents).toBe('none');
    });

    it('keeps the box and the title bar otherwise', () => {
      setFrameless(false);

      expect(titleBar().style.display).toBe('');
      expect(panel().classList.contains('bg-transparent!')).toBe(false);
      expect(panel().style.pointerEvents).toBe('');
    });
  });

  describe('on a narrow screen', () => {
    function panel(): HTMLElement {
      return fixture.nativeElement.querySelector('.draggable-panel');
    }

    function setCompact(isCompact: boolean): void {
      const viewport = TestBed.inject(ViewportService);
      (viewport as unknown as { _isCompact: { set(value: boolean): void } })._isCompact.set(isCompact);
      fixture.detectChanges();
    }

    it('fills the screen', () => {
      setCompact(true);

      expect(panel().classList.contains('inset-0!')).toBe(true);
      expect(panel().classList.contains('w-screen!')).toBe(true);
      expect(panel().style.height).toContain('100dvh');
    });

    it('does not fill a wide screen', () => {
      setCompact(false);

      expect(panel().classList.contains('inset-0!')).toBe(false);
      expect(panel().classList.contains('w-screen!')).toBe(false);
    });

    it('hides the minimise and fullscreen buttons', () => {
      setCompact(true);
      const icons = [...fixture.nativeElement.querySelectorAll('.material-icons')].map((el) =>
        (el as HTMLElement).textContent?.trim()
      );

      expect(icons).not.toContain('remove');
      expect(icons).not.toContain('fullscreen');
      expect(icons).toContain('close');
    });
  });

  it('makes the panel ignore the pointer while anything is being dragged', () => {
    const pointerDeviceService = TestBed.inject(PointerDeviceService);
    pointerDeviceService.isDragging = true;

    fixture.detectChanges();

    const panel = fixture.nativeElement.querySelector('.draggable-panel');
    expect(panel.classList.contains('pointer-events-none')).toBe(true);
  });

  it('gives the panel the pointer back when the drag ends', async () => {
    const pointerDeviceService = TestBed.inject(PointerDeviceService);

    fixture.detectChanges();
    pointerDeviceService.isDragging = true;
    await fixture.whenStable();

    let panel = fixture.nativeElement.querySelector('.draggable-panel');
    expect(panel.classList.contains('pointer-events-none')).toBe(true);

    pointerDeviceService.isDragging = false;
    await fixture.whenStable();

    panel = fixture.nativeElement.querySelector('.draggable-panel');
    expect(panel.classList.contains('pointer-events-none')).toBe(false);
  });

  describe('fullscreen z-index', () => {
    it('leaves the panel below 201 normally', () => {
      fixture.detectChanges();

      const panel = fixture.nativeElement.querySelector('.draggable-panel') as HTMLElement;
      expect(panel.style.zIndex).not.toBe('201');
    });

    it('raises the panel to 201 in fullscreen', () => {
      fixture.detectChanges();
      component.isFullScreen.set(true);
      fixture.detectChanges();

      const panel = fixture.nativeElement.querySelector('.draggable-panel') as HTMLElement;
      expect(panel.style.zIndex).toBe('201');
    });

    it('drops the panel back below 201 when fullscreen ends', () => {
      fixture.detectChanges();
      component.isFullScreen.set(true);
      fixture.detectChanges();
      component.isFullScreen.set(false);
      fixture.detectChanges();

      const panel = fixture.nativeElement.querySelector('.draggable-panel') as HTMLElement;
      expect(panel.style.zIndex).not.toBe('201');
    });
  });

  describe('timerCheckWindowSize cleanup', () => {
    it('clears the window size timer on teardown', () => {
      const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
      const priv = component as unknown as { timerCheckWindowSize: ReturnType<typeof setInterval> | null };
      priv.timerCheckWindowSize = setInterval(() => {}, 999_999);

      fixture.destroy();

      expect(clearIntervalSpy).toHaveBeenCalled();
      expect(priv.timerCheckWindowSize).toBeNull();
    });
  });
});
