import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { TabletopService } from '@axe/application/tabletop/tabletop.service';
import { ModalService } from '@axe/application/ui/modal.service';
import { PanelService } from '@axe/application/ui/panel.service';
import { ViewportService } from '@axe/application/ui/viewport.service';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { boardSurfaceOf, TabletopObject } from '@axe/domain/tabletop/tabletop-object';
import {
  clampBoardPitch,
  MAX_BOARD_PITCH,
  MIN_BOARD_PITCH,
  setBoardHeightKeepingFoot,
  WhiteBoard,
} from '@axe/domain/tabletop/white-board';
import { ShapeGeneratorKind } from '@axe/features/map-editor/model/editor-tool';
import { SceneHistory } from '@axe/features/map-editor/model/history';
import { createLayer, MapLayer, MapScene, sceneHeightPx, sceneWidthPx } from '@axe/features/map-editor/model/scene';
import {
  addImage,
  addLayer,
  addShape,
  addStroke,
  addText,
  moveLayer,
  removeImage,
  removeLayer,
  removeText,
} from '@axe/features/map-editor/model/scene-ops';
import { deserializeScene, serializeScene } from '@axe/features/map-editor/model/serialize';
import { getRasterImage, warmRasterImages } from '@axe/features/map-editor/render/raster-image';
import { renderScene } from '@axe/features/map-editor/render/render-scene';
import { detachFromBoard, standingOn } from '@axe/features/tabletop/white-board/white-board-contents';
import {
  arrowBetween,
  BOARD_SHAPES,
  BOARD_TOOLS,
  BoardPoint,
  BoardTool,
  boxOf,
  copyMark,
  createBoardScene,
  fileUnder,
  freehandLayer,
  GRAPH_SPACINGS,
  groupLayers,
  groupNames,
  Handle,
  handleAt,
  HANDLES,
  handleUnder,
  highlighterStyle,
  imageLayer,
  LayerGroup,
  MarkBox,
  MarkRef,
  markUnder,
  moveMark,
  noteAt,
  penStroke,
  removeMark,
  renameGroup,
  restack,
  rubOutStrokes,
  ruleBoard,
  scaleMark,
  shapeBetween,
  shapeLayer,
  showGroup,
  snapTo,
  stickerAt,
  straightLine,
  textLayer,
  turnMark,
  wordsAt,
} from '@axe/features/tabletop/white-board/white-board-scene';
import { FileSelecterComponent } from '@axe/ui/components/file-selecter/file-selecter.component';
import { TranslocoModule } from '@jsverse/transloco';

/** How long the drawing has to settle before the board keeps a picture of it. */
const SAVE_DELAY = 600;
/** How big a sticker goes down, in the board's own pixels. */
const STICKER_SIZE = 120;
const SELECT_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">' +
  '<path d="M7 2 L7 19 L11.3 15.4 L13.9 21.3 L16.6 20.1 L14 14.3 L19.5 13.8 Z"/></svg>';

const ERASER_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
  '<path d="M20 20H7L3 16l10-10 7 7-2.5 2.5"/><path d="M6.0 20l4-4"/></svg>';

const TOOL_ICONS: Record<BoardTool, string> = {
  select: '',
  pen: 'edit',
  marker: 'border_color',
  eraser: '',
  line: 'show_chart',
  arrow: 'north_east',
  shape: 'category',
  text: 'title',
  note: 'sticky_note_2',
  sticker: 'image',
};

const TOOL_SVG: Partial<Record<BoardTool, string>> = { select: SELECT_SVG, eraser: ERASER_SVG };

/** The sizes a sheet is shown at, against its own. */
const BOARD_ZOOMS: readonly number[] = [0.5, 0.75, 1, 1.5, 2];

/** How near a corner counts as taking hold of it, in the sheet's own pixels at full size. */
const HANDLE_SLACK = 9;

