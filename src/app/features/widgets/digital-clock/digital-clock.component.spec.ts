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

  it('表示が off のあいだは何も描かない', async () => {
    widgets.clock.set(false);
    await render();

    expect(clock()).toBeNull();
  });

  it('表示を on にすると時計が現れ、時刻と日付を並べる', async () => {
    widgets.clock.set(true);
    await render();

    const el = clock();
    expect(el).not.toBeNull();
    expect(el!.textContent).toContain(component['parts']().hoursMinutes);
    expect(el!.textContent).toContain(component['parts']().date);
  });

  it('閉じるボタンは表示状態を off にする', async () => {
    widgets.clock.set(true);
    await render();

    (component as unknown as { close: () => void }).close();
    await render();

    expect(widgets.clock()).toBe(false);
    expect(clock()).toBeNull();
  });

  it('ドラッグした位置を再表示のときに保つ', async () => {
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
