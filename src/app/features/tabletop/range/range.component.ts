import { NgStyle } from '@angular/common';
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
import { GameObjectInventoryService } from '@axe/application/inventory/game-object-inventory.service';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { TabletopService } from '@axe/application/tabletop/tabletop.service';
import { TabletopActionService } from '@axe/application/tabletop/tabletop-action.service';
import { ContextMenuService } from '@axe/application/ui/context-menu.service';
import { PanelOption, PanelService } from '@axe/application/ui/panel.service';
import { UiSignalService } from '@axe/application/ui/ui-signal.service';
import { CoordinateService } from '@axe/core/input/coordinate.service';
import { PointerDeviceService } from '@axe/core/input/pointer-device.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import { GameTable } from '@axe/domain/tabletop/game-table';
import { isHexGrid } from '@axe/domain/tabletop/hex-geometry';
import { RangeArea } from '@axe/domain/tabletop/range';
import { TableSelecter } from '@axe/domain/tabletop/table-selecter';
import { buildRangeContextMenu } from '@axe/features/tabletop/range/range-context-menu';
import {
  ClipAreaCorn,
  ClipAreaHexagon,
  ClipAreaLine,
  ClipAreaPentagon,
  ClipAreaSquare,
  ClipAreaTriangle,
  RangeRender,
  RangeRenderSetting,
} from '@axe/features/tabletop/range/range-render'; // 注意別のコンポーネントフォルダにアクセスしてグリッドの描画を行っている
import { clipAreaToPolygonCss, clipCircleCss } from '@axe/features/tabletop/range/range-render-util';
import { RangeDockingCharacterComponent } from '@axe/features/tabletop/range-docking-character/range-docking-character.component';
import { InputHandler } from '@axe/ui/directives/input-handler';
import { MovableOption } from '@axe/ui/directives/movable.directive';
import { MovableDirective } from '@axe/ui/directives/movable.directive';
import { RotableOption } from '@axe/ui/directives/rotable.directive';
import { RotableDirective } from '@axe/ui/directives/rotable.directive';
import { TooltipDirective } from '@axe/ui/directives/tooltip.directive';
import { translateZCss, Z_OFFSET_RANGE_PX } from '@axe/ui/tabletop/z-offset';

