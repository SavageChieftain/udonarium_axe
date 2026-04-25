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
import { imageFileEqual } from '@axe/core/storage/image-file';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import { GridSnapStyle } from '@axe/domain/tabletop/game-table';
import { isFlatTopGrid, isHexGrid } from '@axe/domain/tabletop/hex-geometry';
import { buildGameCharacterContextMenu } from '@axe/features/character/game-character/game-character-context-menu';
import {
  buildHexRingClipPath,
  calcHexFlowerParams,
  HexFlowerParams,
} from '@axe/features/character/game-character/hex-pedestal-geometry';
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
  styles: [
    `
      .is-grab {
        cursor: -moz-grab;
        cursor: -webkit-grab;
        cursor: grab;
      }

      .is-grabbing {
        cursor: -moz-grabbing;
        cursor: -webkit-grabbing;
        cursor: grabbing;
      }

      .is-3d {
        -webkit-transform-style: preserve-3d;
        transform-style: preserve-3d;
      }

      .will-change {
        will-change: opacity;
      }

      .backface-off {
        backface-visibility: hidden;
      }

      .is-transition {
        -webkit-transition: -webkit-transform 132ms linear;
        transition: transform 132ms linear;
      }

      .is-pointer-events-none {
        pointer-events: none;
      }

      .is-pointer-events-auto {
        pointer-events: auto;
      }

      .component {
        position: absolute;
        height: 50px;
        width: 50px;

        -moz-user-select: none;
        -webkit-user-select: none;
        user-select: none;
        -moz-user-drag: none;
        -webkit-user-drag: none;
      }

      .component-content {
        width: 100%;
        height: 100%;
      }

      .pedestal-grab {
        z-index: -1;
        backface-visibility: hidden;
        position: absolute;
        top: -22px;
        left: -6px;
        height: calc(100% + 44px);
        width: calc(100% + 12px);
        cursor: default;
        border-radius: 37px;
      }

      .pedestal-grab-border {
        pointer-events: none;
        width: 100%;
        height: 100%;
        box-sizing: border-box;
        border-top: solid 28px #999;
        border-left: solid 12px #999;
        border-right: solid 12px #ccc;
        border-bottom: solid 28px #ccc;
        border-radius: 37px;
      }

      .pedestal-inner {
        backface-visibility: hidden;
        position: absolute;
        height: 100%;
        width: 100%;
        box-sizing: border-box;
        border: solid 6px #ffcc80;
        border-radius: 25px;
      }

      .pedestal-outer {
        backface-visibility: hidden;
        position: absolute;
        height: 100%;
        width: 100%;
        box-sizing: border-box;
        border: solid 2px #212121;
        border-radius: 25px;
      }

      .upright-transform {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        transform: rotateX(-90deg) translateY(-50%);
      }

      .is-fit-width {
        height: auto;
        width: 100%;
      }

      .fill-frame {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
      }

      .image {
        bottom: 0;
        left: 0;
        right: 0;
        margin: auto;
        height: auto;
        vertical-align: bottom;
      }

      .buff-tag {
        box-sizing: border-box;
        padding: 3px 9px;
        border: 1px #222 solid;
        border-radius: 12px;
        position: absolute;
        margin: auto;
        top: -35px;
      }

      .is-buff-background {
        color: #222;
        background-color: rgba(240, 229, 215, 0.8);
      }

      .name-tag {
        box-sizing: border-box;
        font-size: 15px;
        padding: 3px 9px;
        border-radius: 24px;
        position: absolute;
        top: -30px;
      }

      .rotate-frame {
        bottom: 0;
        left: 0;
        right: 0;
      }

      .rotate-inner {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;

        width: 100%;
        height: auto;
      }

      .is-nowrap {
        white-space: nowrap;
      }

      .is-black-background {
        color: #ccc;
        background-color: rgba(30, 30, 30, 0.8);
        backface-visibility: hidden;
      }

      .backface-off {
        backface-visibility: hidden;
      }

      .has-length-limit {
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        max-width: 24em;
      }

      .rotate-grab-icon {
        position: absolute;
        width: 28px;
        height: 28px;
        box-sizing: border-box;
        cursor: -moz-default;
        cursor: -webkit-default;
        cursor: default;
        z-index: 1;
        padding: 2px;
        background-color: #cccccc;
        border-radius: 100%;
        color: #444;
        font-size: 8px;
      }

      .of-top {
        top: -42px;
      }

      .of-bottom {
        bottom: -30px;
      }

      .of-front {
        position: absolute;
        width: 24px;
        left: 0;
        right: 0;
        bottom: 0;
        margin: auto;
        color: #444;
      }

      .of-back {
        position: absolute;
        width: 24px;
        top: 0;
        left: 0;
        right: 0;
        margin: auto;
        color: #444;
      }

      .rotate-grab {
        opacity: 0;
      }

      .component:hover .rotate-grab {
        opacity: 0.5;
      }

      .component:active .rotate-grab {
        opacity: 0;
      }

      .component .rotate-grab:hover,
      .component .rotate-grab:active {
        opacity: 1;
      }

      .material-icons {
        display: none;
      }

      .altitude-indicator {
        font-size: 10px;
      }

      .elevation-indicator,
      .altitude-indicator {
        padding-left: 2px;
        color: black;
        text-shadow: #f5f5f5 0px 0px 3px;
        backface-visibility: hidden;
      }

      .elevation-indicator {
        font-weight: bolder;
        font-size: 12px;
      }

      .component:hover .material-icons,
      .component:active .material-icons {
        display: inline;
      }

      .component.focused {
        animation-name: focused;
        animation-timing-function: ease;
        animation-duration: 1s;
      }

      .lock-icon {
        font-size: 15px;
        vertical-align: middle;
      }

      .buff-folding-dummy {
        width: 1px;
        height: 1px;
      }

      .buff-folding-icon {
        font-size: 12px;
        vertical-align: middle;
        text-align: center;
        margin-left: 100%;
        position: absolute;
        width: 20px;
        height: 20px;
        left: -20px;
        top: -20px;
        background-color: rgba(240, 229, 215, 0.8);
        box-sizing: border-box;
        border: 1px #222 solid;
        border-radius: 4px;
        cursor: pointer;
      }

      .target-icon {
        width: 30px;
        font-size: 20px;
        left: 6px;
        box-sizing: border-box;
        position: absolute;
      }

      .scrolldown4 {
        position: absolute;
        animation: arrowmove 1s ease-in-out infinite;
      }

      /* 矢印の描写 */
      .scrolldown4:before {
        top: -60px;
      }

      /*描画位置*/
      .scrolldown4:after {
        content: '';
        position: absolute;
        top: -80px;
      }

      .target-icon-buff {
        width: 30px;
        font-size: 20px;
        margin-left: 50%;
        left: -10px;
        box-sizing: border-box;
        position: absolute;
        margin-top: 1px;
      }

      .target-icon-buff2 {
        width: 30px;
        font-size: 20px;
        margin-left: 50%;
        left: -20px;
        box-sizing: border-box;
        position: absolute;
        margin-top: 1px;
      }

      .scrolldown5 {
        position: absolute;
        animation: arrowmove2 1s ease-in-out infinite;
      }

      /* 矢印の描写 */
      .scrolldown5:before {
        top: -30px;
      }

      /*描画位置*/
      .scrolldown5:after {
        content: '';
        position: absolute;
        top: -50px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MovableDirective, RotableDirective, NgStyle, GameDataElementBuffComponent, SafePipe],
  host: {
    class: 'block',
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
        snapStyle: char.size % 1 !== 0 ? GridSnapStyle.VERTEX : undefined,
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
  readonly imageFile = computed(
    () => {
      this.objectChange.fileVersion();
      const char = this.gameCharacter();
      if (!char) throw new Error('gameCharacter is not set');
      this.objectChange.versionOf(char.identifier)();
      return char.imageFile;
    },
    { equal: imageFileEqual() }
  );
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
  readonly pedestalHexParams = computed<HexFlowerParams | null>(() => {
    this.objectChange.versionOf(this.tabletopService.tableSelecter.identifier)();
    this.objectChange.versionOf(this.tabletopService.currentTable.identifier)();
    const char = this.gameCharacter();
    if (!char) return null;
    this.objectChange.versionOf(char.identifier)();
    const gridType = this.tabletopService.currentTable.gridType;
    if (!isHexGrid(gridType)) return null;
    return calcHexFlowerParams(this.size, this.gridSize, isFlatTopGrid(gridType));
  });

  pedestalStyle(borderColor: string): Record<string, string> {
    const params = this.pedestalHexParams();
    if (params) {
      const { outline, bbox, L } = params;
      const W = bbox.maxX - bbox.minX;
      const H = bbox.maxY - bbox.minY;
      const clipPath = buildHexRingClipPath(outline, bbox, 6);
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
      const { outline, bbox, L } = params;
      const W = bbox.maxX - bbox.minX;
      const H = bbox.maxY - bbox.minY;
      const clipPath = buildHexRingClipPath(outline, bbox, 2);
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
      (component) => component.character.set(gameObject)
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