/** How far a copy is set down from what it was copied off, so both can be seen. */
const DUPLICATE_OFFSET = 16;

/** How far one press of the turn buttons takes a mark round. */
const TURN_STEP = 15;

const TOOL_KEYS: Record<string, BoardTool> = {
  v: 'select',
  p: 'pen',
  m: 'marker',
  e: 'eraser',
  l: 'line',
  a: 'arrow',
  r: 'shape',
  t: 'text',
  n: 'note',
  i: 'sticker',
};

const MIN_SIDE = 1;
const MAX_SIDE = 40;

@Component({
  selector: 'white-board-editor',
  templateUrl: './white-board-editor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TranslocoModule, NgClass],
})
export class WhiteBoardEditorComponent {
  private readonly modalService = inject(ModalService);
  private readonly imageStorage = inject(ImageStorage);
  private readonly tabletopService = inject(TabletopService);
  private readonly panelService = inject(PanelService);
  protected readonly t = inject(TRANSLATE_FN);
  protected readonly isCompact = inject(ViewportService).isCompact;
  protected readonly drawer = signal<'none' | 'props' | 'layers'>('none');

  protected toggleDrawer(which: 'props' | 'layers'): void {
    this.drawer.update((open) => (open === which ? 'none' : which));
  }

  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('board');

  private readonly sanitizer = inject(DomSanitizer);

  /** Laid out the way the map editor lays its tools out, since a reader learns one of them once. */
  readonly tools: { tool: BoardTool; icon: string; svg?: SafeHtml }[] = BOARD_TOOLS.map((tool) => ({
    tool,
    icon: TOOL_ICONS[tool],
    svg: TOOL_SVG[tool] ? this.sanitizer.bypassSecurityTrustHtml(TOOL_SVG[tool]!) : undefined,
  }));
  readonly tool = signal<BoardTool>('pen');
  readonly color = signal('#1a1a1a');
  readonly strokeWidth = signal(4);
  readonly fontSize = signal(24);

  readonly spacings = GRAPH_SPACINGS;
  readonly zooms = BOARD_ZOOMS;
  /**
   * How big the sheet is shown, against its own size.
   *
   * Squeezed into the width of the panel a sheet loses its ruling: a hairline drawn a pixel
   * wide and then shrunk by half is a pixel of nothing. Shown at its own size it is legible,
   * and the panel scrolls, which is what the map editor does and what a board must not do
   * worse than.
   */
  readonly zoom = signal(1);
  readonly turnStep = TURN_STEP;
  readonly shapes = BOARD_SHAPES;
  readonly shapeKind = signal<ShapeGeneratorKind>('rect');
  readonly filled = signal(false);
  readonly noteColor = signal('#fff59d');
  readonly snapping = signal(false);
  readonly activeLayerId = signal<string | null>(null);

  protected readonly typing = signal<BoardPoint | null>(null);
  protected typedText = '';

  readonly canUndo = signal(false);
  readonly canRedo = signal(false);
  readonly selected = signal<MarkRef | null>(null);

  private history = new SceneHistory(createBoardScene(4, 3, 50));
  private clipboard: MarkRef | null = null;
  private panFrom: { x: number; y: number } | null = null;
  private board: WhiteBoard | null = null;
  private scene: MapScene = createBoardScene(4, 3, 50);
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private drawingPoints: number[] = [];
  private dragFrom: BoardPoint | null = null;
  private held: { ref: MarkRef; grabX: number; grabY: number; handle: Handle | null; box: MarkBox } | null = null;

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
    if (this.board) setBoardHeightKeepingFoot(this.board, clampSide(value), this.tabletopService.gridSize());
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

  /** The sheets the board is made of, topmost first, gathered into their bundles. */
  get groups(): LayerGroup[] {
    this.revision();
    return groupLayers(this.scene);
  }

  get layers(): MapLayer[] {
    this.revision();
    return [...this.scene.layers].reverse();
  }

