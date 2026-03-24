import { ChangeDetectionStrategy, Component, effect, input, signal } from '@angular/core';

@Component({
  selector: 'badge',
  templateUrl: './badge.component.html',
  styleUrls: ['./badge.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BadgeComponent {
  readonly count = input(0);
  readonly animeState = signal<'active' | 'inactive'>('active');

  constructor() {
    effect(() => {
      this.count();
      this.animeState.set('inactive');
      queueMicrotask(() => this.animeState.set('active'));
    });
  }

  onBounceEnd() {
    this.animeState.set('inactive');
  }
}
