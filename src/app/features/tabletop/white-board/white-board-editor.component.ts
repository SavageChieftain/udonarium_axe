import { ChangeDetectionStrategy, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { TabletopService } from '@axe/application/tabletop/tabletop.service';
import { ModalService } from '@axe/application/ui/modal.service';
import { PanelService } from '@axe/application/ui/panel.service';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { boardSurfaceOf, TabletopObject } from '@axe/domain/tabletop/tabletop-object';
import { clampBoardPitch, MAX_BOARD_PITCH, MIN_BOARD_PITCH, WhiteBoard } from '@axe/domain/tabletop/white-board';
import { MapScene, sceneHeightPx, sceneWidthPx } from '@axe/features/map-editor/model/scene';
import {
  addImage,
  addShape,
  addStroke,
  addText,
  removeImage,
  removeText,
  updateImage,
  updateText,
} from '@axe/features/map-editor/model/scene-ops';
import { deserializeScene, serializeScene } from '@axe/features/map-editor/model/serialize';
import { getRasterImage, warmRasterImages } from '@axe/features/map-editor/render/raster-image';
import { renderScene } from '@axe/features/map-editor/render/render-scene';
import { detachFromBoard, standingOn } from '@axe/features/tabletop/white-board/white-board-contents';
import {
  BOARD_TOOLS,
  BoardPoint,
  BoardTool,
  boxBetween,
  createBoardScene,
  freehandLayer,
  imageLayer,
  markUnder,
  penStroke,
  rubOutStrokes,
  shapeLayer,
  stickerAt,
  straightLine,
  textLayer,
  wordsAt,
} from '@axe/features/tabletop/white-board/white-board-scene';
import { FileSelecterComponent } from '@axe/ui/components/file-selecter/file-selecter.component';
import { TranslocoModule } from '@jsverse/transloco';

/** How long the drawing has to settle before the board keeps a picture of it. */
const SAVE_DELAY = 600;
/** How big a sticker goes down, in the board's own pixels. */
const STICKER_SIZE = 120;
const MIN_SIDE = 1;
const MAX_SIDE = 40;

@Component({
  selector: 'white-board-editor',
  templateUrl: './white-board-editor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TranslocoModule],
})
export class WhiteBoardEditorComponent {
  private readonly modalService = inject(ModalService);
  private readonly imageStorage = inject(ImageStorage);
  private readonly tabletopService = inject(TabletopService);
  private readonly panelService = inject(PanelService);
  protected readonly t = inject(TRANSLATE_FN);

  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('board');

  readonly tools = BOARD_TOOLS;
  readonly tool = signal<BoardTool>('pen');
  readonly color = signal('#1a1a1a');
  readonly strokeWidth = signal(4);
  readonly fontSize = signal(24);

  protected readonly typing = signal<BoardPoint | null>(null);
  protected typedText = '';

  private board: WhiteBoard | null = null;
  private scene: MapScene = createBoardScene(4, 3, 50);
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private drawingPoints: number[] = [];
  private dragFrom: BoardPoint | null = null;
  private held: { kind: 'image' | 'text'; id: string; grabX: number; grabY: number } | null = null;

  readonly minPitch = MIN_BOARD_PITCH;
  readonly maxPitch = MAX_BOARD_PITCH;
  readonly minSide = MIN_SIDE;
  readonly maxSide = MAX_SIDE;

  /** Bumped by hand, since the board's own values are not signals. */
  protected readonly revision = signal(0);

  get name(): string {
    this.revision();
    return this.board?.name ?? '';
  }
  set name(value: string) {
    if (!this.board) return;
    this.board.name = value;
    this.panelService.title = value;
    this.settingChanged();
  }

  get width(): number {
    this.revision();
    return this.board?.width ?? 1;
  }
  set width(value: number) {
    if (this.board) this.board.width = clampSide(value);
    this.resized();
  }

  get height(): number {
    this.revision();
    return this.board?.height ?? 1;
  }
  set height(value: number) {
    if (this.board) this.board.height = clampSide(value);
    this.resized();
  }

  get pitch(): number {
    this.revision();
    return this.board?.pitch ?? 0;
  }
  set pitch(value: number) {
    if (this.board) this.board.pitch = clampBoardPitch(value);
    this.settingChanged();
  }

  get rotate(): number {
    this.revision();
    return this.board?.rotate ?? 0;
  }
  set rotate(value: number) {
    if (this.board) this.board.rotate = Math.round(Number(value)) % 360;
    this.settingChanged();
  }

  get opacityPercent(): number {
    this.revision();
    return Math.round((this.board?.opacity ?? 1) * 100);
  }
  set opacityPercent(value: number) {
    if (!this.board) return;
    this.board.opacity = Math.min(100, Math.max(0, Math.round(Number(value)))) / 100;
    this.board.update();
    this.settingChanged();
  }

  get boardColor(): string {
    this.revision();
    return this.board?.color ?? '#f4f1e8';
  }
  set boardColor(value: string) {
    if (this.board) this.board.color = value;
    this.settingChanged();
  }

  get isDropShadow(): boolean {
    this.revision();
    return this.board?.isDropShadow ?? true;
  }
  set isDropShadow(value: boolean) {
    if (this.board) this.board.isDropShadow = value;
    this.settingChanged();
  }

  get isLock(): boolean {
    this.revision();
    return this.board?.isLock ?? false;
  }
  set isLock(value: boolean) {
    if (this.board) this.board.isLock = value;
    this.settingChanged();
  }

  /** What is standing on the board, so it can be taken off without hunting for it. */
  get standing(): TabletopObject[] {
    this.revision();
    const board = this.board;
    if (!board) return [];
    return standingOn(board, [
      ...this.tabletopService.characters,
      ...this.tabletopService.terrains,
      ...this.tabletopService.tableMasks,
      ...this.tabletopService.textNotes,
      ...this.tabletopService.cards,
      ...this.tabletopService.diceSymbols,
    ]);
  }

  protected nameOf(object: TabletopObject): string {
    return object.name?.length ? object.name : object.aliasName;
  }

  protected takeOff(object: TabletopObject): void {
    if (!this.board || !boardSurfaceOf(object)) return;
    detachFromBoard(this.board, object);
    this.settingChanged();
  }

  private settingChanged(): void {
    this.revision.update((value) => value + 1);
  }

  /** A wider board is a wider sheet to write on, so the drawing is given the new room. */
  private resized(): void {
    const board = this.board;
    if (!board) return;
    const grid = this.tabletopService.gridSize();
    this.scene.cols = board.width;
    this.scene.rows = board.height;
    this.scene.cellPx = grid;
    this.settingChanged();
    this.touched();
  }

  bindToBoard(board: WhiteBoard): void {
    this.board = board;
    const grid = this.tabletopService.gridSize();
    this.scene =
      (board.scene ? deserializeScene(board.scene) : null) ?? createBoardScene(board.width, board.height, grid);
    queueMicrotask(() => {
      this.panelService.title = board.name;
      void this.redraw();
    });
  }

  get sceneWidth(): number {
    return sceneWidthPx(this.scene);
  }

  get sceneHeight(): number {
    return sceneHeightPx(this.scene);
  }

  protected choose(tool: BoardTool): void {
    this.tool.set(tool);
    if (tool === 'sticker') this.pickSticker();
  }

  /** Where on the board a pointer landed, whatever size the canvas is being shown at. */
  private pointOf(event: PointerEvent): BoardPoint {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) return { x: 0, y: 0 };
    const box = canvas.getBoundingClientRect();
    const scale = box.width / this.sceneWidth || 1;
    return { x: (event.clientX - box.left) / scale, y: (event.clientY - box.top) / scale };
  }

  protected onPointerDown(event: PointerEvent): void {
    if (!this.board) return;
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
    const at = this.pointOf(event);

    switch (this.tool()) {
      case 'pen':
        this.drawingPoints = [at.x, at.y];
        break;
      case 'eraser':
        this.rubOut(at);
        break;
      case 'line':
      case 'box':
      case 'ellipse':
        this.dragFrom = at;
        break;
      case 'text':
        this.typedText = '';
        this.typing.set(at);
        break;
      case 'select':
        this.take(at);
        break;
      case 'sticker':
        break;
    }
  }

  protected onPointerMove(event: PointerEvent): void {
    if (!this.board) return;
    const at = this.pointOf(event);
    if (this.tool() === 'pen' && this.drawingPoints.length > 0) {
      this.drawingPoints.push(at.x, at.y);
      void this.redraw(this.drawingPoints);
      return;
    }
    if (this.tool() === 'eraser' && event.buttons > 0) {
      this.rubOut(at);
      return;
    }
    if (this.held) {
      this.shift(at);
      return;
    }
    if (this.dragFrom) void this.redraw();
  }

  protected onPointerUp(event: PointerEvent): void {
    if (!this.board) return;
    const at = this.pointOf(event);

    if (this.tool() === 'pen' && this.drawingPoints.length > 3) {
      addStroke(freehandLayer(this.scene), penStroke([...this.drawingPoints], this.style()));
    }
    this.drawingPoints = [];

    if (this.dragFrom) {
      const from = this.dragFrom;
      this.dragFrom = null;
      const far = Math.hypot(at.x - from.x, at.y - from.y) > 4;
      if (far) {
        const tool = this.tool();
        const mark =
          tool === 'line'
            ? straightLine(from, at, this.style())
            : boxBetween(tool as 'box' | 'ellipse', from, at, this.style());
        addShape(shapeLayer(this.scene), mark);
      }
    }
    this.held = null;
    this.touched();
  }

  private style() {
    return { color: this.color(), width: this.strokeWidth(), fontSize: this.fontSize() };
  }

  private rubOut(at: BoardPoint): void {
    rubOutStrokes(freehandLayer(this.scene), at.x, at.y, this.strokeWidth() * 2);
    const mark = markUnder(this.scene, at);
    if (mark?.kind === 'image') removeImage(imageLayer(this.scene), mark.id);
    if (mark?.kind === 'text') removeText(textLayer(this.scene), mark.id);
    void this.redraw();
  }

  private take(at: BoardPoint): void {
    const mark = markUnder(this.scene, at);
    if (!mark) return;
    this.held = { ...mark, grabX: at.x, grabY: at.y };
  }

  private shift(at: BoardPoint): void {
    const held = this.held;
    if (!held) return;
    const dx = at.x - held.grabX;
    const dy = at.y - held.grabY;
    held.grabX = at.x;
    held.grabY = at.y;

    if (held.kind === 'image') {
      const item = imageLayer(this.scene).items.find((entry) => entry.id === held.id);
      if (item) updateImage(imageLayer(this.scene), held.id, { x: item.x + dx, y: item.y + dy });
    } else {
      const item = textLayer(this.scene).items.find((entry) => entry.id === held.id);
      if (item) updateText(textLayer(this.scene), held.id, { x: item.x + dx, y: item.y + dy });
    }
    void this.redraw();
  }

  protected commitText(): void {
    const at = this.typing();
    const words = this.typedText.trim();
    this.typing.set(null);
    this.typedText = '';
    if (!at || words.length < 1) return;
    addText(textLayer(this.scene), wordsAt(at, words, this.style()));
    this.touched();
  }

  private pickSticker(): void {
    this.modalService.open<string>(FileSelecterComponent, { isAllowedEmpty: true }).then((identifier) => {
      if (!identifier) return;
      const at = { x: this.sceneWidth / 2, y: this.sceneHeight / 2 };
      addImage(imageLayer(this.scene), stickerAt(at, identifier, STICKER_SIZE));
      this.tool.set('select');
      this.touched();
    });
  }

  protected clearBoard(): void {
    this.scene.layers = [];
    this.touched();
  }

  /** Draws the board as it stands, plus the stroke still under the pen. */
  private async redraw(pending?: number[]): Promise<void> {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) return;
    canvas.width = this.sceneWidth;
    canvas.height = this.sceneHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const urls = imageLayer(this.scene)
      .items.map((item) => this.imageStorage.get(item.imageIdentifier)?.url)
      .filter((url): url is string => !!url);
    if (urls.length > 0) await warmRasterImages(urls);

    renderScene(
      ctx,
      this.scene,
      {
        texturePattern: () => null,
        stampImage: () => null,
        rasterImage: (item) => {
          const url = this.imageStorage.get(item.imageIdentifier)?.url;
          return url ? getRasterImage(url) : null;
        },
      },
      { drawGrid: false }
    );

    if (pending && pending.length > 3) {
      ctx.strokeStyle = this.color();
      ctx.lineWidth = this.strokeWidth();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(pending[0], pending[1]);
      for (let i = 2; i < pending.length; i += 2) ctx.lineTo(pending[i], pending[i + 1]);
      ctx.stroke();
    }
  }

  /** Kept once the drawing settles, since a single stroke is a hundred changes on its own. */
  private touched(): void {
    void this.redraw();
    if (this.saveTimer !== null) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      void this.save();
    }, SAVE_DELAY);
  }

  private async save(): Promise<void> {
    const board = this.board;
    const canvas = this.canvasRef()?.nativeElement;
    if (!board || !canvas) return;
    board.scene = serializeScene(this.scene);

    const blob = await new Promise<Blob | null>((resolve) => {
      if (typeof canvas.toBlob !== 'function') resolve(null);
      else canvas.toBlob((made) => resolve(made), 'image/webp', 0.92);
    });
    if (!blob) {
      board.update();
      return;
    }

    const file = await this.imageStorage.addAsync(blob);
    const element = board.imageDataElement?.getFirstElementByName('imageIdentifier');
    const worn = element?.value;
    if (element) element.value = file.identifier;
    board.update();
    // The picture the board wore before this edit is worn by nothing now.
    if (typeof worn === 'string' && worn && worn !== file.identifier) this.imageStorage.delete(worn);
  }
}

function clampSide(value: number): number {
  const side = Math.round(Number(value));
  if (!Number.isFinite(side)) return MIN_SIDE;
  return Math.min(MAX_SIDE, Math.max(MIN_SIDE, side));
}