  get groupNames(): string[] {
    this.revision();
    return groupNames(this.scene);
  }

  protected groupLabel(group: LayerGroup): string {
    return group.name.length > 0 ? group.name : this.layerName(group.layers[0]);
  }

  protected isGroupShown(group: LayerGroup): boolean {
    return group.layers.some((layer) => layer.visible);
  }

  protected toggleGroup(group: LayerGroup): void {
    if (group.name.length < 1) {
      this.toggleLayer(group.layers[0]);
      return;
    }
    showGroup(this.scene, group.name, !this.isGroupShown(group));
    this.touched();
  }

  /** Files the sheet being worked on under a bundle of its own, for the rest to join. */
  protected makeGroup(): void {
    const layer = this.scene.layers.find((entry) => entry.id === this.activeLayerId()) ?? this.scene.layers.at(-1);
    if (!layer) return;
    const taken = new Set(groupNames(this.scene));
    let name = this.t('feature.whiteBoard.editor.groupName');
    for (let n = 2; taken.has(name); n++) name = `${this.t('feature.whiteBoard.editor.groupName')} ${n}`;
    fileUnder(layer, name);
    this.touched();
  }

  protected fileLayer(layer: MapLayer, group: string): void {
    fileUnder(layer, group);
    this.touched();
  }

  protected renameGroup(group: LayerGroup, name: string): void {
    if (group.name.length < 1) return;
    renameGroup(this.scene, group.name, name);
    this.touched();
  }

  protected layerName(layer: MapLayer): string {
    return layer.name?.length ? layer.name : this.t(`feature.whiteBoard.layer.${layer.kind}`);
  }

  protected chooseLayer(layer: MapLayer): void {
    this.activeLayerId.set(layer.id);
    this.settingChanged();
  }

  protected addSheet(): void {
    const sheet = createLayer('freehand', '');
    addLayer(this.scene, sheet);
    this.activeLayerId.set(sheet.id);
    this.touched();
  }

  protected toggleLayer(layer: MapLayer): void {
    layer.visible = !layer.visible;
    this.touched();
  }

  protected raiseLayer(layer: MapLayer): void {
    moveLayer(this.scene, layer.id, 1);
    this.touched();
  }

  protected lowerLayer(layer: MapLayer): void {
    moveLayer(this.scene, layer.id, -1);
    this.touched();
  }

  protected dropLayer(layer: MapLayer): void {
    removeLayer(this.scene, layer.id);
    if (this.activeLayerId() === layer.id) this.activeLayerId.set(null);
    this.touched();
  }

  /** Ruled like graph paper, which is what anyone drawing a plan on a board wants under it. */
  get isRuled(): boolean {
    this.revision();
    return this.scene.gridVisible;
  }
  set isRuled(value: boolean) {
    this.scene.gridVisible = value;
    this.touched();
  }

  get spacing(): number {
    this.revision();
    return this.scene.cellPx;
  }
  set spacing(value: number) {
    ruleBoard(this.scene, this.sceneWidth, this.sceneHeight, Number(value));
    this.touched();
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
    ruleBoard(this.scene, board.width * grid, board.height * grid, this.scene.cellPx || grid);
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
    const at = { x: (event.clientX - box.left) / scale, y: (event.clientY - box.top) / scale };
    // Snapped only where the reader asked for it, and never for a pen, which would step.
    if (!this.snapping() || this.isPenning()) return at;
    return snapTo(at, this.scene.cellPx);
  }

