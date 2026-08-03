import { NgStyle } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CardTargetService, TargetArrow } from '@axe/application/card/card-target.service';

const ARROW_COLOR = 'rgba(255, 86, 86, 0.85)';
const SHAFT_THICKNESS = 6;
const HEAD_LENGTH = 26;
const HEAD_THICKNESS = 20;
const ARROW_LIFT = 4;

@Component({
  selector: 'table-target-overlay',
  templateUrl: './table-target-overlay.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  imports: [NgStyle],
})
export class TableTargetOverlayComponent {
  private readonly cardTargetService = inject(CardTargetService);

  readonly arrows = computed<TargetArrow[]>(() => this.cardTargetService.arrows());

  protected shaftStyle(arrow: TargetArrow): Record<string, string> {
    return {
      ...this.baseStyle(),
      width: Math.max(arrow.length - HEAD_LENGTH, 1) + 'px',
      height: SHAFT_THICKNESS + 'px',
      'border-radius': SHAFT_THICKNESS / 2 + 'px',
      background: ARROW_COLOR,
      transform: this.transform(arrow, 0),
    };
  }

  protected headStyle(arrow: TargetArrow): Record<string, string> {
    return {
      ...this.baseStyle(),
      width: HEAD_LENGTH + 'px',
      height: HEAD_THICKNESS + 'px',
      background: ARROW_COLOR,
      'clip-path': 'polygon(0 0, 100% 50%, 0 100%)',
      transform: this.transform(arrow, Math.max(arrow.length - HEAD_LENGTH, 1)),
    };
  }

  private baseStyle(): Record<string, string> {
    return {
      position: 'absolute',
      left: '0px',
      top: '0px',
      'transform-origin': '0 0',
      'pointer-events': 'none',
    };
  }

  private transform(arrow: TargetArrow, offsetX: number): string {
    return (
      'translate3d(' +
      arrow.x +
      'px, ' +
      arrow.y +
      'px, ' +
      (arrow.z + ARROW_LIFT) +
      'px) rotateZ(' +
      arrow.angle +
      'deg) translateX(' +
      offsetX +
      'px) translateY(-50%)'
    );
  }
}
