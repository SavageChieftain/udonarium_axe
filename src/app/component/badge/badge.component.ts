import { Component, Input, OnChanges } from '@angular/core';

@Component({
  selector: 'badge',
  templateUrl: './badge.component.html',
  styleUrls: ['./badge.component.css'],
})
export class BadgeComponent implements OnChanges {
  @Input() count: number = 0;
  animeState: 'active' | 'inactive' = 'active';

  ngOnChanges() {
    this.animeState = 'inactive';
    setTimeout(() => {
      this.animeState = 'active';
    });
  }

  onBounceEnd() {
    this.animeState = 'inactive';
  }
}
