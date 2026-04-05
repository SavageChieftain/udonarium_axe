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
import { PointerDeviceService } from '@axe/core/input/pointer-device.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import { GridType } from '@axe/domain/tabletop/game-table';
import { buildGameCharacterContextMenu } from '@axe/features/character/game-character/game-character-context-menu';
import { GameCharacterBuffViewComponent } from '@axe/features/character/game-character-buff-view/game-character-buff-view.component';
import { GameCharacterSheetComponent } from '@axe/features/character/game-character-sheet/game-character-sheet.component';
import { GameDataElementBuffComponent } from '@axe/features/character/game-data-element-buff/game-data-element-buff.component';
import { InputHandler } from '@axe/shared/directives/input-handler';
import { MovableOption } from '@axe/shared/directives/movable.directive';
import { MovableDirective } from '@axe/shared/directives/movable.directive';
import { RotableOption } from '@axe/shared/directives/rotable.directive';
import { RotableDirective } from '@axe/shared/directives/rotable.directive';
import { GameObjectInventoryService } from '@axe/shared/inventory/game-object-inventory.service';
import { SafePipe } from '@axe/shared/pipes/safe.pipe';
import { ObjectChangeService } from '@axe/shared/sync/object-change.service';
import { TabletopService } from '@axe/shared/tabletop/tabletop.service';
import { ContextMenuService } from '@axe/shared/ui/context-menu.service';
import { PanelOption, PanelService } from '@axe/shared/ui/panel.service';
import { SelectionSignalService } from '@axe/shared/ui/selection-signal.service';
import { UiSignalService } from '@axe/shared/ui/ui-signal.service';

