import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReplayPlaybackService } from '@axe/application/replay/replay-playback.service';
import { ReplayStagingService } from '@axe/application/replay/replay-staging.service';
import { ReplayBoardBannerComponent } from '@axe/features/replay/replay-board-banner/replay-board-banner.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('ReplayBoardBannerComponent', () => {
  let fixture: ComponentFixture<ReplayBoardBannerComponent>;
  let isBoardMode: ReturnType<typeof signal<boolean>>;
  let isStaging: ReturnType<typeof signal<boolean>>;
  let exitBoardMode: ReturnType<typeof vi.fn>;

  async function setup(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [ReplayBoardBannerComponent],
      providers: [
        ...TEST_PROVIDERS,
        { provide: ReplayPlaybackService, useValue: { isBoardMode: isBoardMode.asReadonly(), exitBoardMode } },
        { provide: ReplayStagingService, useValue: { isStaging: isStaging.asReadonly() } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ReplayBoardBannerComponent);
    fixture.detectChanges();
  }

  function banner(): HTMLElement | null {
    return fixture.nativeElement.querySelector('button')?.closest('div') ?? null;
  }

  beforeEach(() => {
    isBoardMode = signal(false);
    isStaging = signal(false);
    exitBoardMode = vi.fn().mockResolvedValue(undefined);
  });

  it('卓を預かっていないうちは何も出さないこと', async () => {
    await setup();
    expect(fixture.nativeElement.textContent.trim()).toBe('');
  });

  it('卓を預かっているあいだは告げ続けること', async () => {
    isBoardMode = signal(true);
    await setup();
    expect(fixture.nativeElement.textContent).toContain('記録の盤面を映しています');
    expect(fixture.nativeElement.textContent).toContain('同卓者に届きません');
  });

  it('盤面に枠を出すこと', async () => {
    isBoardMode = signal(true);
    await setup();
    expect(fixture.nativeElement.querySelector('.border-amber-500\\/60')).not.toBeNull();
  });

  it('一押しで卓に戻せること', async () => {
    isBoardMode = signal(true);
    await setup();
    banner()?.querySelector('button')?.click();
    expect(exitBoardMode).toHaveBeenCalledTimes(1);
  });

  it('収録中は収録バナーに譲ること', async () => {
    isBoardMode = signal(true);
    isStaging = signal(true);
    await setup();

    expect(fixture.nativeElement.textContent).not.toContain('記録の盤面を映しています');
    expect(fixture.nativeElement.querySelector('.border-amber-500\\/60')).not.toBeNull();
  });
});
