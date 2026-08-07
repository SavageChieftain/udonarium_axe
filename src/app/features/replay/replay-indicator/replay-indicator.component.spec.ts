import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReplayRecorderService } from '@axe/application/replay/replay-recorder.service';
import { WidgetVisibilityService } from '@axe/application/ui/widget-visibility.service';
import { ReplayDetailLevel } from '@axe/domain/replay/replay-event';
import { ReplayIndicatorComponent } from '@axe/features/replay/replay-indicator/replay-indicator.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('ReplayIndicatorComponent', () => {
  let fixture: ComponentFixture<ReplayIndicatorComponent>;
  let isRecording: ReturnType<typeof signal<boolean>>;
  let mark: ReturnType<typeof vi.fn>;
  let stop: ReturnType<typeof vi.fn>;
  let setDetailLevel: ReturnType<typeof vi.fn>;

  async function setup(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [ReplayIndicatorComponent],
      providers: [
        ...TEST_PROVIDERS,
        {
          provide: ReplayRecorderService,
          useValue: {
            isRecording: isRecording.asReadonly(),
            eventCount: signal(42).asReadonly(),
            startedAt: signal(Date.now() - 65_000).asReadonly(),
            detailLevel: signal(ReplayDetailLevel.Notable).asReadonly(),
            mark,
            stop,
            setDetailLevel,
          },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ReplayIndicatorComponent);
    fixture.detectChanges();
  }

  function pill(): HTMLButtonElement | null {
    return fixture.nativeElement.querySelector('button');
  }

  function buttonByText(text: string): HTMLButtonElement | undefined {
    return [...fixture.nativeElement.querySelectorAll('button')].find((button) =>
      (button as HTMLButtonElement).textContent?.includes(text)
    ) as HTMLButtonElement | undefined;
  }

  beforeEach(() => {
    localStorage.removeItem('ui-widgets');
    isRecording = signal(true);
    mark = vi.fn().mockResolvedValue(undefined);
    stop = vi.fn().mockResolvedValue(undefined);
    setDetailLevel = vi.fn();
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    localStorage.removeItem('ui-widgets');
  });

  it('記録中は経過を出すこと', async () => {
    await setup();
    expect(pill()?.textContent).toContain('00:01:05');
  });

  it('記録していなければ出ないこと', async () => {
    isRecording = signal(false);
    await setup();
    expect(pill()).toBeNull();
  });

  it('隠していれば出ないこと', async () => {
    await setup();
    TestBed.inject(WidgetVisibilityService).recording.set(false);
    fixture.detectChanges();
    expect(pill()).toBeNull();
  });

  it('押すまで操作を出さないこと', async () => {
    await setup();
    expect(fixture.nativeElement.querySelector('input')).toBeNull();

    pill()?.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input')).not.toBeNull();
  });

  it('見出しを入れて目印を打てること', async () => {
    await setup();
    pill()?.click();
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('input[type="text"]') as HTMLInputElement;
    input.value = '第二幕';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    buttonByText('目印')?.click();
    expect(mark).toHaveBeenCalledWith('第二幕');
  });

  it('見出しが空なら目印を打てないこと', async () => {
    await setup();
    pill()?.click();
    fixture.detectChanges();

    expect(buttonByText('目印')?.disabled).toBe(true);
  });

  it('記録を止められること', async () => {
    await setup();
    pill()?.click();
    fixture.detectChanges();

    buttonByText('記録を止める')?.click();
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('表示を消せること', async () => {
    await setup();
    pill()?.click();
    fixture.detectChanges();

    buttonByText('表示を消す')?.click();
    fixture.detectChanges();

    expect(TestBed.inject(WidgetVisibilityService).recording()).toBe(false);
    expect(pill()).toBeNull();
  });
});