  protected onPointerDown(event: PointerEvent): void {
    if (!this.board) return;
    // The middle button, or the space bar held down, slides the sheet rather than marking it.
    if (event.button === 1 || this.panning()) {
      this.panFrom = { x: event.clientX, y: event.clientY };
      event.preventDefault();
      return;
    }
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
    const at = this.pointOf(event);

    switch (this.tool()) {
      case 'pen':
      case 'marker':
        this.drawingPoints = [at.x, at.y];
        break;
      case 'eraser':
        this.rubOut(at);
        break;
      case 'line':
      case 'arrow':
      case 'shape':
        this.dragFrom = at;
        break;
      case 'text':
      case 'note':
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
    if (this.panFrom) {
      this.slideBy(event.clientX - this.panFrom.x, event.clientY - this.panFrom.y);
      this.panFrom = { x: event.clientX, y: event.clientY };
      return;
    }
    const at = this.pointOf(event);
    if (this.isPenning() && this.drawingPoints.length > 0) {
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
    if (this.panFrom) {
      this.panFrom = null;
      return;
    }
    const at = this.pointOf(event);

    if (this.isPenning() && this.drawingPoints.length > 3) {
      addStroke(freehandLayer(this.scene, this.activeLayerId()), penStroke([...this.drawingPoints], this.inkStyle()));
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
            : tool === 'arrow'
              ? arrowBetween(from, at, this.style())
              : shapeBetween(this.shapeKind(), from, at, this.style(), this.filled());
        addShape(shapeLayer(this.scene, this.activeLayerId()), mark);
      }
    }
    this.held = null;
    this.touched();
  }

  private style() {
    return { color: this.color(), width: this.strokeWidth(), fontSize: this.fontSize() };
  }

  private isPenning(): boolean {
    return this.tool() === 'pen' || this.tool() === 'marker';
  }

  /** A marker lets what is under it show through; a pen does not. */
  private inkStyle() {
    return this.tool() === 'marker' ? highlighterStyle(this.style()) : this.style();
  }

  private rubOut(at: BoardPoint): void {
    rubOutStrokes(freehandLayer(this.scene, this.activeLayerId()), at.x, at.y, this.strokeWidth() * 2);
    const mark = markUnder(this.scene, at);
    if (mark?.kind === 'image') removeImage(imageLayer(this.scene, this.activeLayerId()), mark.id);
    if (mark?.kind === 'text') removeText(textLayer(this.scene, this.activeLayerId()), mark.id);
    void this.redraw();
  }

  private take(at: BoardPoint): void {
    const chosen = this.selected();
    const box = chosen ? boxOf(this.scene, chosen) : null;
    const handle = box ? handleUnder(at, box, this.handleSlack()) : null;
    if (chosen && box && handle) {
      this.held = { ref: chosen, grabX: at.x, grabY: at.y, handle, box };
      return;
    }

    const mark = markUnder(this.scene, at);
    this.selected.set(mark);
    this.settingChanged();
    if (!mark) return;
    const grabbed = boxOf(this.scene, mark);
    if (grabbed) this.held = { ref: mark, grabX: at.x, grabY: at.y, handle: null, box: grabbed };
  }

  /** A handle has to stay big enough to hit however far the sheet is zoomed out. */
  private handleSlack(): number {
    return HANDLE_SLACK / Math.max(0.25, this.zoom());
  }

  private shift(at: BoardPoint): void {
    const held = this.held;
    if (!held) return;
    const dx = at.x - held.grabX;
    const dy = at.y - held.grabY;
    held.grabX = at.x;
    held.grabY = at.y;

    if (!held.handle) {
      moveMark(this.scene, held.ref, dx, dy);
      void this.redraw();
      return;
    }

    // Stretched from the corner opposite the one being pulled, the way a picture is stretched.
    const box = boxOf(this.scene, held.ref);
    if (!box) return;
    const wide = held.handle.includes('e') ? box.w + dx : held.handle.includes('w') ? box.w - dx : box.w;
    const tall = held.handle.includes('s') ? box.h + dy : held.handle.includes('n') ? box.h - dy : box.h;
    const kx = box.w > 1 ? Math.max(0.05, wide / box.w) : 1;
    const ky = box.h > 1 ? Math.max(0.05, tall / box.h) : 1;
    const anchored = {
      x: held.handle.includes('w') ? box.x + box.w : box.x,
      y: held.handle.includes('n') ? box.y + box.h : box.y,
      w: box.w,
      h: box.h,
    };
    scaleMark(this.scene, held.ref, anchored, kx, ky);
    void this.redraw();
  }

  protected removeSelected(): void {
    const mark = this.selected();
    if (!mark) return;
    removeMark(this.scene, mark);
    this.selected.set(null);
    this.touched();
  }

  /** A copy set down a little off the first, and already in hand, since that is what is next. */
  protected duplicateSelected(): void {
    const mark = this.selected();
    if (!mark) return;
    const made = copyMark(this.scene, mark, DUPLICATE_OFFSET);
    if (made) this.selected.set(made);
    this.touched();
  }

  protected copySelected(): void {
    this.clipboard = this.selected();
  }

  protected pasteCopied(): void {
    const held = this.clipboard;
    if (!held) return;
    const made = copyMark(this.scene, held, DUPLICATE_OFFSET);
    if (made) this.selected.set(made);
    this.touched();
  }

  protected bringForward(): void {
    const mark = this.selected();
    if (!mark) return;
    restack(this.scene, mark, 1);
    this.touched();
  }

  protected sendBackward(): void {
    const mark = this.selected();
    if (!mark) return;
    restack(this.scene, mark, -1);
    this.touched();
  }

  protected turnSelected(degrees: number): void {
    const mark = this.selected();
    if (!mark) return;
    turnMark(this.scene, mark, degrees);
    this.touched();
  }

  protected undo(): void {
    const back = this.history.undo();
    if (!back) return;
    this.scene = back;
    this.selected.set(null);
    this.afterHistory();
  }

  protected redo(): void {
    const forward = this.history.redo();
    if (!forward) return;
    this.scene = forward;
    this.selected.set(null);
    this.afterHistory();
  }

  private afterHistory(): void {
    this.refreshHistory();
    this.settingChanged();
    void this.redraw();
    this.keepPicture();
  }

  private refreshHistory(): void {
    this.canUndo.set(this.history.canUndo());
    this.canRedo.set(this.history.canRedo());
  }

  readonly panning = signal(false);
  private readonly stageRef = viewChild<ElementRef<HTMLElement>>('stage');

  private slideBy(dx: number, dy: number): void {
    const stage = this.stageRef()?.nativeElement;
    if (!stage) return;
    stage.scrollLeft -= dx;
    stage.scrollTop -= dy;
  }

  protected onKeyUp(event: KeyboardEvent): void {
    if (event.key === ' ') this.panning.set(false);
  }

  protected onKeyDown(event: KeyboardEvent): void {
    const typing = event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement;
    if (typing) return;

    if (event.key === ' ') {
      event.preventDefault();
      this.panning.set(true);
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      if (event.shiftKey) this.redo();
      else this.undo();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
      event.preventDefault();
      this.redo();
      return;
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      this.removeSelected();
      return;
    }
    if (event.ctrlKey || event.metaKey) {
      const key = event.key.toLowerCase();
      if (key === 'd') {
        event.preventDefault();
        this.duplicateSelected();
        return;
      }
      if (key === 'c') {
        event.preventDefault();
        this.copySelected();
        return;
      }
      if (key === 'v') {
        event.preventDefault();
        this.pasteCopied();
        return;
      }
      if (key === ']') {
        event.preventDefault();
        this.bringForward();
        return;
      }
      if (key === '[') {
        event.preventDefault();
        this.sendBackward();
        return;
      }
      return;
    }
    const shortcut = TOOL_KEYS[event.key.toLowerCase()];
    if (shortcut) {
      event.preventDefault();
      this.choose(shortcut);
    }
  }

  protected commitText(): void {
    const at = this.typing();
    const words = this.typedText.trim();
    this.typing.set(null);
    this.typedText = '';
    if (!at || words.length < 1) return;
    const written =
      this.tool() === 'note' ? noteAt(at, words, this.style(), this.noteColor()) : wordsAt(at, words, this.style());
    addText(textLayer(this.scene, this.activeLayerId()), written);
    this.tool.set('select');
    this.selected.set({ kind: 'text', id: written.id });
    this.touched();
  }

  private pickSticker(): void {
    this.modalService.open<string>(FileSelecterComponent, { isAllowedEmpty: true }).then(async (identifier) => {
      if (!identifier) return;
      const at = { x: this.sceneWidth / 2, y: this.sceneHeight / 2 };
      addImage(
        imageLayer(this.scene, this.activeLayerId()),
        stickerAt(at, identifier, STICKER_SIZE, await this.shapeOf(identifier))
      );
      this.tool.set('select');
      this.touched();
    });
  }

  /** How wide and how tall the picture actually is, so it is not stuck up squashed. */
  private async shapeOf(identifier: string): Promise<BoardPoint | undefined> {
    const url = this.imageStorage.get(identifier)?.url;
    if (!url) return undefined;
    await warmRasterImages([url]);
    const image = getRasterImage(url);
    return image ? { x: image.naturalWidth, y: image.naturalHeight } : undefined;
  }

  protected clearBoard(): void {
    this.scene.layers = [];
    this.touched();
  }

  /**
   * Draws the board as it stands, plus the stroke still under the pen.
   *
   * The ruling is a guide for whoever is drawing, not something printed on the board, so it
   * is left off when the picture the board wears is taken.
   */
  private async redraw(pending?: number[], ruled = this.scene.gridVisible): Promise<void> {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) return;
    canvas.width = this.sceneWidth;
    canvas.height = this.sceneHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const urls = imageLayer(this.scene, this.activeLayerId())
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
      { drawGrid: ruled }
    );