@Component({
  selector: 'range',
  templateUrl: './range.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MovableDirective, TooltipDirective, RotableDirective, NgStyle],
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

  /** clip-path 文字列を `_clipVersion` 連動の 1 つの computed に集約。setRange() が
   *  ClipArea を書き換えた後 `_clipVersion.update()` で本 computed が再評価される。
   *  形状ごとの分岐は data dispatch、polygon 文字列構築は `clipAreaToPolygonCss` へ委譲。 */
  readonly clipPath = computed<string>(() => {
    this._clipVersion();
    const range = this.range();
    switch (range.type) {
      case 'LINE':
        return clipAreaToPolygonCss(this.clipAreaLine);
      case 'CIRCLE':
        return clipCircleCss(range.length, this.gridSize);
      case 'SQUARE':
        return clipAreaToPolygonCss(this.clipAreaSquare);
      case 'TRIANGLE':
        return clipAreaToPolygonCss(this.clipAreaTriangle);
      case 'PENTAGON':
        return clipAreaToPolygonCss(this.clipAreaPentagon);
      case 'HEXAGON':
        return clipAreaToPolygonCss(this.clipAreaHexagon);
      case 'CORN':
      default:
        return clipAreaToPolygonCss(this.clipAreaCorn);
    }
  });

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

  private clipAreaTriangle: ClipAreaTriangle = {
    clip01x: 0,
    clip01y: -100,
    clip02x: 100,
    clip02y: 100,
    clip03x: -100,
    clip03y: 100,
  };

  private clipAreaPentagon: ClipAreaPentagon = {
    clip01x: 0,
    clip01y: -100,
    clip02x: 100,
    clip02y: -30,
    clip03x: 60,
    clip03y: 100,
    clip04x: -60,
    clip04y: 100,
    clip05x: -100,
    clip05y: -30,
  };

  private clipAreaHexagon: ClipAreaHexagon = {
    clip01x: 0,
    clip01y: -100,
    clip02x: 100,
    clip02y: -50,
    clip03x: 100,
    clip03y: 50,
    clip04x: 0,
    clip04y: 100,
    clip05x: -100,
    clip05y: 50,
    clip06x: -100,
    clip06y: -50,
  };

  get tableSelecter(): TableSelecter {
    return this.tabletopService.tableSelecter;
  }
  get currentTable(): GameTable {
    return this.tabletopService.currentTable;
  }

  /** range の identifier に対する versionOf 購読をまとめる内部 helper。
   *  下位 @SyncVar 単位の computed が全てこの version を読むことで OnPush 配線を統一する。 */
  private readonly rangeVersion = computed(() => this.objectChange.versionOf(this.range().identifier)());

  readonly name = computed(() => {
    this.rangeVersion();
    return this.range().name;
  });
  readonly width = computed(() => {
    this.rangeVersion();
    return this.adjustMinBounds(this.range().width);
  });
  readonly length = computed(() => {
    this.rangeVersion();
    return this.adjustMinBounds(this.range().length);
  });
  readonly opacity = computed(() => {
    this.rangeVersion();
    return this.range().opacity;
  });
  readonly imageFile = computed(() => {
    this.objectChange.fileVersion();
    this.rangeVersion();
    return this.range().imageFile;
  });
  readonly isLock = computed(() => {
    this.rangeVersion();
    return this.range().isLock;
  });

  readonly areaQuadrantSize = computed(() => {
    const w = this.width() < 1 ? 1 : this.width();
    const l = this.length() < 1 ? 1 : this.length();
    return Math.ceil(Math.sqrt(w * w + l * l)) + 1;
  });

  readonly isRotatableRangeType = computed(() => {
    this.rangeVersion();
    return ['LINE', 'CORN', 'SQUARE', 'TRIANGLE', 'PENTAGON', 'HEXAGON'].includes(this.range().type);
  });

  readonly usesSingleRotateGrab = computed(() => {
    this.rangeVersion();
    return ['SQUARE', 'TRIANGLE', 'PENTAGON', 'HEXAGON'].includes(this.range().type);
  });

  readonly rotateGrabDistancePx = computed(() => Math.max(1, this.length()) * this.gridSize);

  readonly singleRotateGrabX = 0;

  readonly singleRotateGrabY = computed(() => -Math.max(1, this.length()) * this.gridSize);

  readonly altitude = computed(() => {
    this.rangeVersion();
    return this.range().altitude;
  });

  readonly isFollowed = computed(() => {
    this.rangeVersion();
    return this.objectStore.get(this.range().followingCharctorIdentifier) != null;
  });
  readonly followingCharactor = computed(() => {
    this.rangeVersion();
    const obj = this.objectStore.get(this.range().followingCharctorIdentifier);
    return obj instanceof GameCharacter ? obj : null;
  });
  /** altitude エイリアス（テンプレートの "現在高度" 表記用に意味分かれている）。 */
  readonly elevation = this.altitude;
  readonly textShadowCss = '0px 0px 2px #fff, 0px 0px 2px #fff, 0px 0px 2px #fff';

  readonly isAltitudeIndicate = computed(() => {
    this.rangeVersion();
    return this.range().isAltitudeIndicate;
  });

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
    // Range 自身・追従キャラ・テーブル設定の変更時だけ再描画。
    // 部屋内の無関係なオブジェクト変更で毎回 canvas 再描画するとオブジェクトの多い部屋で重くなる。
    // input.required<RangeArea> は `_initialized` (afterNextRender 後) より前に読むと NG0950 で落ちるため、
    // getIdentifiers / listener どちらも初期化前は no-op で返す。
    this.objectChange.onObjectChangedFor(
      () => {
        if (!this._initialized) return [];
        const range = this.range();
        return [range.identifier, range.followingCharctorIdentifier, this.currentTable.identifier];
      },
      (e) => {
        if (!this._initialized) return;
        const range = this.range();
        if (e.identifier === range.followingCharctorIdentifier) range.following();
        this.setRange();
      },
      this.destroyRef
    );
    effect(() => {
      const range = this.range();
      // range の posX は起点（キャスター中心）を表す。
      // ヘクスグリッドでは canvas 中心 X = posX のため snapOrigin は (0, 0) でキャスターが
      // ヘクス中心に直接スナップする。スクエアグリッドでは gridSize/2 オフセットでセル中心へスナップ。
      const half = this.gridSize / 2;
      const snapXY = isHexGrid(this.currentTable.gridType) ? 0 : half;
      this.movableOption.set({
        tabletopObject: range,
        transformCssOffset: translateZCss(Z_OFFSET_RANGE_PX),
        colideLayers: ['terrain'],
        snapOrigin: { x: snapXY, y: snapXY },
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

  onRotateChanged(degree: number) {
    this.setRange(degree);
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

  private setRange(degree: number = this.range().rotate) {
    const gridCanvasRef = this.gridCanvas();
    const rangeCanvasRef = this.rangeCanvas();
    if (!gridCanvasRef || !rangeCanvasRef) return;
    if (!gridCanvasRef.nativeElement.getContext('2d')) return;
    const render = new RangeRender(gridCanvasRef.nativeElement, rangeCanvasRef.nativeElement);

    const w = this.width();
    const l = this.length();
    const setting: RangeRenderSetting = {
      areaWidth: this.areaQuadrantSize() * 2,
      areaHeight: this.areaQuadrantSize() * 2,
      range: l < 1 ? 1 : l,
      width: w < 0.1 ? 0.1 : w,
      centerX: this.range().location.x,
      centerY: this.range().location.y,
      gridSize: this.gridSize,
      type: this.range().type,
      gridColor: this.range().gridColor,
      rangeColor: this.range().rangeColor,
      fanDegree: 0.0,
      degree,
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
      case 'TRIANGLE':
        this.clipAreaTriangle = render.renderTriangle(setting);
        break;
      case 'PENTAGON':
        this.clipAreaPentagon = render.renderPentagon(setting);
        break;
      case 'HEXAGON':
        this.clipAreaHexagon = render.renderHexagon(setting);
        break;
      case 'CORN':
      default:
        this.clipAreaCorn = render.renderCorn(setting);
        break;
    }

    this._clipVersion.update((v) => v + 1);
  }
}
