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
