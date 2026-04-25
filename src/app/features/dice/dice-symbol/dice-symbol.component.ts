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
} from '@angular/core';
import { PointerDeviceService } from '@axe/core/input/pointer-device.service';
import { ImageService } from '@axe/core/storage/image.service';
import { imageFileEqual } from '@axe/core/storage/image-file';
import { ObjectStore } from '@axe/core/sync/object-store';
import { DiceSymbol } from '@axe/domain/dice/dice-symbol';
import { callRollDiceSymbol } from '@axe/domain/domain-events';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { buildDiceSymbolContextMenu } from '@axe/features/dice/dice-symbol/dice-symbol-context-menu';
import { InputHandler } from '@axe/shared/directives/input-handler';
import { MovableOption } from '@axe/shared/directives/movable.directive';
import { MovableDirective } from '@axe/shared/directives/movable.directive';
import { RotableOption } from '@axe/shared/directives/rotable.directive';
import { RotableDirective } from '@axe/shared/directives/rotable.directive';
import { SafePipe } from '@axe/shared/pipes/safe.pipe';
import { ObjectChangeService } from '@axe/shared/sync/object-change.service';
import { ContextMenuService } from '@axe/shared/ui/context-menu.service';
import { PanelOption, PanelService } from '@axe/shared/ui/panel.service';
import { SelectionSignalService } from '@axe/shared/ui/selection-signal.service';

