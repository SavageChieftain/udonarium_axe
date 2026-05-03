import { NgClass, NgStyle } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { CoordinateService } from '@axe/core/input/coordinate.service';
import { PointerDeviceService } from '@axe/core/input/pointer-device.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import { GameTable } from '@axe/domain/tabletop/game-table';
import { RangeArea } from '@axe/domain/tabletop/range';
import { TableSelecter } from '@axe/domain/tabletop/table-selecter';
import { buildRangeContextMenu } from '@axe/features/tabletop/range/range-context-menu';
import {
  ClipAreaCorn,
  ClipAreaDiamond,
  ClipAreaLine,
  ClipAreaSquare,
  RangeRender,
  RangeRenderSetting,
} from '@axe/features/tabletop/range/range-render'; // 注意別のコンポーネントフォルダにアクセスしてグリッドの描画を行っている
import { RangeDockingCharacterComponent } from '@axe/features/tabletop/range-docking-character/range-docking-character.component';
import { InputHandler } from '@axe/shared/directives/input-handler';
import { MovableOption } from '@axe/shared/directives/movable.directive';
import { MovableDirective } from '@axe/shared/directives/movable.directive';
import { RotableOption } from '@axe/shared/directives/rotable.directive';
import { RotableDirective } from '@axe/shared/directives/rotable.directive';
import { TooltipDirective } from '@axe/shared/directives/tooltip.directive';
import { GameObjectInventoryService } from '@axe/shared/inventory/game-object-inventory.service';
import { ObjectChangeService } from '@axe/shared/sync/object-change.service';
import { TabletopService } from '@axe/shared/tabletop/tabletop.service';
import { TabletopActionService } from '@axe/shared/tabletop/tabletop-action.service';
import { ContextMenuService } from '@axe/shared/ui/context-menu.service';
import { PanelOption, PanelService } from '@axe/shared/ui/panel.service';
import { UiSignalService } from '@axe/shared/ui/ui-signal.service';

