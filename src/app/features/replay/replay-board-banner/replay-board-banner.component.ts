import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ReplayPlaybackService } from '@axe/application/replay/replay-playback.service';
import { ReplayStagingService } from '@axe/application/replay/replay-staging.service';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'replay-board-banner',
  templateUrl: './replay-board-banner.component.html',
  imports: [TranslocoModule],
})
export class ReplayBoardBannerComponent {
  private readonly playback = inject(ReplayPlaybackService);
  private readonly staging = inject(ReplayStagingService);

  protected readonly isBoardMode = this.playback.isBoardMode;

  protected readonly isShown = computed(() => this.isBoardMode() && !this.staging.isStaging());

  protected async exit(): Promise<void> {
    await this.playback.exitBoardMode();
  }
}
