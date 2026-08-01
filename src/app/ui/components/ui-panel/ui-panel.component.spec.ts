import { ComponentFixture, TestBed } from '@angular/core/testing';
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

  describe('狭い画面', () => {
    function panel(): HTMLElement {
      return fixture.nativeElement.querySelector('.draggable-panel');
    }

    function setCompact(isCompact: boolean): void {
      const viewport = TestBed.inject(ViewportService);
      (viewport as unknown as { _isCompact: { set(value: boolean): void } })._isCompact.set(isCompact);
      fixture.detectChanges();
    }

    it('画面いっぱいに広げる', () => {
      setCompact(true);

      expect(panel().classList.contains('inset-0!')).toBe(true);
      expect(panel().classList.contains('w-screen!')).toBe(true);
      expect(panel().style.height).toContain('100dvh');
    });

    it('広い画面では広げない', () => {
      setCompact(false);

      expect(panel().classList.contains('inset-0!')).toBe(false);
      expect(panel().classList.contains('w-screen!')).toBe(false);
    });

    it('最小化と全画面のボタンを出さない', () => {
      setCompact(true);
      const icons = [...fixture.nativeElement.querySelectorAll('.material-icons')].map((el) =>
        (el as HTMLElement).textContent?.trim()
      );

      expect(icons).not.toContain('remove');
      expect(icons).not.toContain('fullscreen');
      expect(icons).toContain('close');
    });
  });

  it('global dragging 中は panel を pointer-events-none にすること', () => {
    const pointerDeviceService = TestBed.inject(PointerDeviceService);
    pointerDeviceService.isDragging = true;

    fixture.detectChanges();

    const panel = fixture.nativeElement.querySelector('.draggable-panel');
    expect(panel.classList.contains('pointer-events-none')).toBe(true);
  });

  it('global dragging が解除されたら panel の pointer-events-none も解除されること', async () => {
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
    it('通常状態では draggable-panel の zIndex が 201 でないこと', () => {
      fixture.detectChanges();

      const panel = fixture.nativeElement.querySelector('.draggable-panel') as HTMLElement;
      expect(panel.style.zIndex).not.toBe('201');
    });

    it('fullscreen 状態では draggable-panel の zIndex が 201 になること', () => {
      fixture.detectChanges();
      component.isFullScreen.set(true);
      fixture.detectChanges();

      const panel = fixture.nativeElement.querySelector('.draggable-panel') as HTMLElement;
      expect(panel.style.zIndex).toBe('201');
    });

    it('fullscreen 解除後は draggable-panel の zIndex が 201 でなくなること', () => {
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
    it('timerCheckWindowSize が clearInterval でクリアされる', () => {
      const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
      const priv = component as unknown as { timerCheckWindowSize: ReturnType<typeof setInterval> | null };
      priv.timerCheckWindowSize = setInterval(() => {}, 999_999);

      fixture.destroy();

      expect(clearIntervalSpy).toHaveBeenCalled();
      expect(priv.timerCheckWindowSize).toBeNull();
    });
  });
});