@Component({
  selector: 'range',
  templateUrl: './range.component.html',
  styleUrls: ['./range.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MovableDirective, NgClass, TooltipDirective, RotableDirective, NgStyle],
  host: {
    '(dragstart)': 'onDragstart($event)',
    '(contextmenu)': 'onContextMenu($event)',
  },
})
export class RangeComponent {
  private readonly tabletopActionService = inject(TabletopActionService);
  private readonly contextMenuService = inject(ContextMenuService);
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly panelService = inject(PanelService);
  private readonly pointerDeviceService = inject(PointerDeviceService);
  private readonly coordinateService = inject(CoordinateService);
  private readonly tabletopService = inject(TabletopService);
  private readonly objectStore = inject(ObjectStore);
  private readonly inventoryService = inject(GameObjectInventoryService);
  private readonly uiSignalService = inject(UiSignalService);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly destroyRef = inject(DestroyRef);

  readonly range = input.required<RangeArea>();

  readonly gridCanvas = viewChild<ElementRef<HTMLCanvasElement>>('gridCanvas');
  readonly rangeCanvas = viewChild<ElementRef<HTMLCanvasElement>>('rangeCanvas');
  readonly rotate = viewChild<ElementRef<HTMLElement>>('rotate');

  public get clipPathText() {
    let text: string;
    switch (this.range().type) {
      case 'LINE':
        text = this.clipLine;
        break;
      case 'CIRCLE':
        text = this.clipCircle;
        break;
      case 'SQUARE':
        text = this.clipSquare;
        break;
      case 'DIAMOND':
        text = this.clipDiamond;
        break;
      case 'CORN':
      default:
        text = this.clipCorn;
        break;
    }
    return text;
  }

  public get clipCircle() {
    const clipSize = (this.range().length + 1.5) * this.gridSize;
    const circle = 'circle(' + clipSize + 'px)';
    return circle;
  }

  public get clipCorn() {
    this._clipVersion();
    let clipCorn = 'polygon(' + this.clipAreaCorn.clip01x + 'px ' + this.clipAreaCorn.clip01y + 'px, ';
    clipCorn += this.clipAreaCorn.clip02x + 'px ' + this.clipAreaCorn.clip02y + 'px, ';
    clipCorn += this.clipAreaCorn.clip03x + 'px ' + this.clipAreaCorn.clip03y + 'px, ';
    clipCorn += this.clipAreaCorn.clip04x + 'px ' + this.clipAreaCorn.clip04y + 'px, ';
    clipCorn += this.clipAreaCorn.clip05x + 'px ' + this.clipAreaCorn.clip05y + 'px, ';
    clipCorn += this.clipAreaCorn.clip06x + 'px ' + this.clipAreaCorn.clip06y + 'px, ';
    clipCorn += this.clipAreaCorn.clip07x + 'px ' + this.clipAreaCorn.clip07y + 'px, ';
    clipCorn += this.clipAreaCorn.clip08x + 'px ' + this.clipAreaCorn.clip08y + 'px, ';
    clipCorn += this.clipAreaCorn.clip09x + 'px ' + this.clipAreaCorn.clip09y + 'px)';
    return clipCorn;
  }

  public get clipLine() {
    this._clipVersion();
    let clipLine = 'polygon(' + this.clipAreaLine.clip01x + 'px ' + this.clipAreaLine.clip01y + 'px, ';
    clipLine += this.clipAreaLine.clip02x + 'px ' + this.clipAreaLine.clip02y + 'px, ';
    clipLine += this.clipAreaLine.clip03x + 'px ' + this.clipAreaLine.clip03y + 'px, ';
    clipLine += this.clipAreaLine.clip04x + 'px ' + this.clipAreaLine.clip04y + 'px)';
    return clipLine;
  }

  public get clipSquare() {
    this._clipVersion();
    let clipSquare = 'polygon(' + this.clipAreaSquare.clip01x + 'px ' + this.clipAreaSquare.clip01y + 'px, ';
    clipSquare += this.clipAreaSquare.clip02x + 'px ' + this.clipAreaSquare.clip02y + 'px, ';
    clipSquare += this.clipAreaSquare.clip03x + 'px ' + this.clipAreaSquare.clip03y + 'px, ';
    clipSquare += this.clipAreaSquare.clip04x + 'px ' + this.clipAreaSquare.clip04y + 'px)';
    return clipSquare;
  }

  public get clipDiamond() {
    this._clipVersion();
    let clipDiamond = 'polygon(' + this.clipAreaDiamond.clip01x + 'px ' + this.clipAreaDiamond.clip01y + 'px, ';
    clipDiamond += this.clipAreaDiamond.clip02x + 'px ' + this.clipAreaDiamond.clip02y + 'px, ';
    clipDiamond += this.clipAreaDiamond.clip03x + 'px ' + this.clipAreaDiamond.clip03y + 'px, ';
    clipDiamond += this.clipAreaDiamond.clip04x + 'px ' + this.clipAreaDiamond.clip04y + 'px)';
    return clipDiamond;
  }

  private clipAreaCorn: ClipAreaCorn = {
    clip01x: 0, // 根本始点
    clip01y: 0,
    clip02x: 100,
    clip02y: 0,
    clip03x: 100,
    clip03y: 100,
    clip04x: 0,
    clip04y: 100,
    clip05x: 0, // 先端部
    clip05y: 0,
    clip06x: 0, // 折り返し
    clip06y: 0,
    clip07x: 0,
    clip07y: 0,
    clip08x: 0,
    clip08y: 0,
    clip09x: 0,
    clip09y: 0,
  };

  private clipAreaLine: ClipAreaLine = {
    clip01x: 0, // 左下
    clip01y: 0,
    clip02x: 0, // 左上
    clip02y: -50,
    clip03x: 100, // 右上
    clip03y: -50,
    clip04x: 100, // 右下
    clip04y: 0,
  };

  private clipAreaSquare: ClipAreaSquare = {
    clip01x: 0, // 左下
    clip01y: 0,
    clip02x: 0, // 左上
    clip02y: -50,
    clip03x: 100, // 右上
    clip03y: -50,
    clip04x: 100, // 右下
    clip04y: 0,
  };

  private clipAreaDiamond: ClipAreaDiamond = {
    clip01x: 0, // 左下
    clip01y: 0,
    clip02x: 0, // 左上
    clip02y: -50,
    clip03x: 100, // 右上
    clip03y: -50,
    clip04x: 100, // 右下
    clip04y: 0,
  };

  get tableSelecter(): TableSelecter {
    return this.tabletopService.tableSelecter;
  }
  get currentTable(): GameTable {
    return this.tabletopService.currentTable;
  }

  readonly name = computed(() => {
    this.objectChange.versionOf(this.range().identifier)();
    return this.range().name;
  });
  get width(): number {
    return this.adjustMinBounds(this.range().width);
  }
  get length(): number {
    return this.adjustMinBounds(this.range().length);
  }
  get opacity(): number {
    return this.range().opacity;
  }
  readonly imageFile = computed(() => {
    this.objectChange.fileVersion();
    const range = this.range();
    this.objectChange.versionOf(range.identifier)();
    return range.imageFile;
  });
  get isLock(): boolean {
    return this.range().isLock;
  }
  set isLock(isLock: boolean) {
    this.range().isLock = isLock;
  }

  get areaQuadrantSize(): number {
    const w = this.width < 1 ? 1 : this.width;
    const l = this.length < 1 ? 1 : this.length;
    return Math.ceil(Math.sqrt(w * w + l * l)) + 1;
  }

  get rotateDeg(): number {
    let data2: string;
    const rotateEl = this.rotate();
    if (!rotateEl) {
      return 0;
    }
    if (!rotateEl.nativeElement) {
      return 0;
    }
    if (!rotateEl.nativeElement.style) {
      return 0;
    }
    if (!rotateEl.nativeElement.style.transform) {
      return 0;
    }

    const data = rotateEl.nativeElement.style.transform;
    data2 = data.replace(/[^0-9.-]/g, '');
    if (!data2) data2 = '0.0';
    return parseFloat(data2);
  }

  get altitude(): number {
    return this.range().altitude;
  }
  set altitude(altitude: number) {
    this.range().altitude = altitude;
  }

  get isFollowed(): boolean {
    return this.objectStore.get(this.range().followingCharctorIdentifier) != null;
  }
  get followingCharactor(): GameCharacter | null {
    const obj = this.objectStore.get(this.range().followingCharctorIdentifier);
    return obj instanceof GameCharacter ? obj : null;
  }
  get elevation(): number {
    return this.altitude;
  }
  get textShadowCss(): string {
    return '0px 0px 2px #fff, 0px 0px 2px #fff, 0px 0px 2px #fff';
  }

  get isAltitudeIndicate(): boolean {
    return this.range().isAltitudeIndicate;
  }
  set isAltitudeIndicate(isAltitudeIndicate: boolean) {
    this.range().isAltitudeIndicate = isAltitudeIndicate;
  }

  private readonly _clipVersion = signal(0);

  readonly gridSize = 50;
  math = Math;

  viewRotateX = 50;
  readonly viewRotateZ = computed(() => this.uiSignalService.tableViewRotation()?.z ?? 10);

  readonly movableOption = signal<MovableOption>({});
  readonly rotableOption = signal<RotableOption>({});

  private input: InputHandler | null = null;
  private _initialized = false;

  constructor() {
    this.objectChange.objectChanged$.subscribe((e) => {
      if (!this._initialized) return;
      const object = this.objectStore.get(e.identifier);
      if (!this.range() || !object) return;
      this.setRange();

      if (object.identifier == this.range().followingCharctorIdentifier) {
        this.range().following();
        this.setRange();
      }
    }, this.destroyRef);
    effect(() => {
      this.movableOption.set({
        tabletopObject: this.range(),
        transformCssOffset: 'translateZ(0.25px)',
        colideLayers: ['terrain'],
      });
      this.rotableOption.set({
        tabletopObject: this.range(),
      });
    });
    afterNextRender(() => {
      this._initialized = true;
      this.input = new InputHandler(this.elementRef.nativeElement);
      this.input.onStart = (e) => this.onInputStart(e);
      this.setRange();
    });
    this.destroyRef.onDestroy(() => {
      if (this.input) this.input.destroy();
    });
  }

  onDragstart(e: DragEvent) {
    e.stopPropagation();
    e.preventDefault();
  }

  onInputStart(_e: MouseEvent | TouchEvent) {
    this.input?.cancel();
  }

  onContextMenu(e: Event) {
    e.stopPropagation();
    e.preventDefault();

    if (!this.pointerDeviceService.isAllowedToOpenContextMenu) return;
    const menuPosition = this.pointerDeviceService.pointers[0];
    const objectPosition = this.coordinateService.calcTabletopLocalCoordinate();
    const menuArray = buildRangeContextMenu(
      this.range()!,
      this.gridSize,
      objectPosition,
      this.objectStore,
      this.inventoryService,
      this.tabletopActionService,
      () => this.dockingWindowOpen(),
      (r) => this.showDetail(r)
    );
    this.contextMenuService.open(menuPosition, menuArray, this.name());
  }

  dockingWindowOpen() {
    const coordinate = this.pointerDeviceService.pointers[0];
    const option: PanelOption = {
      left: coordinate.x - 250,
      top: coordinate.y - 175,
      width: 350,
      height: 200,
    };
    option.title = 'キャラクターに追従';
    const component = this.panelService.open<RangeDockingCharacterComponent>(RangeDockingCharacterComponent, option);
    component.tabletopObject = this.range();
  }

  onMove() {
    SoundEffect.play(PresetSound.cardPick);
  }

  onMoved() {
    SoundEffect.play(PresetSound.cardPut);
  }

  private adjustMinBounds(value: number, min: number = 0): number {
    return value < min ? min : value;
  }

  private showDetail(gameObject: RangeArea) {
    const coordinate = this.pointerDeviceService.pointers[0];
    let title = '射程範囲設定';
    if (gameObject.name.length) title += ' - ' + gameObject.name;
    const option: PanelOption = {
      title: title,
      left: coordinate.x - 200,
      top: coordinate.y - 150,
      width: 400,
      height: 300,
    };
    this.panelService.openLazy(
      () =>
        import('@axe/features/character/game-character-sheet/game-character-sheet.component').then(
          (m) => m.GameCharacterSheetComponent
        ),
      option,
      (component) => (component.tabletopObject = gameObject)
    );
  }

  private setRange() {
    const gridCanvasRef = this.gridCanvas();
    const rangeCanvasRef = this.rangeCanvas();
    if (!gridCanvasRef || !rangeCanvasRef) return;
    if (!gridCanvasRef.nativeElement.getContext('2d')) return;
    const render = new RangeRender(gridCanvasRef.nativeElement, rangeCanvasRef.nativeElement);

    const setting: RangeRenderSetting = {
      areaWidth: this.areaQuadrantSize * 2,
      areaHeight: this.areaQuadrantSize * 2,
      range: this.length < 1 ? 1 : this.length,
      width: this.width < 0.1 ? 0.1 : this.width,
      centerX: this.range().location.x,
      centerY: this.range().location.y,
      gridSize: this.gridSize,
      type: this.range().type,
      gridColor: this.range().gridColor,
      rangeColor: this.range().rangeColor,
      fanDegree: 0.0,
      degree: this.rotateDeg,
      offSetX: this.range().offSetX,
      offSetY: this.range().offSetY,
      fillOutLine: this.range().fillOutLine,
      gridType: this.currentTable.gridType,
      isDocking: this.objectStore.get(this.range().followingCharctorIdentifier) !== null,
    };

    switch (this.range().type) {
      case 'LINE':
        this.clipAreaLine = render.renderLine(setting);
        break;
      case 'CIRCLE':
        render.renderCircle(setting);
        break;
      case 'SQUARE':
        this.clipAreaSquare = render.renderSquare(setting);
        break;
      case 'DIAMOND':
        this.clipAreaDiamond = render.renderDiamond(setting);
        break;
      case 'CORN':
      default:
        this.clipAreaCorn = render.renderCorn(setting);
        break;
    }

    const opacity: number = this.range().opacity;
    gridCanvasRef.nativeElement.style.opacity = opacity + '';
    this._clipVersion.update((v) => v + 1);
  }
}
