import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { TabletopService } from '@axe/application/tabletop/tabletop.service';
import { ModalService } from '@axe/application/ui/modal.service';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';
import { clampBoardPitch, MAX_BOARD_PITCH, MIN_BOARD_PITCH, WhiteBoard } from '@axe/domain/tabletop/white-board';
import {
  detachAllFrom,
  detachFromBoard,
  gatherOverBoard,
  standingOn,
} from '@axe/features/tabletop/white-board/white-board-contents';
import { FileSelecterComponent } from '@axe/ui/components/file-selecter/file-selecter.component';
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
  private readonly modalService = inject(ModalService);
  private readonly imageStorage = inject(ImageStorage);
  private readonly tabletopService = inject(TabletopService);
  private readonly objectChange = inject(ObjectChangeService);

  whiteBoard: WhiteBoard | null = null;

  /** Bumped by hand, since what stands on a board is not a list any one signal watches. */
  protected readonly revision = signal(0);

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

  get isDropShadow(): boolean {
    return this.whiteBoard?.isDropShadow ?? true;
  }
  set isDropShadow(value: boolean) {
    if (this.whiteBoard) this.whiteBoard.isDropShadow = value;
  }

  get isLock(): boolean {
    return this.whiteBoard?.isLock ?? false;
  }
  set isLock(value: boolean) {
    if (this.whiteBoard) this.whiteBoard.isLock = value;
  }

  get imageUrl(): string {
    this.revision();
    return this.whiteBoard?.imageFile?.url ?? '';
  }

  /** A plan of the floor above, or a photograph of the room, laid on the board itself. */
  chooseImage(): void {
    const board = this.whiteBoard;
    if (!board) return;
    this.modalService.open<string>(FileSelecterComponent, { isAllowedEmpty: true }).then((identifier) => {
      if (identifier == null) return;
      this.setImage(board, identifier);
    });
  }

  clearImage(): void {
    if (this.whiteBoard) this.setImage(this.whiteBoard, '');
  }

  private setImage(board: WhiteBoard, identifier: string): void {
    const element = board.imageDataElement?.getFirstElementByName('imageIdentifier');
    if (!element) return;
    element.value = identifier;
    board.update();
    this.touched();
  }

  /** What is standing on the board, so it can be taken off without hunting for it on the table. */
  get standing(): TabletopObject[] {
    this.revision();
    const board = this.whiteBoard;
    return board ? standingOn(board, this.overTheTable()) : [];
  }

  nameOf(object: TabletopObject): string {
    return object.name?.length ? object.name : object.aliasName;
  }

  takeOff(object: TabletopObject): void {
    const board = this.whiteBoard;
    if (!board) return;
    detachFromBoard(board, object);
    this.touched();
  }

  clearBoard(): void {
    const board = this.whiteBoard;
    if (!board) return;
    detachAllFrom(board, this.standing);
    this.touched();
  }

  gather(): void {
    const board = this.whiteBoard;
    if (!board) return;
    const grid = this.tabletopService.gridSize();
    gatherOverBoard(board, board.width * grid, board.height * grid, this.overTheTable());
    this.touched();
  }

  private overTheTable(): TabletopObject[] {
    return [
      ...this.tabletopService.characters,
      ...this.tabletopService.terrains,
      ...this.tabletopService.tableMasks,
      ...this.tabletopService.textNotes,
      ...this.tabletopService.cards,
      ...this.tabletopService.diceSymbols,
    ];
  }

  private touched(): void {
    this.revision.update((value) => value + 1);
    if (this.whiteBoard) this.objectChange.notifyChanged(this.whiteBoard.identifier);
  }
}

function clampSide(value: number): number {
  const side = Math.round(Number(value));
  if (!Number.isFinite(side)) return MIN_SIDE;
  return Math.min(MAX_SIDE, Math.max(MIN_SIDE, side));
}
