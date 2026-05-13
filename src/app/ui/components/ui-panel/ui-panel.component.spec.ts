import { ComponentFixture, TestBed } from '@angular/core/testing';
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
