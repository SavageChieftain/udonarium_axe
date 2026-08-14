import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WidgetVisibilityService } from '@axe/application/ui/widget-visibility.service';
import { DigitalClockComponent } from '@axe/features/widgets/digital-clock/digital-clock.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';
import { beforeEach, describe, expect, it } from 'vitest';

describe('DigitalClockComponent', () => {
  let fixture: ComponentFixture<DigitalClockComponent>;
  let component: DigitalClockComponent;
  let widgets: WidgetVisibilityService;

  function clock(): HTMLElement | null {
    return fixture.nativeElement.querySelector('.digital-clock');
  }

  async function render(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
  }

  beforeEach(() => {
    localStorage.removeItem('ui-widget-layout');
  });

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [DigitalClockComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
    fixture = TestBed.createComponent(DigitalClockComponent);
    component = fixture.componentInstance;
    widgets = TestBed.inject(WidgetVisibilityService);
  });

  it('draws nothing while it is switched off', async () => {
    widgets.clock.set(false);
    await render();

    expect(clock()).toBeNull();
  });

  it('shows the time and the date once it is switched on', async () => {
    widgets.clock.set(true);
    await render();

    const el = clock();
    expect(el).not.toBeNull();
    expect(el!.textContent).toContain(component['parts']().hoursMinutes);
    expect(el!.textContent).toContain(component['parts']().date);
  });

  it('switches it off from the close button', async () => {
    widgets.clock.set(true);
    await render();

    (component as unknown as { close: () => void }).close();
    await render();

    expect(widgets.clock()).toBe(false);
    expect(clock()).toBeNull();
  });

  it('comes back where it was dragged to', async () => {
    widgets.clock.set(true);
    await render();

    const el = clock();
    expect(el).not.toBeNull();
    el!.style.left = '240px';
    el!.style.top = '120px';

    widgets.clock.set(false);
    await render();
    widgets.clock.set(true);
    await render();

    const restored = clock();
    expect(restored).not.toBeNull();
    expect(restored!.style.left).toBe('240px');
    expect(restored!.style.top).toBe('120px');
  });
});
