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
    gridType: GridType;
    s: number;
    n: number;
    L: number;
  } | null>(() => {
    this.objectChange.versionOf(this.tabletopService.tableSelecter.identifier)();
    this.objectChange.versionOf(this.tabletopService.currentTable.identifier)();
    const gridType = this.tabletopService.currentTable.gridType;
    if (gridType !== GridType.HEX_VERTICAL && gridType !== GridType.HEX_HORIZONTAL) return null;
    const g = this.gridSize;
    return { gridType, s: g / Math.sqrt(3), n: this.size, L: this.size * g };
  });

  /**
   * evenodd SVG パスで外側ヘクスから内側ヘクスを抜いたリング clip-path を返す。
   * border ではなく background + ring clip で描くことで、ヘクスの辺に沿ったきれいな装飾を実現する。
   */
  private buildHexRingClipPath(
    params: { gridType: GridType; s: number; n: number; L: number },
    borderWidth: number
  ): string {
    const { gridType, s, n, L } = params;
    const cx = L / 2;
    const cy = L / 2;
    const sqrt3 = Math.sqrt(3);
    const si = s - (2 * borderWidth) / sqrt3; // inset circumradius
    const f = (v: number): string => v.toFixed(2);

    if (gridType === GridType.HEX_VERTICAL) {
      // flat-top: R=横方向外接円半径, Hh=縦方向の半分
      const R = n * s;
      const Hh = L / 2;
      const Ri = n * si;
      const Hhi = (n * sqrt3 * si) / 2;
      const outer =
        `M ${f(cx + R)} ${f(cy)} ` +
        `L ${f(cx + R / 2)} ${f(cy - Hh)} L ${f(cx - R / 2)} ${f(cy - Hh)} ` +
        `L ${f(cx - R)} ${f(cy)} ` +
        `L ${f(cx - R / 2)} ${f(cy + Hh)} L ${f(cx + R / 2)} ${f(cy + Hh)} Z`;
      // 内側は逆回り (CCW) で穴を作る
      const inner =
        `M ${f(cx + Ri)} ${f(cy)} ` +
        `L ${f(cx + Ri / 2)} ${f(cy + Hhi)} L ${f(cx - Ri / 2)} ${f(cy + Hhi)} ` +
        `L ${f(cx - Ri)} ${f(cy)} ` +
        `L ${f(cx - Ri / 2)} ${f(cy - Hhi)} L ${f(cx + Ri / 2)} ${f(cy - Hhi)} Z`;
      return `path(evenodd, "${outer} ${inner}")`;
    } else {
      // pointy-top: R=縦方向外接円半径, Wh=横方向の半分
      const R = n * s;
      const Wh = L / 2;
      const Ri = n * si;
      const Whi = (n * sqrt3 * si) / 2;
      const outer =
        `M ${f(cx)} ${f(cy - R)} ` +
        `L ${f(cx + Wh)} ${f(cy - R / 2)} L ${f(cx + Wh)} ${f(cy + R / 2)} ` +
        `L ${f(cx)} ${f(cy + R)} ` +
        `L ${f(cx - Wh)} ${f(cy + R / 2)} L ${f(cx - Wh)} ${f(cy - R / 2)} Z`;
      const inner =
        `M ${f(cx)} ${f(cy - Ri)} ` +
        `L ${f(cx - Whi)} ${f(cy - Ri / 2)} L ${f(cx - Whi)} ${f(cy + Ri / 2)} ` +
        `L ${f(cx)} ${f(cy + Ri)} ` +
        `L ${f(cx + Whi)} ${f(cy + Ri / 2)} L ${f(cx + Whi)} ${f(cy - Ri / 2)} Z`;
      return `path(evenodd, "${outer} ${inner}")`;
    }
  }

  pedestalStyle(borderColor: string): Record<string, string> {
    const params = this.pedestalHexParams();
    if (params) {
      const clipPath = this.buildHexRingClipPath(params, 6);
      return { background: borderColor, clipPath, border: 'none', borderRadius: '0' };
    }
    return { border: `solid 6px ${borderColor}` };
  }

  get pedestalOuterStyle(): Record<string, string> {
    const params = this.pedestalHexParams();
    if (params) {
      const clipPath = this.buildHexRingClipPath(params, 2);
      return { background: '#212121', clipPath, border: 'none', borderRadius: '0' };
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
