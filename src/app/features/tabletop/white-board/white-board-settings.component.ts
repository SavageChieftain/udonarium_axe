import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { clampBoardPitch, MAX_BOARD_PITCH, MIN_BOARD_PITCH, WhiteBoard } from '@axe/domain/tabletop/white-board';
import { TranslocoModule } from '@jsverse/transloco';

const MIN_SIDE = 1;
const MAX_SIDE = 40;

@Component({
  selector: 'white-board-settings',
  templateUrl: './white-board-settings.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TranslocoModule],
})
export class WhiteBoardSettingsComponent {
  whiteBoard: WhiteBoard | null = null;

  readonly minPitch = MIN_BOARD_PITCH;
  readonly maxPitch = MAX_BOARD_PITCH;
  readonly minSide = MIN_SIDE;
  readonly maxSide = MAX_SIDE;

  get width(): number {
    return this.whiteBoard?.width ?? 1;
  }
  set width(value: number) {
    if (this.whiteBoard) this.whiteBoard.width = clampSide(value);
  }

  get height(): number {
    return this.whiteBoard?.height ?? 1;
  }
  set height(value: number) {
    if (this.whiteBoard) this.whiteBoard.height = clampSide(value);
  }

  get pitch(): number {
    return this.whiteBoard?.pitch ?? 0;
  }
  set pitch(value: number) {
    if (this.whiteBoard) this.whiteBoard.pitch = clampBoardPitch(value);
  }

  get rotate(): number {
    return this.whiteBoard?.rotate ?? 0;
  }
  set rotate(value: number) {
    if (this.whiteBoard) this.whiteBoard.rotate = Math.round(Number(value)) % 360;
  }

  /** Shown as a percentage, since a board at 0.35 means nothing to anyone. */
  get opacityPercent(): number {
    return Math.round((this.whiteBoard?.opacity ?? 1) * 100);
  }
  set opacityPercent(value: number) {
    if (!this.whiteBoard) return;
    const percent = Math.min(100, Math.max(0, Math.round(Number(value))));
    this.whiteBoard.opacity = percent / 100;
    this.whiteBoard.update();
  }

  get color(): string {
    return this.whiteBoard?.color ?? '#f4f1e8';
  }
  set color(value: string) {
    if (this.whiteBoard) this.whiteBoard.color = value;
  }

  get name(): string {
    return this.whiteBoard?.name ?? '';
  }
  set name(value: string) {
    if (this.whiteBoard) this.whiteBoard.name = value;
  }
}

function clampSide(value: number): number {
  const side = Math.round(Number(value));
  if (!Number.isFinite(side)) return MIN_SIDE;
  return Math.min(MAX_SIDE, Math.max(MIN_SIDE, side));
}
