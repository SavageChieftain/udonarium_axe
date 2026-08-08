import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReplayPlaybackService } from '@axe/application/replay/replay-playback.service';
import { ReplayPreferenceService, ReplayStartMode } from '@axe/application/replay/replay-preference.service';
import { ReplayRecorderService } from '@axe/application/replay/replay-recorder.service';
import { WidgetVisibilityService } from '@axe/application/ui/widget-visibility.service';
import { Network } from '@axe/core/network/network';
import { ReplayDetailLevel } from '@axe/domain/replay/replay-event';
import { ReplayIndicatorComponent } from '@axe/features/replay/replay-indicator/replay-indicator.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('ReplayIndicatorComponent', () => {
  let fixture: ComponentFixture<ReplayIndicatorComponent>;
  let isRecording: ReturnType<typeof signal<boolean>>;
  let mark: ReturnType<typeof vi.fn>;
  let stop: ReturnType<typeof vi.fn>;
  let start: ReturnType<typeof vi.fn>;
  let setDetailLevel: ReturnType<typeof vi.fn>;
  let isSupported = true;
  let isBoardMode: ReturnType<typeof signal<boolean>>;

  async function setup(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [ReplayIndicatorComponent],
      providers: [
        ...TEST_PROVIDERS,
        { provide: ReplayPlaybackService, useValue: { isBoardMode: isBoardMode.asReadonly() } },
        {
          provide: ReplayRecorderService,
          useValue: {
            isRecording: isRecording.asReadonly(),
            eventCount: signal(42).asReadonly(),
            startedAt: signal(Date.now() - 65_000).asReadonly(),
            detailLevel: signal(ReplayDetailLevel.Notable).asReadonly(),
            get isSupported() {
              return isSupported;
            },
            mark,
            stop,
            start,
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
    localStorage.removeItem('axe-replay-preference');
    isRecording = signal(true);
    isBoardMode = signal(false);
    isSupported = true;
    mark = vi.fn().mockResolvedValue(undefined);
    stop = vi.fn().mockResolvedValue(undefined);
    start = vi.fn().mockResolvedValue(true);
    vi.spyOn(Network, 'peerContext', 'get').mockReturnValue({ roomName: '第一夜' } as never);
    setDetailLevel = vi.fn();
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    localStorage.removeItem('ui-widgets');
    localStorage.removeItem('axe-replay-preference');
    vi.restoreAllMocks();
  });

  it('記録中は経過を出すこと', async () => {
    await setup();
    expect(pill()?.textContent).toContain('00:01:05');
  });

  it('記録していなくても卓にいれば出ること', async () => {
    isRecording = signal(false);
    await setup();
    expect(pill()?.textContent).toContain('記録なし');
  });

  it('記録の盤面を映しているあいだは始められないこと', async () => {
    isRecording = signal(false);
    isBoardMode = signal(true);
    await setup();

    pill()?.click();
    fixture.detectChanges();

    const button = buttonByText('始める') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    button.click();
    expect(start).not.toHaveBeenCalled();
  });

  it('部屋がなくても出ること', async () => {
    isRecording = signal(false);
    vi.spyOn(Network, 'peerContext', 'get').mockReturnValue({ roomName: '' } as never);
    await setup();
    expect(pill()?.textContent).toContain('記録なし');
  });

  it('保存できない環境では出ないこと', async () => {
    isRecording = signal(false);
    isSupported = false;
    await setup();
    expect(pill()).toBeNull();
  });

  it('始める前に細かさを選べること', async () => {
    isRecording = signal(false);
    await setup();
    pill()?.click();
    fixture.detectChanges();

    const level = fixture.nativeElement.querySelectorAll('select')[0] as HTMLSelectElement;
    level.value = 'full';
    level.dispatchEvent(new Event('change'));

    expect(setDetailLevel).toHaveBeenCalledWith('full');
    expect(buttonByText('記録を始める')).toBeDefined();
  });

  it('記録を始められること', async () => {
    isRecording = signal(false);
    await setup();
    pill()?.click();
    fixture.detectChanges();

    buttonByText('記録を始める')?.click();
    expect(start).toHaveBeenCalledTimes(1);
  });

  it('始め方を選んで覚えさせられること', async () => {
    isRecording = signal(false);
    await setup();
    pill()?.click();
    fixture.detectChanges();

    const mode = fixture.nativeElement.querySelectorAll('select')[1] as HTMLSelectElement;
    mode.value = ReplayStartMode.Manual;
    mode.dispatchEvent(new Event('change'));

    expect(TestBed.inject(ReplayPreferenceService).startMode()).toBe(ReplayStartMode.Manual);
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