    const chosen = this.selected();
    const box = chosen ? boxOf(this.scene, chosen) : null;
    if (box && ruled !== false) {
      // The hold is drawn on the sheet but is not part of it, so it is left off the picture.
      ctx.save();
      ctx.strokeStyle = '#2f7fd8';
      ctx.lineWidth = 1.5 / Math.max(0.25, this.zoom());
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(box.x, box.y, box.w, box.h);
      ctx.setLineDash([]);
      ctx.fillStyle = '#ffffff';
      const grip = HANDLE_SLACK / Math.max(0.25, this.zoom());
      for (const handle of HANDLES) {
        const at = handleAt(box, handle);
        ctx.fillRect(at.x - grip / 2, at.y - grip / 2, grip, grip);
        ctx.strokeRect(at.x - grip / 2, at.y - grip / 2, grip, grip);
      }
      ctx.restore();
    }

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
    this.history.commit(this.scene);
    this.refreshHistory();
    void this.redraw();
    this.keepPicture();
  }

  private keepPicture(): void {
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

    // Taken off the sheet with the ruling left off, since the ruling is not part of the board.
    await this.redraw(undefined, false);
    const blob = await new Promise<Blob | null>((resolve) => {
      if (typeof canvas.toBlob !== 'function') resolve(null);
      else canvas.toBlob((made) => resolve(made), 'image/webp', 0.92);
    });
    if (!blob) {
      board.update();
      void this.redraw();
      return;
    }

    const file = await this.imageStorage.addAsync(blob);
    const element = board.imageDataElement?.getFirstElementByName('imageIdentifier');
    const worn = element?.value;
    if (element) element.value = file.identifier;
    board.update();
    // The picture the board wore before this edit is worn by nothing now.
    if (typeof worn === 'string' && worn && worn !== file.identifier) this.imageStorage.delete(worn);
    void this.redraw();
  }
}

function clampSide(value: number): number {
  const side = Math.round(Number(value));
  if (!Number.isFinite(side)) return MIN_SIDE;
  return Math.min(MAX_SIDE, Math.max(MIN_SIDE, side));
}