@Component({
  selector: 'game-character',
  templateUrl: './game-character.component.html',
  styleUrls: ['./game-character.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MovableDirective, RotableDirective, NgStyle, GameDataElementBuffComponent, SafePipe],
  host: {
    '(dragstart)': 'onDragstart($event)',
    '(contextmenu)': 'onContextMenu($event)',
  },
})
export class GameCharacterComponent {
  private readonly contextMenuService = inject(ContextMenuService);
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly panelService = inject(PanelService);
  private readonly pointerDeviceService = inject(PointerDeviceService);
  private readonly objectStore = inject(ObjectStore);
  private readonly selectionSignalService = inject(SelectionSignalService);
  private readonly inventoryService = inject(GameObjectInventoryService);
  private readonly uiSignalService = inject(UiSignalService);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly tabletopService = inject(TabletopService);
  private readonly destroyRef = inject(DestroyRef);

  readonly isTargeted = computed(() => {
    this.uiSignalService.targetChange();
    return this.gameCharacter()?.targeted ?? false;
  });

  constructor() {
    effect(() => {
      const highlight = this.selectionSignalService.highlightedObject();
      const char = this.gameCharacter();
      if (!highlight || !char) return;
      if (char.identifier !== highlight.identifier) return;
      if (char.location.name != 'table') return;

      // アニメーション開始のタイマーが既にあってアニメーション開始前（ごくわずかな間）ならば何もしない
      if (this.highlightTimer != null) return;

      // アニメーション中であればアニメーションを初期化
      if (this.rootElementRef().nativeElement.classList.contains('focused')) {
        clearTimeout(this.unhighlightTimer);
        this.rootElementRef().nativeElement.classList.remove('focused');
      }

      // アニメーション開始処理タイマー
      this.highlightTimer = setTimeout(() => {
        this.highlightTimer = undefined;
        this.rootElementRef().nativeElement.classList.add('focused');
      }, 0);

      // アニメーション終了処理タイマー
      this.unhighlightTimer = setTimeout(() => {
        this.unhighlightTimer = undefined;
        this.rootElementRef().nativeElement.classList.remove('focused');
      }, 1010);
    });

    effect(() => {
      const char = this.gameCharacter();
      if (!char) return;
      this.movableOption.set({
        tabletopObject: char,
        transformCssOffset: 'translateZ(1.0px)',
        colideLayers: ['terrain'],
      });
      this.rotableOption.set({
        tabletopObject: char,
      });
    });

    afterNextRender(() => {
      this.input = new InputHandler(this.elementRef.nativeElement);
      if (this.input) this.input.onStart = (e) => this.onInputStart(e);
    });

    this.destroyRef.onDestroy(() => {
      clearTimeout(this.highlightTimer);
      clearTimeout(this.unhighlightTimer);
      if (this.input) this.input.destroy();
    });
  }

  readonly gameCharacter = input<GameCharacter | null>(null);
  readonly rootElementRef = viewChild.required<ElementRef<HTMLElement>>('root');

  get isLock(): boolean {
    const char = this.gameCharacter();
    return char?.isLock ?? false;
  }
  set isLock(isLock: boolean) {
    const char = this.gameCharacter();
    if (char) char.isLock = isLock;
  }

  readonly name = computed(() => {
    const char = this.gameCharacter();
    if (!char) return '';
    this.objectChange.versionOf(char.identifier)();
    return char.name;
  });
  get size(): number {
    const char = this.gameCharacter();
    return this.adjustMinBounds(char?.size ?? 0);
  }
  get altitude(): number {
    const char = this.gameCharacter();
    return char?.altitude ?? 0;
  }
  set altitude(altitude: number) {
    const char = this.gameCharacter();
    if (char) char.altitude = altitude;
  }
  readonly imageFile = computed(() => {
    this.objectChange.fileVersion();
    const char = this.gameCharacter();
    if (!char) throw new Error('gameCharacter is not set');
    this.objectChange.versionOf(char.identifier)();
    return char.imageFile;
  });
  get rotate(): number {
    const char = this.gameCharacter();
    return char?.rotate ?? 0;
  }
  set rotate(rotate: number) {
    const char = this.gameCharacter();
    if (char) char.rotate = rotate;
  }
  get roll(): number {
    const char = this.gameCharacter();
    return char?.roll ?? 0;
  }
  set roll(roll: number) {
    const char = this.gameCharacter();
    if (char) char.roll = roll;
  }
  get isDropShadow(): boolean {
    const char = this.gameCharacter();
    return char?.isDropShadow ?? false;
  }
  set isDropShadow(isDropShadow: boolean) {
    const char = this.gameCharacter();
    if (char) char.isDropShadow = isDropShadow;
  }
  get isAltitudeIndicate(): boolean {
    const char = this.gameCharacter();
    return char?.isAltitudeIndicate ?? false;
  }
  set isAltitudeIndicate(isAltitudeIndicate: boolean) {
    const char = this.gameCharacter();
    if (char) char.isAltitudeIndicate = isAltitudeIndicate;
  }

  protected readonly foldingBuff = signal(false);
  readonly gridSize = 50;
  math = Math;

  viewRotateX = 50;
  readonly viewRotateZ = computed(() => this.uiSignalService.tableViewRotation()?.z ?? 10);

  readonly movableOption = signal<MovableOption>({});
  private input: InputHandler | null = null;

  readonly rotableOption = signal<RotableOption>({});

  /** ヘクスマップ時のジオメトリパラメータ。スクエアマップ時は null。 */
  readonly pedestalHexParams = computed<{
    outline: { x: number; y: number }[];
    bbox: { minX: number; minY: number; maxX: number; maxY: number };
    L: number;
    g: number;
  } | null>(() => {
    this.objectChange.versionOf(this.tabletopService.tableSelecter.identifier)();
    this.objectChange.versionOf(this.tabletopService.currentTable.identifier)();
    const char = this.gameCharacter();
    if (!char) return null;
    this.objectChange.versionOf(char.identifier)();
    const gridType = this.tabletopService.currentTable.gridType;
    if (gridType !== GridType.HEX_VERTICAL && gridType !== GridType.HEX_HORIZONTAL) return null;
    const g = this.gridSize;
    const n = Math.min(this.size, 6);
    const L = this.size * g;
    const isFlatTop = gridType === GridType.HEX_VERTICAL;
    const outline = this.buildHexFlowerOutline(n, g, isFlatTop);
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const v of outline) {
      if (v.x < minX) minX = v.x;
      if (v.y < minY) minY = v.y;
      if (v.x > maxX) maxX = v.x;
      if (v.y > maxY) maxY = v.y;
    }
    return { outline, bbox: { minX, minY, maxX, maxY }, L, g };
  });

  /**
   * ヘクス距離 ≤ (size-1) の全セルの集合体（花形）の外周アウトラインを計算する。
   * 座標はヘクス中心 (0,0) 基準のピクセル座標。
   * パスは画面上で CW (時計回り)。
   */
  private buildHexFlowerOutline(size: number, gridSize: number, isFlatTop: boolean): { x: number; y: number }[] {
    const s = gridSize / Math.sqrt(3);
    const g = gridSize;
    const d = size - 1;

    // キューブ座標でヘクス距離 ≤ d のセルを列挙
    const cells = new Set<string>();
    for (let q = -d; q <= d; q++) {
      const rMin = Math.max(-d, -q - d);
      const rMax = Math.min(d, -q + d);
      for (let r = rMin; r <= rMax; r++) {
        cells.add(`${q},${r}`);
      }
    }

    // キューブ座標 → ピクセル座標
    const cubeToPixel = (q: number, r: number): { x: number; y: number } => {
      if (isFlatTop) {
        return { x: 1.5 * s * q, y: (g / 2) * q + g * r };
      } else {
        return { x: g * q + (g / 2) * r, y: 1.5 * s * r };
      }
    };

    // 各辺インデックスに対応するキューブ座標上の隣接方向
    const neighborDirs: number[][] = isFlatTop
      ? [
          [1, 0],
          [0, 1],
          [-1, 1],
          [-1, 0],
          [0, -1],
          [1, -1],
        ]
      : [
          [1, -1],
          [1, 0],
          [0, 1],
          [-1, 1],
          [-1, 0],
          [0, -1],
        ];

    const startAngle = isFlatTop ? 0 : -Math.PI / 2;
    const hexVertex = (cx: number, cy: number, i: number): { x: number; y: number } => {
      const angle = startAngle + (i * Math.PI) / 3;
      return { x: cx + s * Math.cos(angle), y: cy + s * Math.sin(angle) };
    };

    // 境界辺を収集し、始点座標 → 辺インデックスのマップを構築
    type Segment = { from: { x: number; y: number }; to: { x: number; y: number } };
    const segments: Segment[] = [];
    const fromMap = new Map<string, number>();
    const vtxKey = (p: { x: number; y: number }): string => `${Math.round(p.x * 1000)},${Math.round(p.y * 1000)}`;

    for (const key of cells) {
      const [q, r] = key.split(',').map(Number);
      const { x: cx, y: cy } = cubeToPixel(q, r);
      for (let e = 0; e < 6; e++) {
        const [dq, dr] = neighborDirs[e];
        if (!cells.has(`${q + dq},${r + dr}`)) {
          const from = hexVertex(cx, cy, e);
          const to = hexVertex(cx, cy, (e + 1) % 6);
          const idx = segments.length;
          segments.push({ from, to });
          fromMap.set(vtxKey(from), idx);
        }
      }
    }

    // 辺を頂点共有順に連結して閉パスを構築
    const path: { x: number; y: number }[] = [];
    const visited = new Array(segments.length).fill(false);
    let current = 0;
    for (let i = 0; i < segments.length; i++) {
      visited[current] = true;
      path.push(segments[current].from);
      const next = fromMap.get(vtxKey(segments[current].to));
      if (next === undefined || visited[next]) break;
      current = next;
    }

    return path;
  }

  /**
   * CW ポリゴンを内側に bw ピクセルだけインセットする。
   * 各頂点で隣接辺の法線ベクトルのバイセクタ方向に移動。
   */
  private insetPolygon(vertices: { x: number; y: number }[], bw: number): { x: number; y: number }[] {
    const n = vertices.length;
    const result: { x: number; y: number }[] = [];
    for (let i = 0; i < n; i++) {
      const prev = vertices[(i - 1 + n) % n];
      const curr = vertices[i];
      const next = vertices[(i + 1) % n];
      const d1x = curr.x - prev.x;
      const d1y = curr.y - prev.y;
      const l1 = Math.sqrt(d1x * d1x + d1y * d1y);
      const d2x = next.x - curr.x;
      const d2y = next.y - curr.y;
      const l2 = Math.sqrt(d2x * d2x + d2y * d2y);
      // CW パスの内側法線: (-dy, dx) / |d|
      const n1x = -d1y / l1;
      const n1y = d1x / l1;
      const n2x = -d2y / l2;
      const n2y = d2x / l2;
      const bx = n1x + n2x;
      const by = n1y + n2y;
      const dot = n1x * bx + n1y * by; // = 1 + cos(angle between normals)
      if (Math.abs(dot) < 1e-10) {
        result.push({ x: curr.x + n1x * bw, y: curr.y + n1y * bw });
      } else {
        const k = bw / dot;
        result.push({ x: curr.x + bx * k, y: curr.y + by * k });
      }
    }
    return result;
  }

  /**
   * evenodd SVG パスで外側花形から内側花形を抜いたリング clip-path を返す。
   */
  private buildHexRingClipPath(
    params: {
      outline: { x: number; y: number }[];
      bbox: { minX: number; minY: number; maxX: number; maxY: number };
    },
    borderWidth: number
  ): string {
    const { outline, bbox } = params;
    // ペデスタル要素座標に変換（左上を原点にシフト）
    const outer = outline.map((v) => ({ x: v.x - bbox.minX, y: v.y - bbox.minY }));
    const inner = this.insetPolygon(outer, borderWidth);
    const f = (v: number): string => v.toFixed(2);

    let outerPath = `M ${f(outer[0].x)} ${f(outer[0].y)}`;
    for (let i = 1; i < outer.length; i++) {
      outerPath += ` L ${f(outer[i].x)} ${f(outer[i].y)}`;
    }
    outerPath += ' Z';

    let innerPath = `M ${f(inner[0].x)} ${f(inner[0].y)}`;
    for (let i = 1; i < inner.length; i++) {
      innerPath += ` L ${f(inner[i].x)} ${f(inner[i].y)}`;
    }
    innerPath += ' Z';

    return `path(evenodd, "${outerPath} ${innerPath}")`;
  }

  pedestalStyle(borderColor: string): Record<string, string> {
    const params = this.pedestalHexParams();
    if (params) {
      const { bbox, L } = params;
      const W = bbox.maxX - bbox.minX;
      const H = bbox.maxY - bbox.minY;
      const clipPath = this.buildHexRingClipPath(params, 6);
      return {
        background: borderColor,
        clipPath,
        border: 'none',
        borderRadius: '0',
        width: `${W}px`,
        height: `${H}px`,
        left: `${bbox.minX + L / 2}px`,
        top: `${bbox.minY + L / 2}px`,
      };
    }
    return { border: `solid 6px ${borderColor}` };
  }

  get pedestalOuterStyle(): Record<string, string> {
    const params = this.pedestalHexParams();
    if (params) {
      const { bbox, L } = params;
      const W = bbox.maxX - bbox.minX;
      const H = bbox.maxY - bbox.minY;
      const clipPath = this.buildHexRingClipPath(params, 2);
      return {
        background: '#212121',
        clipPath,
        border: 'none',
        borderRadius: '0',
        width: `${W}px`,
        height: `${H}px`,
        left: `${bbox.minX + L / 2}px`,
        top: `${bbox.minY + L / 2}px`,
      };
    }
    return {};
  }

  get pedestalGrabStyle(): Record<string, string> {
    const params = this.pedestalHexParams();
    if (params) {
      const { bbox, L } = params;
      // 花形を包む円の半径 = bboxの中心からの最大距離 + マージン
      const halfW = (bbox.maxX - bbox.minX) / 2;
      const halfH = (bbox.maxY - bbox.minY) / 2;
      const radius = Math.sqrt(halfW * halfW + halfH * halfH) + 12;
      const diameter = radius * 2;
      return {
        width: `${diameter}px`,
        height: `${diameter}px`,
        left: `${L / 2 - radius}px`,
        top: `${L / 2 - radius}px`,
        borderRadius: '50%',
      };
    }
    return {};
  }

  get pedestalGrabBorderStyle(): Record<string, string> {
    const params = this.pedestalHexParams();
    if (params) {
      return {
        borderTop: 'solid 16px #999',
        borderLeft: 'solid 16px #999',
        borderRight: 'solid 16px #ccc',
        borderBottom: 'solid 16px #ccc',
        borderRadius: '50%',
      };
    }
    return {};
  }

  private highlightTimer: ReturnType<typeof setTimeout> | undefined;
  private unhighlightTimer: ReturnType<typeof setTimeout> | undefined;

  get elevation(): number {
    const char = this.gameCharacter();
    if (!char) return 0;
    return +((char.posZ + this.altitude * this.gridSize) / this.gridSize).toFixed(1);
  }

  get chatBubbleAltitude(): number {
    /*
    let cos =  Math.cos(this.roll * Math.PI / 180);
    let sin = Math.abs(Math.sin(this.roll * Math.PI / 180));
    if (cos < 0.5) cos = 0.5;
    if (sin < 0.5) sin = 0.5;
    const altitude1 = (this.characterImageHeight + (this.name != '' ? 24 : 0)) * cos + 4;
    const altitude2 = (this.characterImageWidth / 2) * sin + 4 + this.characterImageWidth / 2;
    let ret = altitude1 > altitude2 ? altitude1 : altitude2;
    this.gameCharacter()!.chatBubbleAltitude = ret;
*/
    const ret = 0;
    return ret;
  }

  onDragstart(e: DragEvent) {
    e.stopPropagation();
    e.preventDefault();
  }

  onInputStart(_e: MouseEvent | TouchEvent) {
    if (this.input) this.input.cancel();
  }

  onContextMenu(e: Event) {
    e.stopPropagation();
    e.preventDefault();

    const char = this.gameCharacter();
    if (!char) return;

    if (!this.pointerDeviceService.isAllowedToOpenContextMenu) return;

    const position = this.pointerDeviceService.pointers[0];
    this.contextMenuService.open(
      position,
      buildGameCharacterContextMenu(char, this.gridSize, this.inventoryService, {
        onShowDetail: () => this.showDetail(char),
        onShowChatPalette: () => this.showChatPalette(char),
        onShowRemoteController: () => this.showRemoteController(char),
        onShowBuffEdit: () => this.showBuffEdit(char),
      }),
      this.name()
    );
  }

  onMove() {
    SoundEffect.play(PresetSound.piecePick);
  }

  onMoved() {
    SoundEffect.play(PresetSound.piecePut);
  }

  checkKey(event: KeyboardEvent | MouseEvent) {
    //イベント処理
    const key_event = (event || window.event) as KeyboardEvent | MouseEvent;
    const key_shift = key_event.shiftKey;
    const _key_ctrl = key_event.ctrlKey;
    const key_alt = key_event.altKey;
    const _key_meta = key_event.metaKey;
    //キーに対応した処理

    if (key_alt) {
      const char = this.gameCharacter();
      if (char) char.targeted = char.targeted ? false : true;
    }

    if (key_shift && key_alt) {
      const objects = this.objectStore.getObjects(GameCharacter);
      for (const object of objects) {
        object.targeted = false;
        this.uiSignalService.notifyTargetChange(object.identifier, object.aliasName);
      }
    }

    //出力
  }

  private adjustMinBounds(value: number, min: number = 0): number {
    return value < min ? min : value;
  }

  private showDetail(gameObject: GameCharacter) {
    const coordinate = this.pointerDeviceService.pointers[0];
    let title = 'キャラクターシート';
    if (gameObject.name.length) title += ' - ' + gameObject.name;
    const option: PanelOption = {
      title: title,
      left: coordinate.x - 400,
      top: coordinate.y - 300,
      width: 800,
      height: 600,
    };
    const component = this.panelService.open<GameCharacterSheetComponent>(GameCharacterSheetComponent, option);
    component.tabletopObject = gameObject;
  }

  private showChatPalette(gameObject: GameCharacter) {
    const coordinate = this.pointerDeviceService.pointers[0];
    const option: PanelOption = {
      left: coordinate.x - 250,
      top: coordinate.y - 175,
      width: 615,
      height: 350,
    };
    this.panelService.openLazy(
      () => import('@axe/features/chat/chat-palette/chat-palette.component').then((m) => m.ChatPaletteComponent),
      option,
      (component) => component.character.set(gameObject)
    );
  }

  private showRemoteController(gameObject: GameCharacter) {
    const coordinate = this.pointerDeviceService.pointers[0];
    const option: PanelOption = {
      left: coordinate.x - 250,
      top: coordinate.y - 175,
      width: 700,
      height: 600,
    };
    this.panelService.openLazy(
      () =>
        import('@axe/features/controller/remote-controller/remote-controller.component').then(
          (m) => m.RemoteControllerComponent
        ),
      option,
      (component) => (component.character = gameObject)
    );
  }

  private showBuffEdit(gameObject: GameCharacter) {
    const coordinate = this.pointerDeviceService.pointers[0];
    const option: PanelOption = {
      left: coordinate.x,
      top: coordinate.y,
      width: 420,
      height: 300,
    };
    option.title = gameObject.name + 'のバフ編集';
    const component = this.panelService.open<GameCharacterBuffViewComponent>(GameCharacterBuffViewComponent, option);
    component.character.set(gameObject);
  }

  protected foldingBuffFlag(flag: boolean) {
    this.foldingBuff.set(flag);
  }

  get buffNum(): number {
    const char = this.gameCharacter();
    const children = char?.buffDataElement?.children;
    if (!children || children.length === 0) {
      return 0;
    }
    return children[0].children.length;
  }
}
