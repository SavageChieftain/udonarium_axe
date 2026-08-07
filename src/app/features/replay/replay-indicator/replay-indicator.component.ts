import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RolePermissionService } from '@axe/application/permission/role-permission.service';
import { ReplayRecorderService } from '@axe/application/replay/replay-recorder.service';
import { WidgetVisibilityService } from '@axe/application/ui/widget-visibility.service';
import { ReplayDetailLevel } from '@axe/domain/replay/replay-event';
import { formatReplayElapsed } from '@axe/features/replay/replay-log-line';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-replay-indicator',
  templateUrl: './replay-indicator.component.html',
  imports: [TranslocoModule],
})
export class ReplayIndicatorComponent {
  private readonly recorder = inject(ReplayRecorderService);
  private readonly rolePermission = inject(RolePermissionService);
  protected readonly widgets = inject(WidgetVisibilityService);

  protected readonly detailLevels = [ReplayDetailLevel.ChatOnly, ReplayDetailLevel.Notable, ReplayDetailLevel.Full];

  protected readonly isRecording = this.recorder.isRecording;
  protected readonly eventCount = this.recorder.eventCount;
  protected readonly detailLevel = this.recorder.detailLevel;

  protected readonly isOpen = signal(false);
  protected readonly markLabel = signal('');

  protected readonly elapsed = computed(() => {
    this.eventCount();
    return formatReplayElapsed(this.isRecording() ? Date.now() - this.recorder.startedAt() : 0);
  });

  protected get canEdit(): boolean {
    return this.rolePermission.canEditTabletop;
  }

  protected toggle(): void {
    this.isOpen.update((open) => !open);
  }

  protected close(): void {
    this.isOpen.set(false);
  }

  protected hide(): void {
    this.isOpen.set(false);
    this.widgets.recording.set(false);
  }

  protected setDetailLevel(level: string): void {
    this.recorder.setDetailLevel(level as ReplayDetailLevel);
  }

  protected async mark(): Promise<void> {
    const label = this.markLabel().trim();
    if (!this.canEdit || !this.isRecording() || label.length < 1) return;
    this.markLabel.set('');
    await this.recorder.mark(label);
  }

  protected async stop(): Promise<void> {
    if (!this.canEdit) return;
    this.isOpen.set(false);
    await this.recorder.stop();
  }
}