@Component({
  selector: 'dice-symbol',
  templateUrl: './dice-symbol.component.html',
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
        border-radius: 22px;
      }

      .pedestal-inner {
        backface-visibility: hidden;
        position: absolute;
        height: 100%;
        width: 100%;
        box-sizing: border-box;
        border: solid 6px rgb(216, 139, 75);
        border-radius: 5px;
      }

      .is-gray-border {
        border-color: #999;
      }

      .pedestal-outer {
        backface-visibility: hidden;
        position: absolute;
        height: 100%;
        width: 100%;
        box-sizing: border-box;
        border: solid 2px #212121;
        border-radius: 5px;
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

      .is-black-mask {
        filter: brightness(0);
      }

      .is-harf-black-mask {
        filter: brightness(0.5);
      }

      .name-tag {
        box-sizing: border-box;
        font-size: 15px;
        padding: 3px 9px;
        border-radius: 6px;
        position: absolute;
        top: -30px;
      }

      .owner-tag {
        box-sizing: border-box;
        font-size: 12px;
        padding: 3px 9px;
        border-radius: 6px;
        position: absolute;
        top: -55px;
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
      }

      .fornt-tag {
        backface-visibility: hidden;
      }

      .back-tag {
        position: absolute;
        top: 3px;
        backface-visibility: hidden;
        transform: rotateY(-180deg);
      }

      .backface-off {
        backface-visibility: hidden;
      }

      .has-length-limit {
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        max-width: 18em;
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

      .component:hover .material-icons,
      .component:active .material-icons {
        display: inline;
      }

      .lock-icon {
        font-size: 15px;
        vertical-align: middle;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MovableDirective, RotableDirective, NgClass, NgStyle, SafePipe],
  host: {
    '(dragstart)': 'onDragstart($event)',
    '(contextmenu)': 'onContextMenu($event)',
  },
})
export class DiceSymbolComponent {
  private readonly panelService = inject(PanelService);
  private readonly contextMenuService = inject(ContextMenuService);
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly imageService = inject(ImageService);
  private readonly pointerDeviceService = inject(PointerDeviceService);
  private readonly objectStore = inject(ObjectStore);
  private readonly selectionSignalService = inject(SelectionSignalService);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly destroyRef = inject(DestroyRef);

  readonly diceSymbol = input.required<DiceSymbol>();

  get face(): string {
    return this.diceSymbol().face;
  }
  set face(face: string) {
    this.diceSymbol().face = face;
  }
  get owner(): string {
    return this.diceSymbol().owner;
  }
  set owner(owner: string) {
    this.diceSymbol().owner = owner;
  }
  get rotate(): number {
    return this.diceSymbol().rotate;
  }
  set rotate(rotate: number) {
    this.diceSymbol().rotate = rotate;
  }

  readonly name = computed(() => {
    this.objectChange.versionOf(this.diceSymbol().identifier)();
    this.objectChange.networkVersion();
    if (this.diceSymbol().owner) {
      const cursor = PeerCursor.findByUserId(this.diceSymbol().owner);
      if (cursor) this.objectChange.versionOf(cursor.identifier)();
    }
    return this.diceSymbol().name;
  });
  get size(): number {
    return this.adjustMinBounds(this.diceSymbol().size);
  }

  get imageHeignt(): number {
    return this.diceSymbol().komaImageHeight;
  }
  get specifyImageFlag(): boolean {
    return this.diceSymbol().specifyKomaImageFlag;
  }

  get faces(): string[] {
    return this.diceSymbol().faces;
  }
  readonly imageFile = computed(
    () => {
      this.objectChange.fileVersion();
      const diceSymbol = this.diceSymbol();
      this.objectChange.versionOf(diceSymbol.identifier)();
      return this.imageService.getEmptyOr(diceSymbol.imageFile);
    },
    { equal: imageFileEqual() }
  );

  get isMine(): boolean {
    return this.diceSymbol().isMine;
  }
  get hasOwner(): boolean {
    return this.diceSymbol().hasOwner;
  }
  get ownerName(): string {
    return this.diceSymbol().ownerName;
  }
  get isVisible(): boolean {
    return this.diceSymbol().isVisible;
  }

  get isLock(): boolean {
    return this.diceSymbol().isLock;
  }
  set isLock(isLock: boolean) {
    this.diceSymbol().isLock = isLock;
  }

  readonly animeState = signal<'inactive' | 'active'>('inactive');

  private iconHiddenTimer: NodeJS.Timeout | null = null;
  readonly isIconHidden = signal(false);

  readonly gridSize = 50;

  readonly movableOption = signal<MovableOption>({});
  readonly rotableOption = signal<RotableOption>({});

  private doubleClickTimer: NodeJS.Timeout | null = null;
  private doubleClickPoint = { x: 0, y: 0 };

  private input: InputHandler | null = null;

  constructor() {
    this.objectChange.rollDiceSymbol$.subscribe((event) => {
      if (event.identifier === this.diceSymbol().identifier) {
        this.animeState.set('inactive');
        setTimeout(() => {
          this.animeState.set('active');
        });
      }
    }, this.destroyRef);
    effect(() => {
      const diceSymbol = this.diceSymbol();
      this.movableOption.set({
        tabletopObject: diceSymbol,
        transformCssOffset: 'translateZ(1.0px)',
        colideLayers: ['terrain'],
      });
      this.rotableOption.set({
        tabletopObject: diceSymbol,
      });
    });
    afterNextRender(() => {
      this.input = new InputHandler(this.elementRef.nativeElement);
      this.input.onStart = (e) => this.onInputStart(e);
    });
    this.destroyRef.onDestroy(() => {
      clearTimeout(this.doubleClickTimer ?? undefined);
      clearTimeout(this.iconHiddenTimer ?? undefined);
      if (this.input) this.input.destroy();
    });
  }

  onDragstart(e: DragEvent) {
    e.stopPropagation();
    e.preventDefault();
  }

  onDiceRollEnd() {
    this.animeState.set('inactive');
  }

  onInputStart(e: MouseEvent | TouchEvent) {
    this.startDoubleClickTimer(e);
    this.startIconHiddenTimer();
  }

  startDoubleClickTimer(e: MouseEvent | TouchEvent) {
    if (!this.doubleClickTimer) {
      this.stopDoubleClickTimer();
      this.doubleClickTimer = setTimeout(() => this.stopDoubleClickTimer(), (e as TouchEvent).touches ? 500 : 300);
      this.doubleClickPoint = this.input!.pointer;
      return;
    }

    if ((e as TouchEvent).touches) {
      this.input!.onEnd = () => this.onDoubleClick();
    } else {
      this.onDoubleClick();
    }
  }

  stopDoubleClickTimer() {
    clearTimeout(this.doubleClickTimer ?? undefined);
    this.doubleClickTimer = null;
    if (this.input) this.input.onEnd = null;
  }

  onDoubleClick() {
    this.stopDoubleClickTimer();
    const distance =
      (this.doubleClickPoint.x - this.input!.pointer.x) ** 2 + (this.doubleClickPoint.y - this.input!.pointer.y) ** 2;
    if (distance < 10 ** 2) {
      if (this.isVisible) this.diceRoll();
    }
  }

  onContextMenu(e: Event) {
    e.stopPropagation();
    e.preventDefault();

    if (!this.pointerDeviceService.isAllowedToOpenContextMenu) return;
    const position = this.pointerDeviceService.pointers[0];
    this.contextMenuService.open(
      position,
      buildDiceSymbolContextMenu(this.diceSymbol(), this.gridSize, {
        onDiceRoll: () => this.diceRoll(),
        onShowDetail: () => this.showDetail(this.diceSymbol()),
      }),
      this.name()
    );
  }

  onMove() {
    SoundEffect.play(PresetSound.dicePick);
  }

  onMoved() {
    SoundEffect.play(PresetSound.dicePut);
  }

  diceRoll(): string {
    callRollDiceSymbol(this.diceSymbol().identifier);
    SoundEffect.play(PresetSound.diceRoll1);
    return this.diceSymbol().diceRoll();
  }

  showDetail(gameObject: DiceSymbol) {
    this.selectionSignalService.selectObject(gameObject.identifier, gameObject.aliasName);
    const coordinate = this.pointerDeviceService.pointers[0];
    let title = 'ダイスシンボル設定';
    if (gameObject.name.length) title += ' - ' + gameObject.name;
    const option: PanelOption = {
      title: title,
      left: coordinate.x - 300,
      top: coordinate.y - 300,
      width: 600,
      height: 600,
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

  private startIconHiddenTimer() {
    clearTimeout(this.iconHiddenTimer ?? undefined);
    this.iconHiddenTimer = setTimeout(() => {
      this.iconHiddenTimer = null;
      this.isIconHidden.set(false);
    }, 300);
    this.isIconHidden.set(true);
  }

  private adjustMinBounds(value: number, min: number = 0): number {
    return value < min ? min : value;
  }
}
