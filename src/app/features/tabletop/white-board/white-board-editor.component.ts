import { NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { AnimatedImageService } from '@axe/application/media/animated-image.service';
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
import {
  createLayer,
  ImageLayer,
  MapLayer,
  MapScene,
  SceneGuideLine,
  sceneHeightPx,
  sceneWidthPx,
  ShapeItem,
  StrokeDash,
  TextAlign,
  TextItem,
} from '@axe/features/map-editor/model/scene';
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
  updateText,
} from '@axe/features/map-editor/model/scene-ops';
import { deserializeScene, serializeScene } from '@axe/features/map-editor/model/serialize';
import { getRasterImage, warmRasterImages } from '@axe/features/map-editor/render/raster-image';
import { renderScene } from '@axe/features/map-editor/render/render-scene';
import { detachFromBoard, standingOn } from '@axe/features/tabletop/white-board/white-board-contents';
import { hangablePictureIds } from '@axe/features/tabletop/white-board/white-board-live-pictures';
import {
  addJoint,
  AlignEdge,
  alignMarks,
  anchorFor,
  angleFrom,
  arrowBetween,
  BOARD_SHAPES,
  BOARD_TOOLS,
  BoardPoint,
  BoardTool,
  boxAround,
  boxOf,
  centreOnSheet,
  CHEQUER_CLASS,
  clearSheet,
  copyMark,
  createBoardScene,
  cropMark,
  dropJoint,
  fadeMark,
  fileUnder,
  flipMark,
  freehandLayer,
  GRAPH_SPACINGS,
  groupLayers,
  groupNames,
  guessLineWidth,
  guidesFor,
  guideUnder,
  Handle,
  handleAt,
  HANDLES,
  handleUnder,
  highlighterStyle,
  imageLayer,
  isTypingKey,
  jointedShape,
  jointUnder,
  LayerGroup,
  MARK_SHADOW,
  MarkBox,
  MarkRef,
  MarkStyle,
  MarkStyleChange,
  marksWithin,
  markUnder,
  moveJoint,
  moveMark,
  NaturalSize,
  newGuide,
  noteAt,
  outlineFor,
  overlaysWanted,
  pathThrough,
  penStroke,
  pictureOf,
  removeMark,
  renameGroup,
  restack,
  restyleMark,
  rubOutStrokes,
  ruleBoard,
  scaleMark,
  shapeBetween,
  shapeLayer,
  sheetGuides,
  sheetHolding,
  showGroup,
  smoothStroke,
  SnapGuide,
  snapPoint,
  snapTo,
  spreadMarks,
  squareOff,
  stickerAt,
  straightLine,
  stretchBy,
  textLayer,
  turnMark,
  uncropMark,
  useTextMeasurer,
  wordsAt,
  wordsOf,
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
  hand: 'pan_tool',
  pen: 'edit',
  marker: 'border_color',
  eraser: '',
  line: 'show_chart',
  arrow: 'north_east',
  shape: 'category',
  path: 'polyline',
  text: 'title',
  note: 'sticky_note_2',
  sticker: 'image',
};

const TOOL_SVG: Partial<Record<BoardTool, string>> = { select: SELECT_SVG, eraser: ERASER_SVG };

/** The sizes offered in the list. Anything between them is reachable by the wheel. */
const BOARD_ZOOMS: readonly number[] = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 8;
/** How much one notch of the wheel or one press of the buttons changes the size. */
const ZOOM_STEP = 1.15;

/** How near a corner counts as taking hold of it, in the sheet's own pixels at full size. */
const HANDLE_SLACK = 9;

/** With shift held, the turn grip falls onto steps, so a picture can be set square again. */
const TURN_SNAP = 15;

const RULER_WIDTH = 16;
const RULER_STEPS: readonly number[] = [50, 100, 200, 500, 1000];
/** How much room a number wants on a ruler before the next one is written. */
const RULER_ROOM = 44;

/** How far a copy is set down from what it was copied off, so both can be seen. */
const DUPLICATE_OFFSET = 16;

/** How far one press of the turn buttons takes a mark round. */
const TURN_STEP = 15;

/** The room left round the sheet when it is fitted to the panel. */
const STAGE_MARGIN = 24;

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
  private readonly animatedImage = inject(AnimatedImageService);
  private readonly destroyRef = inject(DestroyRef);
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
  readonly bold = signal(false);
  readonly italic = signal(false);
  readonly align = signal<TextAlign>('left');
  readonly underline = signal(false);
  readonly strike = signal(false);
  /** How thick the line round the letters is, against their own size, so it holds under zoom. */
  readonly outlineWidth = signal(0);
  readonly outlineColor = signal('#ffffff');
  readonly wordShadow = signal(false);
  readonly dash = signal<StrokeDash>('solid');

  /**
   * Ink settings reach what is already down as well as what is next.
   *
   * A line drawn in the wrong colour was a line to be rubbed out and drawn again, which is
   * not how anything else works.
   */
  protected setInk(change: MarkStyleChange): void {
    if (change.color !== undefined) this.color.set(change.color);
    if (change.width !== undefined) this.strokeWidth.set(change.width);
    if (change.fontSize !== undefined) this.fontSize.set(change.fontSize);
    if (change.bold !== undefined) this.bold.set(change.bold);
    if (change.italic !== undefined) this.italic.set(change.italic);
    if (change.align !== undefined) this.align.set(change.align);
    if (change.dash !== undefined) this.dash.set(change.dash);
    if (change.filled !== undefined) this.filled.set(change.filled);
    if (change.fillColor) this.fillColor.set(change.fillColor);
    if (change.shadow !== undefined) {
      this.shadowed.set(change.shadow);
      this.wordShadow.set(change.shadow);
    }
    if (change.underline !== undefined) this.underline.set(change.underline);
    if (change.strike !== undefined) this.strike.set(change.strike);
    if (change.outlineWidth !== undefined) this.outlineWidth.set(change.outlineWidth);
    if (change.outline) this.outlineColor.set(change.outline);

    const held = this.held();
    if (held.length < 1) return;
    for (const mark of held) restyleMark(this.scene, mark, change);
    this.touched();
  }

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

  protected zoomPercent(): number {
    return Math.round(this.zoom() * 100);
  }

  protected zoomIn(): void {
    this.zoomAbout(this.zoom() * ZOOM_STEP, null);
  }

  protected zoomOut(): void {
    this.zoomAbout(this.zoom() / ZOOM_STEP, null);
  }

  protected zoomTo(value: number | string): void {
    this.zoomAbout(Number(value), null);
  }

  /** Big enough to fill the panel and no bigger, which is what anyone means by fit. */
  protected zoomToFit(): void {
    const stage = this.stageRef()?.nativeElement;
    if (!stage) return;
    const room = Math.min(
      (stage.clientWidth - STAGE_MARGIN) / this.sceneWidth,
      (stage.clientHeight - STAGE_MARGIN) / this.sceneHeight
    );
    this.zoomAbout(room, null);
  }

  /**
   * Changes the size, keeping the point under the pointer under the pointer.
   *
   * Zooming about the corner of the sheet walks whatever is being worked on off the screen,
   * so what is under the cursor is what stays put, the way it does in anything else.
   */
  private zoomAbout(next: number, at: { x: number; y: number } | null): void {
    const stage = this.stageRef()?.nativeElement;
    const was = this.zoom();
    const now = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
    if (Math.abs(now - was) < 0.0001) return;

    if (!stage) {
      this.zoom.set(now);
      return;
    }
    const box = stage.getBoundingClientRect();
    const holdX = at ? at.x - box.left : stage.clientWidth / 2;
    const holdY = at ? at.y - box.top : stage.clientHeight / 2;
    const sheetX = (stage.scrollLeft + holdX) / was;
    const sheetY = (stage.scrollTop + holdY) / was;

    this.zoom.set(now);
    queueMicrotask(() => {
      stage.scrollLeft = sheetX * now - holdX;
      stage.scrollTop = sheetY * now - holdY;
    });
  }

  protected onWheel(event: WheelEvent): void {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    const by = event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
    this.zoomAbout(this.zoom() * by, { x: event.clientX, y: event.clientY });
  }
  readonly shapes = BOARD_SHAPES;
  readonly dashes: readonly StrokeDash[] = ['solid', 'dashed', 'dotted', 'dashdot', 'longdash'];
  readonly alignments: readonly TextAlign[] = ['left', 'center', 'right'];
  readonly shapeKind = signal<ShapeGeneratorKind>('rect');
  readonly filled = signal(false);
  /** The points set down for a path so far, which is not a mark until it is finished. */
  readonly laying = signal<BoardPoint[]>([]);
  readonly curved = signal(false);
  readonly fillColor = signal('#ffd54f');
  readonly shadowed = signal(false);
  readonly noteColor = signal('#fff59d');
  readonly snapping = signal(false);
  /** Lines drawn off the other marks, which is the only guide there is once the paper is plain. */
  readonly guiding = signal(true);
  readonly showRulers = signal(true);
  readonly rulerWidth = RULER_WIDTH;

  /** The numbers written along a ruler, spaced so they stay apart at whatever size the sheet is. */
  protected ticks(axis: 'x' | 'y'): { at: number; px: number }[] {
    const span = axis === 'x' ? this.sceneWidth : this.sceneHeight;
    const zoom = this.zoom();
    const step = RULER_STEPS.find((size) => size * zoom >= RULER_ROOM) ?? RULER_STEPS[RULER_STEPS.length - 1];
    const marks: { at: number; px: number }[] = [];
    for (let at = 0; at <= span; at += step) marks.push({ at, px: at * zoom });
    return marks;
  }
  /** The lines shown this instant, which last only as long as the drag that raised them. */
  readonly showing = signal<SnapGuide[]>([]);
  readonly activeLayerId = signal<string | null>(null);

  protected readonly typing = signal<BoardPoint | null>(null);
  protected typedText = '';

  readonly canUndo = signal(false);
  readonly canRedo = signal(false);
  readonly selected = signal<MarkRef | null>(null);
  /** Everything held. One mark is the common case; a dragged out box takes several. */
  readonly held = signal<MarkRef[]>([]);

  private history = new SceneHistory(createBoardScene(4, 3, 50));
  private clipboard: MarkRef[] = [];
  private panFrom: { x: number; y: number } | null = null;
  private keepingShape = false;
  private retyping: MarkRef | null = null;
  private wantsCaret = false;
  private wordsWere = '';
  protected readonly wordBoxRef = viewChild<ElementRef<HTMLElement>>('wordBox');
  private board: WhiteBoard | null = null;
  private scene: MapScene = createBoardScene(4, 3, 50);
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private drawingPoints: number[] = [];
  private dragFrom: BoardPoint | null = null;
  private dragTo: BoardPoint | null = null;
  private grabbed: {
    refs: MarkRef[];
    grabX: number;
    grabY: number;
    handle: Handle | null;
    box: MarkBox;
    turnedTo: number;
  } | null = null;
  private hovering: BoardPoint | null = null;
  private bending: { ref: MarkRef; joint: number } | null = null;
  private draggingGuide: SceneGuideLine | null = null;
  private bandFrom: BoardPoint | null = null;
  private bandTo: BoardPoint | null = null;

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

  /**
   * Whether the board itself shows at all.
   *
   * A board with no face is a sheet of marks hanging in the air over the table, which is what
   * anyone wants when the drawing is meant to sit over the map rather than beside it. The
   * face it had is remembered, so turning it back on does not lose the colour it was.
   */
  get isSeeThrough(): boolean {
    this.revision();
    return (this.board?.opacity ?? 1) <= 0;
  }
  set isSeeThrough(value: boolean) {
    if (!this.board) return;
    if (value) {
      this.faceWas = this.board.opacity > 0 ? this.board.opacity : this.faceWas;
      this.opacityPercent = 0;
      return;
    }
    this.opacityPercent = Math.round(this.faceWas * 100);
  }

  private faceWas = 1;

  readonly chequer = CHEQUER_CLASS;

  /** How much of the board's own face shows, which is what the chequer shows through. */
  get faceOpacity(): number {
    this.revision();
    return this.board?.opacity ?? 1;
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

  /**
   * Names a sheet.
   *
   * A stack of sheets called shape, shape and shape is no better than no stack at all. Cleared
   * back to nothing, a sheet falls back to being named after what it holds.
   */
  protected renameLayer(layer: MapLayer, name: string): void {
    const given = name.trim();
    layer.name = given === this.t(`feature.whiteBoard.layer.${layer.kind}`) ? '' : given;
    this.touched();
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

  /** A sheet held shut keeps what is on it out of reach, so the sheet above can be worked on. */
  protected toggleLock(layer: MapLayer): void {
    layer.locked = !layer.locked;
    if (layer.locked) this.hold(this.held().filter((mark) => sheetHolding(this.scene, mark) !== layer));
    this.touched();
  }

  protected setLayerOpacity(layer: MapLayer, opacity: number): void {
    layer.opacity = Math.min(1, Math.max(0, opacity));
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

  constructor() {
    effect(() => {
      const box = this.wordBoxRef()?.nativeElement;
      if (!this.wantsCaret || !box) return;
      this.wantsCaret = false;
      box.textContent = this.wordsWere;
      box.focus();
      const range = document.createRange();
      range.selectNodeContents(box);
      range.collapse(false);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    });
    // The canvas measures what it will actually draw, which is the only honest measurement.
    const stopMeasuring = useTextMeasurer((text, fontSize, bold, italic) => {
      const ctx = this.canvasRef()?.nativeElement.getContext('2d');
      if (!ctx) return guessLineWidth(text, fontSize);
      ctx.save();
      ctx.font = `${italic ? 'italic ' : ''}${bold ? 'bold ' : ''}${fontSize}px sans-serif`;
      const width = ctx.measureText(text).width;
      ctx.restore();
      return width;
    });
    this.destroyRef.onDestroy(() => {
      this.putDown();
      stopMeasuring();
    });
  }

  bindToBoard(board: WhiteBoard): void {
    this.board = board;
    const grid = this.tabletopService.gridSize();
    this.scene =
      (board.scene ? deserializeScene(board.scene) : null) ?? createBoardScene(board.width, board.height, grid);
    // The board as it stands is the bottom of the undo stack. Left unset, the first thing
    // undone went back to the blank sheet the editor was built with, four squares by three.
    this.history.reset(this.scene);
    this.refreshHistory();
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

  /** Sets down what has been laid out so far, or throws it away if it goes nowhere. */
  protected finishPath(keep = true): void {
    const points = this.laying();
    this.laying.set([]);
    if (!keep || points.length < 2) {
      void this.redraw();
      return;
    }
    const made = pathThrough(points, this.style(), this.curved());
    if (!made) return;
    addShape(shapeLayer(this.scene, this.activeLayerId()), made);
    this.tool.set('select');
    this.hold([{ kind: 'shape', id: made.id }]);
    this.touched();
  }

  protected choose(tool: BoardTool): void {
    if (this.typing()) this.commitText();
    if (this.tool() === 'path' && tool !== 'path') this.finishPath();
    this.tool.set(tool);
    this.panning.set(tool === 'hand');
    if (tool === 'sticker') this.pickSticker();
  }

  /** Fills the panel with what is held, which is how anyone looks closely at one thing. */
  protected zoomToHeld(): void {
    const stage = this.stageRef()?.nativeElement;
    const box = boxAround(this.scene, this.held());
    if (!stage || !box) return;
    const room = Math.min(
      (stage.clientWidth - STAGE_MARGIN) / Math.max(1, box.w),
      (stage.clientHeight - STAGE_MARGIN) / Math.max(1, box.h)
    );
    this.zoomTo(room);
    stage.scrollLeft = (box.x + box.w / 2) * this.zoom() - stage.clientWidth / 2;
    stage.scrollTop = (box.y + box.h / 2) * this.zoom() - stage.clientHeight / 2;
  }

  /** Sweeps one sheet, which is not the same as sweeping the board and starting again. */
  protected clearSheet(layer: MapLayer): void {
    clearSheet(layer);
    this.hold([]);
    this.touched();
  }

  /** The window over the picture being trimmed, in the picture's own drawn pixels. */
  readonly trimming = signal<MarkBox | null>(null);

  protected startTrim(): void {
    const one = this.selected();
    const box = one?.kind === 'image' ? boxOf(this.scene, one) : null;
    if (!box) return;
    // The window starts as the whole picture, and is pulled inwards from there.
    this.trimming.set({ x: 0, y: 0, w: box.w, h: box.h });
    void this.redraw();
  }

  protected async finishTrim(keep: boolean): Promise<void> {
    const window = this.trimming();
    const one = this.selected();
    this.trimming.set(null);
    if (!keep || !window || one?.kind !== 'image') {
      void this.redraw();
      return;
    }
    const picture = pictureOf(this.scene, one);
    const whole = picture ? await this.shapeOf(picture.imageIdentifier) : undefined;
    cropMark(this.scene, one, window, { w: whole?.x ?? 1, h: whole?.y ?? 1 });
    this.touched();
  }

  protected async untrim(): Promise<void> {
    const one = this.selected();
    if (one?.kind !== 'image') return;
    const picture = pictureOf(this.scene, one);
    const whole = picture ? await this.shapeOf(picture.imageIdentifier) : undefined;
    uncropMark(this.scene, one, { w: whole?.x ?? 1, h: whole?.y ?? 1 });
    this.touched();
  }

  protected isTrimmed(): boolean {
    this.revision();
    const one = this.selected();
    return one?.kind === 'image' && !!pictureOf(this.scene, one)?.crop;
  }

  protected flipHeld(way: 'across' | 'down'): void {
    for (const mark of this.held()) flipMark(this.scene, mark, way);
    this.touched();
  }

  protected fadeHeld(opacity: number): void {
    for (const mark of this.held()) fadeMark(this.scene, mark, opacity);
    this.touched();
  }

  /** How solid the picture in hand is, so the slider knows where to sit. */
  protected heldOpacity(): number {
    this.revision();
    const one = this.selected();
    if (one?.kind !== 'image') return 1;
    for (const layer of this.scene.layers) {
      if (layer.kind !== 'image') continue;
      const item = layer.items.find((entry) => entry.id === one.id);
      if (item) return Number.isFinite(item.opacity) ? item.opacity : 1;
    }
    return 1;
  }

  protected holdsPicture(): boolean {
    return this.held().some((mark) => mark.kind === 'image');
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
    // The hand, the middle button, or the space bar held down all slide the sheet rather
    // than marking it. On a touch screen the hand is the only one of the three there is.
    if (event.button === 1 || this.panning()) {
      this.panFrom = { x: event.clientX, y: event.clientY };
      this.sliding.set(true);
      event.preventDefault();
      return;
    }
    // Words being typed are written down before the click is dealt with, so that opening a
    // second box cannot be undone by the first one letting go of the caret afterwards.
    if (this.typing()) {
      this.commitText();
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
        this.startTyping(at, '');
        break;
      case 'path':
        this.laying.update((points) =>
          this.keepingShape && points.length > 0
            ? [...points, squareOff(points[points.length - 1], at)]
            : [...points, at]
        );
        void this.redraw();
        break;
      case 'select':
        this.take(at, event.shiftKey);
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
    if (this.draggingGuide) {
      const guide = this.draggingGuide;
      guide.at = guide.axis === 'x' ? at.x : at.y;
      void this.redraw();
      return;
    }
    if (this.laying().length > 0) {
      this.hovering = at;
      void this.redraw();
      return;
    }
    if (this.isPenning() && this.drawingPoints.length > 0) {
      this.drawingPoints.push(at.x, at.y);
      void this.redraw(this.drawingPoints);
      return;
    }
    if (this.tool() === 'eraser' && event.buttons > 0) {
      this.rubOut(at);
      return;
    }
    if (this.bending) {
      const bent = this.guiding() ? snapPoint(this.scene, at, [this.bending.ref], this.guides) : null;
      if (bent) this.showing.set(bent.guides);
      moveJoint(this.scene, this.bending.ref, this.bending.joint, bent?.at ?? at);
      void this.redraw();
      return;
    }
    if (this.grabbed) {
      this.shift(at);
      return;
    }
    if (this.bandFrom) {
      this.bandTo = at;
      void this.redraw();
      return;
    }
    if (this.dragFrom) {
      this.dragTo = this.reachedTo(at);
      void this.redraw();
    }
  }

  protected onPointerUp(event: PointerEvent): void {
    if (!this.board) return;
    if (this.panFrom) {
      this.panFrom = null;
      this.sliding.set(false);
      return;
    }
    const at = this.pointOf(event);

    if (this.isPenning() && this.drawingPoints.length > 3) {
      addStroke(
        freehandLayer(this.scene, this.activeLayerId()),
        penStroke(smoothStroke(this.drawingPoints), this.inkStyle())
      );
    }
    this.drawingPoints = [];

    if (this.dragFrom) {
      const from = this.dragFrom;
      // What was previewed is what is laid down: the guides and the shift key had their say
      // on the way, and a mark that ignored them would land somewhere the reader never saw.
      const to = this.dragTo ?? this.reachedTo(at);
      this.dragFrom = null;
      this.dragTo = null;
      const far = Math.hypot(to.x - from.x, to.y - from.y) > 4;
      if (far) {
        const tool = this.tool();
        const mark =
          tool === 'line'
            ? straightLine(from, to, this.style())
            : tool === 'arrow'
              ? arrowBetween(from, to, this.style())
              : shapeBetween(this.shapeKind(), from, to, this.style(), this.filled());
        addShape(shapeLayer(this.scene, this.activeLayerId()), mark);
        this.hold([{ kind: 'shape', id: mark.id }]);
      }
    }
    if (this.bandFrom && this.bandTo) {
      const area = boxBetweenPoints(this.bandFrom, this.bandTo);
      if (area.w > 3 || area.h > 3) this.hold(marksWithin(this.scene, area));
      this.bandFrom = null;
      this.bandTo = null;
    }
    this.grabbed = null;
    this.bending = null;
    this.draggingGuide = null;
    this.showing.set([]);
    this.touched();
  }

  private style(): MarkStyle {
    return {
      color: this.color(),
      width: this.strokeWidth(),
      fontSize: this.fontSize(),
      fillColor: this.fillColor(),
      dash: this.dash(),
      shadow: this.tool() === 'text' || this.tool() === 'note' ? this.wordShadow() : this.shadowed(),
      outline: this.outlineColor(),
      outlineWidth: this.outlineWidth(),
      underline: this.underline(),
      strike: this.strike(),
    };
  }

  private wordStyle(): TextItem {
    return { bold: this.bold(), italic: this.italic(), align: this.align() } as TextItem;
  }

  private hold(marks: MarkRef[]): void {
    this.held.set(marks);
    this.selected.set(marks.length === 1 ? marks[0] : null);
    this.settingChanged();
  }

  /**
   * The mark as it would be if the pointer were let go here.
   *
   * Drawn out and shown while the drag lasts, because dragging out a line and seeing nothing
   * until it is finished is drawing blind.
   */
  private pendingMark(): ShapeItem | null {
    const from = this.dragFrom;
    const to = this.dragTo;
    if (!from || !to) return null;
    const tool = this.tool();
    if (tool === 'line') return straightLine(from, to, this.style());
    if (tool === 'arrow') return arrowBetween(from, to, this.style());
    if (tool === 'shape') return shapeBetween(this.shapeKind(), from, to, this.style(), this.filled());
    return null;
  }

  /**
   * Where the drag has reached, once the guides and the shift key have had their say.
   *
   * A line meant to be upright is never quite upright when it is dragged by hand, and a box
   * meant to sit under another is never quite under it.
   */
  private reachedTo(to: BoardPoint): BoardPoint {
    const from = this.dragFrom;
    if (!from) return to;
    const tool = this.tool();
    if (this.keepingShape && (tool === 'line' || tool === 'arrow')) {
      this.showing.set([]);
      return squareOff(from, to);
    }
    if (!this.guiding()) return to;

    const box = {
      x: Math.min(from.x, to.x),
      y: Math.min(from.y, to.y),
      w: Math.abs(to.x - from.x),
      h: Math.abs(to.y - from.y),
    };
    const snap = guidesFor(this.scene, box, [], this.guides);
    this.showing.set(snap.guides);
    return { x: to.x + snap.dx, y: to.y + snap.dy };
  }

  private drawGuides(ctx: CanvasRenderingContext2D, guides: readonly SnapGuide[], colour: string): void {
    if (guides.length < 1) return;
    ctx.save();
    ctx.strokeStyle = colour;
    ctx.lineWidth = 1 / Math.max(0.25, this.zoom());
    ctx.setLineDash([5, 4]);
    for (const guide of guides) {
      ctx.beginPath();
      if (guide.axis === 'x') {
        ctx.moveTo(guide.at, guide.from);
        ctx.lineTo(guide.at, guide.to);
      } else {
        ctx.moveTo(guide.from, guide.at);
        ctx.lineTo(guide.to, guide.at);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawPending(ctx: CanvasRenderingContext2D, item: ShapeItem): void {
    ctx.save();
    ctx.strokeStyle = item.stroke?.color ?? this.color();
    ctx.lineWidth = item.stroke?.width ?? this.strokeWidth();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (item.fill?.type === 'solid') ctx.fillStyle = item.fill.color;

    if (item.shape === 'rect') {
      const [x, y, w, h] = item.points;
      if (item.fill?.type === 'solid') ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
    } else if (item.shape === 'ellipse') {
      const [x, y, w, h] = item.points;
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2, Math.abs(w) / 2, Math.abs(h) / 2, 0, 0, Math.PI * 2);
      if (item.fill?.type === 'solid') ctx.fill();
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(item.points[0], item.points[1]);
      for (let i = 2; i + 1 < item.points.length; i += 2) ctx.lineTo(item.points[i], item.points[i + 1]);
      if (item.shape === 'polygon') ctx.closePath();
      if (item.fill?.type === 'solid') ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
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

  private take(at: BoardPoint, adding: boolean): void {
    const laid = guideUnder(this.guides, at);
    if (laid) {
      this.draggingGuide = laid;
      return;
    }
    const chosen = this.selected();
    const window = this.trimming();
    const picture = chosen && window ? boxOf(this.scene, chosen) : null;
    if (chosen && window && picture) {
      const onScreen = { x: picture.x + window.x, y: picture.y + window.y, w: window.w, h: window.h };
      const grip = handleUnder(at, onScreen, this.handleSlack());
      if (grip && grip !== 'turn') {
        this.grabbed = { refs: [chosen], grabX: at.x, grabY: at.y, handle: grip, box: onScreen, turnedTo: 0 };
      }
      return;
    }
    // A path's own corners are reached for before the box drawn round it, being on the line
    // itself rather than out at the edges.
    if (chosen && jointedShape(this.scene, chosen)) {
      const joint = jointUnder(this.scene, chosen, at, this.handleSlack());
      if (joint !== null) {
        if (adding) {
          if (dropJoint(this.scene, chosen, joint)) this.touched();
          return;
        }
        this.bending = { ref: chosen, joint };
        return;
      }
    }

    const box = chosen ? boxOf(this.scene, chosen) : null;
    const handle = box ? handleUnder(at, box, this.handleSlack()) : null;
    if (chosen && box && handle) {
      this.grabbed = { refs: [chosen], grabX: at.x, grabY: at.y, handle, box, turnedTo: angleFrom(box, at) };
      return;
    }

    const mark = markUnder(this.scene, at);
    if (!mark) {
      // Nothing under the pointer: a box is dragged out to take everything inside it.
      if (!adding) this.hold([]);
      this.bandFrom = at;
      this.bandTo = at;
      return;
    }

    const already = this.held();
    const has = already.some((entry) => entry.kind === mark.kind && entry.id === mark.id);
    const next = adding
      ? has
        ? already.filter((entry) => !(entry.kind === mark.kind && entry.id === mark.id))
        : [...already, mark]
      : has
        ? already
        : [mark];
    this.hold(next);
    const bounds = boxAround(this.scene, next);
    if (bounds) {
      this.grabbed = { refs: next, grabX: at.x, grabY: at.y, handle: null, box: bounds, turnedTo: 0 };
    }
  }

  /** A handle has to stay big enough to hit however far the sheet is zoomed out. */
  private handleSlack(): number {
    return HANDLE_SLACK / Math.max(0.25, this.zoom());
  }

  private shift(at: BoardPoint): void {
    const held = this.grabbed;
    if (!held) return;
    const dx = at.x - held.grabX;
    const dy = at.y - held.grabY;
    held.grabX = at.x;
    held.grabY = at.y;

    const window = this.trimming();
    if (window && held.handle) {
      const picture = boxOf(this.scene, held.refs[0]);
      if (!picture) return;
      this.trimming.set(pullWindow(window, held.handle, dx, dy, picture));
      void this.redraw();
      return;
    }

    if (!held.handle) {
      let stepX = dx;
      let stepY = dy;
      const was = boxAround(this.scene, held.refs);
      if (this.guiding() && was) {
        const snap = guidesFor(this.scene, { ...was, x: was.x + dx, y: was.y + dy }, held.refs, this.guides);
        stepX += snap.dx;
        stepY += snap.dy;
        this.showing.set(snap.guides);
      }
      for (const ref of held.refs) moveMark(this.scene, ref, stepX, stepY);
      void this.redraw();
      return;
    }

    const box = boxAround(this.scene, held.refs);
    if (!box) return;

    if (held.handle === 'turn') {
      this.showing.set([]);
      const now = angleFrom(box, at);
      const turned = this.keepingShape ? Math.round(now / TURN_SNAP) * TURN_SNAP : now;
      for (const ref of held.refs) turnMark(this.scene, ref, turned - held.turnedTo);
      held.turnedTo = turned;
      void this.redraw();
      return;
    }

    // Stretched away from the side facing the one being pulled, the way a picture is
    // stretched, and the grip gives in to any line it is pulled near.
    let reach = at;
    if (this.guiding()) {
      const snap = snapPoint(this.scene, at, held.refs, this.guides);
      reach = snap.at;
      this.showing.set(snap.guides);
    }
    const { kx, ky } = stretchBy(box, held.handle, reach);
    const anchor = anchorFor(box, held.handle);
    const anchored = { x: anchor.x, y: anchor.y, w: box.w, h: box.h };
    // Held down, a corner keeps the shape of what it is pulling, the way it does elsewhere.
    const even = this.keepingShape && held.handle.length === 2 ? Math.max(kx, ky) : 0;
    for (const ref of held.refs) {
      scaleMark(this.scene, ref, anchored, even || kx, even || ky);
    }
    void this.redraw();
  }

  protected removeSelected(): void {
    const marks = this.held();
    if (marks.length < 1) return;
    for (const mark of marks) removeMark(this.scene, mark);
    this.hold([]);
    this.touched();
  }

  protected alignHeld(edge: AlignEdge): void {
    alignMarks(this.scene, this.held(), edge);
    this.touched();
  }

  protected centreHeld(way: 'across' | 'down' | 'both'): void {
    centreOnSheet(this.scene, this.held(), way);
    this.touched();
  }

  protected spreadHeld(along: 'x' | 'y'): void {
    spreadMarks(this.scene, this.held(), along);
    this.touched();
  }

  protected holdEverything(): void {
    this.hold(marksWithin(this.scene, { x: -1e6, y: -1e6, w: 2e6, h: 2e6 }));
  }

  /** Copies set down a little off the first, and already in hand, since that is what is next. */
  protected duplicateSelected(): void {
    const made = this.held()
      .map((mark) => copyMark(this.scene, mark, DUPLICATE_OFFSET))
      .filter((mark): mark is MarkRef => mark !== null);
    if (made.length > 0) this.hold(made);
    this.touched();
  }

  protected copySelected(): void {
    this.clipboard = this.held();
  }

  protected pasteCopied(): void {
    const made = this.clipboard
      .map((mark) => copyMark(this.scene, mark, DUPLICATE_OFFSET))
      .filter((mark): mark is MarkRef => mark !== null);
    if (made.length < 1) return;
    this.hold(made);
    this.touched();
  }

  protected bringForward(): void {
    for (const mark of this.held()) restack(this.scene, mark, 1);
    this.touched();
  }

  protected sendBackward(): void {
    for (const mark of this.held()) restack(this.scene, mark, -1);
    this.touched();
  }

  protected turnSelected(degrees: number): void {
    for (const mark of this.held()) turnMark(this.scene, mark, degrees);
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
  /** Whether the sheet is being slid this instant, which is what changes the hand's shape. */
  readonly sliding = signal(false);
  private readonly stageRef = viewChild<ElementRef<HTMLElement>>('stage');

  private slideBy(dx: number, dy: number): void {
    const stage = this.stageRef()?.nativeElement;
    if (!stage) return;
    stage.scrollLeft -= dx;
    stage.scrollTop -= dy;
  }

  protected onKeyUp(event: KeyboardEvent): void {
    if (isTypingKey(event.target, event.isComposing)) return;
    this.keepingShape = event.shiftKey;
    // Letting go of the space bar gives the sheet back to whatever tool was chosen, unless
    // the chosen tool is the hand, which does not answer to the space bar at all.
    if (event.key === ' ') this.panning.set(this.tool() === 'hand');
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (isTypingKey(event.target, event.isComposing)) return;

    this.keepingShape = event.shiftKey;
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
    if (this.laying().length > 0 && (event.key === 'Enter' || event.key === 'Escape')) {
      event.preventDefault();
      this.finishPath(event.key === 'Enter');
      return;
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      this.removeSelected();
      return;
    }
    if (event.ctrlKey || event.metaKey) {
      const key = event.key.toLowerCase();
      if (key === '0') {
        event.preventDefault();
        this.zoomTo(1);
        return;
      }
      if (key === '=' || key === '+') {
        event.preventDefault();
        this.zoomIn();
        return;
      }
      if (key === '-') {
        event.preventDefault();
        this.zoomOut();
        return;
      }
      if (key === '9') {
        event.preventDefault();
        this.zoomToFit();
        return;
      }
      if (key === 'a') {
        event.preventDefault();
        this.holdEverything();
        return;
      }
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

  /** Words already written are typed over rather than written again. */
  protected onDoubleClick(event: PointerEvent): void {
    if (this.tool() === 'path') {
      this.finishPath();
      return;
    }
    const at = this.pointOf(event);
    const held = this.selected();
    if (held && jointedShape(this.scene, held) && addJoint(this.scene, held, at, this.handleSlack()) !== null) {
      this.touched();
      return;
    }
    const mark = markUnder(this.scene, at);
    const words = mark ? wordsOf(this.scene, mark) : null;
    if (!words) return;
    // The words already written are picked up along with how they were written, so retyping
    // them does not quietly restyle them.
    this.fontSize.set(words.fontSize);
    this.color.set(words.color);
    this.bold.set(words.bold);
    this.italic.set(words.italic);
    this.underline.set(!!words.underline);
    this.strike.set(!!words.strike);
    this.wordShadow.set(!!words.shadow);
    this.outlineWidth.set(words.outline ? Math.round((words.outline.width / words.fontSize) * 100) : 0);
    if (words.outline) this.outlineColor.set(words.outline.color);
    this.retyping = mark;
    this.startTyping({ x: words.x, y: words.y }, words.text);
  }

  /** Puts the box on the sheet and the caret in it, since nobody opens one meaning to wait. */
  private startTyping(at: BoardPoint, words: string): void {
    this.typedText = words;
    this.wordsWere = words;
    this.wantsCaret = true;
    this.typing.set(at);
    void this.redraw();
  }

  /** The decoration the words will carry, shown on the box they are being typed into. */
  protected typedStroke(): string {
    const line = outlineFor(this.style());
    return line ? `${line.width * this.zoom()}px ${line.color}` : '';
  }

  protected typedRules(): string {
    const rules = [this.underline() ? 'underline' : '', this.strike() ? 'line-through' : ''].filter(Boolean);
    return rules.length > 0 ? rules.join(' ') : 'none';
  }

  protected typedShadow(): string {
    if (!this.wordShadow()) return 'none';
    const shadow = MARK_SHADOW;
    const zoom = this.zoom();
    return `${shadow.offsetX * zoom}px ${shadow.offsetY * zoom}px ${shadow.blur * zoom}px ${shadow.color}`;
  }

  protected onTypedInput(event: Event): void {
    this.typedText = (event.target as HTMLElement).innerText;
  }

  /**
   * The keys the word box answers to itself.
   *
   * Escape and enter both mean something to an input method while it is composing, so the box
   * hears them only once the letters have been settled on.
   */
  protected onTypedKey(event: KeyboardEvent): void {
    if (event.isComposing) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.dropTyping();
      return;
    }
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      event.stopPropagation();
      this.commitText();
    }
  }

  /** Thrown away rather than written down, which is what escape means everywhere. */
  private dropTyping(): void {
    this.typing.set(null);
    this.typedText = '';
    this.retyping = null;
    void this.redraw();
  }

  protected commitText(): void {
    const at = this.typing();
    const words = this.typedText.replace(/\s+$/, '');
    const over = this.retyping;
    this.typing.set(null);
    this.typedText = '';
    this.retyping = null;

    if (over) {
      const sheet = sheetHolding(this.scene, over);
      if (words.length < 1) removeMark(this.scene, over);
      else if (sheet?.kind === 'text') updateText(sheet, over.id, { text: words });
      this.touched();
      return;
    }
    if (!at || words.length < 1) return;
    const marks = this.wordStyle();
    const written = {
      ...(this.tool() === 'note'
        ? noteAt(at, words, this.style(), this.noteColor())
        : wordsAt(at, words, this.style())),
      bold: marks.bold,
      italic: marks.italic,
      align: marks.align,
    };
    addText(textLayer(this.scene, this.activeLayerId()), written);
    this.tool.set('select');
    this.selected.set({ kind: 'text', id: written.id });
    this.touched();
  }

  /**
   * A picture on the clipboard is stuck straight onto the sheet.
   *
   * Cropping a screenshot and pressing the two keys is how a picture gets into a deck; going
   * out to a file, saving it, and coming back through a picker is not.
   */
  protected async onPaste(event: ClipboardEvent): Promise<void> {
    const files = Array.from(event.clipboardData?.files ?? []).filter((file) => file.type.startsWith('image/'));
    if (files.length < 1) return;
    event.preventDefault();
    const stuck: MarkRef[] = [];
    for (const file of files) {
      const image = await this.imageStorage.addAsync(file);
      const made = stickerAt(
        { x: this.sceneWidth / 2, y: this.sceneHeight / 2 },
        image.identifier,
        STICKER_SIZE,
        await this.shapeOf(image.identifier),
        this.sheetSize()
      );
      addImage(imageLayer(this.scene, this.activeLayerId()), made);
      stuck.push({ kind: 'image', id: made.id });
    }
    // Whatever has just been stuck on is what wants moving next, so it comes up already held.
    this.tool.set('select');
    this.hold(stuck);
    this.touched();
  }

  /** The board as a picture, for anyone who wants it in a deck rather than on the table. */
  protected async saveAsPicture(): Promise<void> {
    const sheet = document.createElement('canvas');
    sheet.width = this.sceneWidth;
    sheet.height = this.sceneHeight;
    const ctx = sheet.getContext('2d');
    if (!ctx) return;
    // The sheet under the marks is white, as it is on the board, not the transparency of a canvas.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, sheet.width, sheet.height);
    await this.paintMarks(ctx, false);
    const blob = await new Promise<Blob | null>((keep) => sheet.toBlob(keep, 'image/png'));
    if (!blob) return;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${this.board?.name || 'whiteboard'}.png`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  private pickSticker(): void {
    this.modalService.open<string>(FileSelecterComponent, { isAllowedEmpty: true }).then(async (identifier) => {
      if (!identifier) return;
      const at = { x: this.sceneWidth / 2, y: this.sceneHeight / 2 };
      const made = stickerAt(at, identifier, STICKER_SIZE, await this.shapeOf(identifier), this.sheetSize());
      addImage(imageLayer(this.scene, this.activeLayerId()), made);
      this.tool.set('select');
      this.hold([{ kind: 'image', id: made.id }]);
      this.touched();
    });
  }

  private sheetSize(): NaturalSize {
    return { w: this.sceneWidth, h: this.sceneHeight };
  }

  /** How wide and how tall the picture actually is, so it is not stuck up squashed. */
  private async shapeOf(identifier: string): Promise<BoardPoint | undefined> {
    const url = this.imageStorage.get(identifier)?.url;
    if (!url) return undefined;
    await warmRasterImages([url]);
    const image = getRasterImage(url);
    return image ? { x: image.naturalWidth, y: image.naturalHeight } : undefined;
  }

  get guides(): SceneGuideLine[] {
    this.revision();
    return this.scene.guides ?? [];
  }

  /** A guide is pulled off a ruler onto the sheet, and pulled back onto the ruler to be rid of it. */
  protected startGuide(axis: 'x' | 'y', event: PointerEvent): void {
    const at = this.pointOf(event);
    const guide = newGuide(axis, axis === 'x' ? at.x : at.y);
    this.scene.guides = [...this.guides, guide];
    this.draggingGuide = guide;
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
    void this.redraw();
  }

  protected dropGuide(guide: SceneGuideLine): void {
    this.scene.guides = this.guides.filter((entry) => entry.id !== guide.id);
    this.touched();
  }

  protected clearGuides(): void {
    this.scene.guides = [];
    this.touched();
  }

  protected clearBoard(): void {
    this.scene.layers = [];
    this.touched();
  }

  /**
   * Everything on the sheet, onto whichever canvas is asked for.
   *
   * A picture that moves is left out of the one the board wears, because the board hangs
   * that one over the top where it can go on moving. Every other canvas - the sheet being
   * drawn on, a picture saved to a file - takes the lot, standing still.
   */
  private async paintMarks(ctx: CanvasRenderingContext2D, ruled: boolean, hangingLeftOut = false): Promise<void> {
    const items = this.scene.layers
      .filter((layer): layer is ImageLayer => layer.kind === 'image')
      .flatMap((layer) => layer.items);
    const urls = items
      .map((item) => this.imageStorage.get(item.imageIdentifier)?.url)
      .filter((url): url is string => !!url);
    if (urls.length > 0) await warmRasterImages(urls);

    // What is left out has to be exactly what the board hangs, so the reading is waited for
    // here rather than asked about again below, where a picture still being read answers "still".
    const moving = new Set<string>();
    if (hangingLeftOut) {
      const read = await Promise.all(
        items.map(async (item) => [item.imageIdentifier, await this.animatedImage.probe(item.imageIdentifier)] as const)
      );
      for (const [identifier, animated] of read) if (animated) moving.add(identifier);
    }
    const hung = hangablePictureIds(hangingLeftOut ? this.scene : null, (identifier) => moving.has(identifier));

    renderScene(
      ctx,
      this.scene,
      {
        texturePattern: () => null,
        stampImage: () => null,
        rasterImage: (item) => {
          if (hung.has(item.id)) return null;
          const url = this.imageStorage.get(item.imageIdentifier)?.url;
          return url ? getRasterImage(url) : null;
        },
      },
      // Words being typed over are shown in the box, so drawing them underneath as well
      // would leave the old and the new overlapping.
      { drawGrid: ruled, hideTextId: this.retyping?.kind === 'text' ? this.retyping.id : undefined }
    );
  }

  /**
   * Draws the board as it stands, plus the stroke still under the pen.
   *
   * The ruling, the guides and the hold are for whoever is drawing, not part of what is
   * drawn, so a bare pass leaves them all off when the picture the board wears is taken.
   * Whether the paper is ruled says nothing about whether any of the rest is wanted.
   */
  private async redraw(pending?: number[], bare = false, hangingLeftOut = false): Promise<void> {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) return;
    canvas.width = this.sceneWidth;
    canvas.height = this.sceneHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const wants = overlaysWanted(bare, this.scene.gridVisible);
    await this.paintMarks(ctx, wants.grid, hangingLeftOut);

    // A path shows its own corners rather than the box round it, since it is the corners that
    // are moved and the box is only where they happen to reach.
    const bendable = this.selected();
    const jointed = bendable ? jointedShape(this.scene, bendable) : null;
    const box = jointed ? null : boxAround(this.scene, this.held());
    const window = this.trimming();
    if (box && window && wants.helpers) {
      // What is being trimmed away is greyed over, so what is left is what is being kept.
      const cut = { x: box.x + window.x, y: box.y + window.y, w: window.w, h: window.h };
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath();
      ctx.rect(box.x, box.y, box.w, box.h);
      ctx.rect(cut.x, cut.y, cut.w, cut.h);
      ctx.fill('evenodd');
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5 / Math.max(0.25, this.zoom());
      ctx.strokeRect(cut.x, cut.y, cut.w, cut.h);
      ctx.fillStyle = '#ffffff';
      const grip = HANDLE_SLACK / Math.max(0.25, this.zoom());
      for (const handle of HANDLES) {
        if (handle === 'turn') continue;
        const at = handleAt(cut, handle);
        ctx.fillRect(at.x - grip / 2, at.y - grip / 2, grip, grip);
      }
      ctx.restore();
    } else if (box && wants.helpers) {
      // The hold is drawn on the sheet but is not part of it, so it is left off the picture.
      ctx.save();
      ctx.strokeStyle = '#2f7fd8';
      ctx.lineWidth = 1.5 / Math.max(0.25, this.zoom());
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(box.x, box.y, box.w, box.h);
      ctx.setLineDash([]);
      ctx.fillStyle = '#ffffff';
      const grip = HANDLE_SLACK / Math.max(0.25, this.zoom());
      const stalk = handleAt(box, 'turn');
      ctx.beginPath();
      ctx.moveTo(box.x + box.w / 2, box.y);
      ctx.lineTo(stalk.x, stalk.y);
      ctx.stroke();
      for (const handle of HANDLES) {
        const at = handleAt(box, handle);
        if (handle === 'turn') {
          ctx.beginPath();
          ctx.arc(at.x, at.y, grip / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          continue;
        }
        ctx.fillRect(at.x - grip / 2, at.y - grip / 2, grip, grip);
        ctx.strokeRect(at.x - grip / 2, at.y - grip / 2, grip, grip);
      }
      ctx.restore();
    }

    if (jointed && wants.helpers) {
      ctx.save();
      ctx.strokeStyle = '#2f7fd8';
      ctx.fillStyle = '#ffffff';
      ctx.lineWidth = 1.5 / Math.max(0.25, this.zoom());
      const grip = HANDLE_SLACK / Math.max(0.25, this.zoom());
      for (let joint = 0; joint * 2 + 1 < jointed.points.length; joint += 1) {
        const x = jointed.points[joint * 2];
        const y = jointed.points[joint * 2 + 1];
        ctx.beginPath();
        ctx.arc(x, y, grip / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }

    if (wants.helpers) {
      const standing = this.guiding() ? sheetGuides(this.scene) : [];
      const laid: SnapGuide[] = this.guides.map((guide) => ({
        axis: guide.axis,
        at: guide.at,
        from: 0,
        to: guide.axis === 'x' ? this.sceneHeight : this.sceneWidth,
      }));
      this.drawGuides(ctx, [...standing, ...laid], 'rgba(70,130,220,0.35)');
      this.drawGuides(ctx, this.showing(), '#e0457b');
    }

    const laying = this.laying();
    if (laying.length > 0 && wants.helpers) {
      ctx.save();
      ctx.strokeStyle = this.color();
      ctx.lineWidth = this.strokeWidth();
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(laying[0].x, laying[0].y);
      for (const at of laying.slice(1)) ctx.lineTo(at.x, at.y);
      if (this.hovering) ctx.lineTo(this.hovering.x, this.hovering.y);
      ctx.stroke();
      ctx.fillStyle = '#2f7fd8';
      for (const at of laying) ctx.fillRect(at.x - 2, at.y - 2, 4, 4);
      ctx.restore();
    }

    if (this.bandFrom && this.bandTo && wants.helpers) {
      const area = boxBetweenPoints(this.bandFrom, this.bandTo);
      ctx.save();
      ctx.strokeStyle = '#2f7fd8';
      ctx.fillStyle = 'rgba(47,127,216,0.12)';
      ctx.lineWidth = 1 / Math.max(0.25, this.zoom());
      ctx.setLineDash([3, 3]);
      ctx.fillRect(area.x, area.y, area.w, area.h);
      ctx.strokeRect(area.x, area.y, area.w, area.h);
      ctx.restore();
    }

    const dragging = this.pendingMark();
    if (dragging && wants.helpers) this.drawPending(ctx, dragging);

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

  /**
   * Closing the panel writes down what was still waiting to be written.
   *
   * A drawing is kept a breath after the last stroke rather than on every one of them, so
   * closing within that breath used to lose the stroke: the timer fired on a component that
   * had gone, found no canvas, and returned before writing anything. The measurer is given
   * back too, being a closure over this canvas that outlived it and went on being asked.
   */
  private putDown(): void {
    if (this.saveTimer === null) return;
    clearTimeout(this.saveTimer);
    this.saveTimer = null;
    this.writeScene();
  }

  /** The drawing itself, which is what must survive; the picture it wears can wait. */
  private writeScene(): void {
    if (!this.board) return;
    this.board.scene = serializeScene(this.scene);
    this.board.update();
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

    // Taken off the sheet bare: neither the ruling nor the guides are part of the board.
    await this.redraw(undefined, true, true);
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

/** The box two dragged out corners make, whichever way round they were dragged. */
function boxBetweenPoints(from: BoardPoint, to: BoardPoint): MarkBox {
  return {
    x: Math.min(from.x, to.x),
    y: Math.min(from.y, to.y),
    w: Math.abs(to.x - from.x),
    h: Math.abs(to.y - from.y),
  };
}

/** Pulls one side or corner of the trim window in, never past the picture or past itself. */
function pullWindow(window: MarkBox, grip: Handle, dx: number, dy: number, picture: MarkBox): MarkBox {
  const next = { ...window };
  if (grip.includes('w')) {
    const left = Math.max(0, Math.min(next.x + dx, next.x + next.w - MIN_TRIM));
    next.w += next.x - left;
    next.x = left;
  }
  if (grip.includes('e')) next.w = Math.max(MIN_TRIM, Math.min(next.w + dx, picture.w - next.x));
  if (grip.includes('n')) {
    const top = Math.max(0, Math.min(next.y + dy, next.y + next.h - MIN_TRIM));
    next.h += next.y - top;
    next.y = top;
  }
  if (grip.includes('s')) next.h = Math.max(MIN_TRIM, Math.min(next.h + dy, picture.h - next.y));
  return next;
}

/** How little of a picture may be left, so there is always something to pull back out by. */
const MIN_TRIM = 8;
