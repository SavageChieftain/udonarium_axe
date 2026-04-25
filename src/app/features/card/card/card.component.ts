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
} from '@angular/core';
import { PointerDeviceService } from '@axe/core/input/pointer-device.service';
import { ImageService } from '@axe/core/storage/image.service';
import { ImageFile, imageFileEqual } from '@axe/core/storage/image-file';
import { ObjectStore } from '@axe/core/sync/object-store';
import { Card, CardState } from '@axe/domain/card/card';
import { CardStack } from '@axe/domain/card/card-stack';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { buildCardContextMenu } from '@axe/features/card/card/card-context-menu';
import { InputHandler } from '@axe/shared/directives/input-handler';
import { MovableOption } from '@axe/shared/directives/movable.directive';
import { MovableDirective } from '@axe/shared/directives/movable.directive';
import { RotableOption } from '@axe/shared/directives/rotable.directive';
import { RotableDirective } from '@axe/shared/directives/rotable.directive';
import { SafePipe } from '@axe/shared/pipes/safe.pipe';
import { ObjectChangeService } from '@axe/shared/sync/object-change.service';
import { TabletopService } from '@axe/shared/tabletop/tabletop.service';
import { ContextMenuService } from '@axe/shared/ui/context-menu.service';
import { PanelOption, PanelService } from '@axe/shared/ui/panel.service';
import { SelectionSignalService } from '@axe/shared/ui/selection-signal.service';

@Component({
  selector: 'card',
  templateUrl: './card.component.html',
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
        height: auto;
        width: auto;
        backface-visibility: hidden;
        -moz-user-select: none;
        -webkit-user-select: none;
        user-select: none;
        -moz-user-drag: none;
        -webkit-user-drag: none;
        min-width: 25px;
        min-height: 25px;
      }

      .component-content {
        backface-visibility: hidden;
        height: 100%;
        width: 100%;
        box-sizing: border-box;
      }

      .card-image {
        display: block;
        top: 0;
        left: 0;
        bottom: 0;
        right: 0;
        margin: auto;
        height: auto;
        width: 100%;
      }

      .lock-icon-mark {
        position: absolute;
        width: 28px;
        height: 28px;
        box-sizing: border-box;
        z-index: 1;
        padding: 2px;
        background-color: #444;
        border-radius: 100%;
        color: #ccc;
        font-size: 8px;
        top: 5px;
      }

      .thumbnail-transform {
        position: absolute;
        transform: scale(0.9);
      }

      .is-translucent {
        filter: opacity(0.8);
      }

      .rotate-grab {
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
        z-index: 11;
      }

      .rotate-grab {
        display: none;
      }

      .component:hover .rotate-grab {
        display: block;
        opacity: 0.5;
      }

      .component:active .rotate-grab {
        display: none;
      }

      .component .rotate-grab:hover,
      .component .rotate-grab:active {
        display: block;
        opacity: 1;
      }

      .of-left-top {
        top: -10px;
        left: -10px;
        border-radius: 14px;
      }

      .of-left-bottom {
        bottom: -10px;
        left: -10px;
        border-radius: 14px;
      }

      .of-right-bottom {
        bottom: -10px;
        right: -10px;
        border-radius: 14px;
      }

      .of-right-top {
        top: -10px;
        right: -10px;
        border-radius: 14px;
      }

      .border-bg {
        position: absolute;
        box-sizing: border-box;
        border-radius: 8px;
        background-color: rgba(204, 204, 204, 0.5);
        top: -2px;
        left: -2px;
        right: -2px;
        bottom: -2px;
        z-index: -1;
      }

      .border-bg {
        display: none;
      }

      .component:hover .border-bg {
        display: block;
      }

      .component:active .border-bg {
        display: none;
      }

      .name-tag {
        box-sizing: border-box;
        font-size: 15px;
        padding: 3px 9px;
        border-radius: 24px;
        position: absolute;
        top: 0;
        color: whitesmoke !important;
        opacity: 0.9;
        z-index: 10;
      }

      .has-length-limit {
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        max-width: 18em;
      }

      .is-nowrap {
        white-space: nowrap;
      }

      .is-black-background {
        color: #ccc;
        background-color: rgba(30, 30, 30, 0.8);
      }

      .material-icons {
        display: none;
      }
      .component:hover .material-icons,
      .component:active .material-icons {
        display: inline;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MovableDirective, RotableDirective, NgStyle, SafePipe],
  host: {
    class: 'block',
    '(carddrop)': 'onCardDrop($event)',
    '(dragstart)': 'onDragstart($event)',
    '(contextmenu)': 'onContextMenu($event)',
  },
})
export class CardComponent {
  private readonly contextMenuService = inject(ContextMenuService);
  private readonly panelService = inject(PanelService);
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly tabletopService = inject(TabletopService);
  private readonly imageService = inject(ImageService);
  private readonly pointerDeviceService = inject(PointerDeviceService);
  private readonly objectStore = inject(ObjectStore);
  private readonly selectionSignalService = inject(SelectionSignalService);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly destroyRef = inject(DestroyRef);

  readonly card = input.required<Card>();

  get dispLockMark(): boolean {
    return this.card().dispLockMark;
  }
  set dispLockMark(disp: boolean) {
    this.card().dispLockMark = disp;
  }

  get isLock(): boolean {
    return this.card().isLock;
  }
  set isLock(isLock: boolean) {
    this.card().isLock = isLock;
  }

  readonly name = computed(() => {
    this.objectChange.versionOf(this.card().identifier)();
    this.objectChange.networkVersion();
    if (this.card().owner) {
      const cursor = PeerCursor.findByUserId(this.card().owner);
      if (cursor) this.objectChange.versionOf(cursor.identifier)();
    }
    return this.card().name;
  });
  get state(): CardState {
    return this.card().state;
  }
  set state(state: CardState) {
    this.card().state = state;
  }
  get rotate(): number {
    return this.card().rotate;
  }
  set rotate(rotate: number) {
    this.card().rotate = rotate;
  }
  get owner(): string {
    return this.card().owner;
  }
  set owner(owner: string) {
    this.card().owner = owner;
  }
  get zindex(): number {
    return this.card().zindex;
  }
  get size(): number {
    return this.adjustMinBounds(this.card().size);
  }

  get isHand(): boolean {
    return this.card().isHand;
  }
  get isFront(): boolean {
    return this.card().isFront;
  }
  get isVisible(): boolean {
    return this.card().isVisible;
  }
  get hasOwner(): boolean {
    return this.card().hasOwner;
  }
  get ownerIsOnline(): boolean {
    return this.card().ownerIsOnline;
  }
  get ownerName(): string {
    return this.card().ownerName;
  }

  readonly imageFile = computed(
    () => {
      this.objectChange.fileVersion();
      const card = this.card();
      this.objectChange.versionOf(card.identifier)();
      return this.imageService.getSkeletonOr(card.imageFile);
    },
    { equal: imageFileEqual() }
  );
  get frontImage(): ImageFile {
    return this.imageService.getSkeletonOr(this.card().frontImage);
  }
  get backImage(): ImageFile {
    return this.imageService.getSkeletonOr(this.card().backImage);
  }

  private iconHiddenTimer: NodeJS.Timeout | null = null;
  readonly isIconHidden = signal(false);

  readonly gridSize = 50;

  readonly movableOption = signal<MovableOption>({});
  readonly rotableOption = signal<RotableOption>({});

  private doubleClickTimer: NodeJS.Timeout | null = null;
  private doubleClickPoint = { x: 0, y: 0 };

  private input: InputHandler | null = null;

  constructor() {
    effect(() => {
      const card = this.card();
      this.movableOption.set({
        tabletopObject: card,
        transformCssOffset: 'translateZ(0.15px)',
        colideLayers: ['terrain'],
      });
      this.rotableOption.set({
        tabletopObject: card,
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

  onCardDrop(e: Event) {
    const ce = e as CustomEvent;
    if (this.card() === ce.detail || (!(ce.detail instanceof Card) && !(ce.detail instanceof CardStack))) {
      return;
    }
    e.stopPropagation();
    e.preventDefault();

    if (ce.detail instanceof CardStack) {
      const cardStack: CardStack = ce.detail;
      const distance: number =
        (cardStack.location.x - this.card().location.x) ** 2 +
        (cardStack.location.y - this.card().location.y) ** 2 +
        (cardStack.posZ - this.card().posZ) ** 2;
      if (distance < 25 ** 2) {
        cardStack.location.x = this.card().location.x;
        cardStack.location.y = this.card().location.y;
        cardStack.posZ = this.card().posZ;
        cardStack.putOnBottom(this.card());
      }
    }
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
    this.input!.onEnd = null;
  }

  onDoubleClick() {
    this.stopDoubleClickTimer();
    const distance =
      (this.doubleClickPoint.x - this.input!.pointer.x) ** 2 + (this.doubleClickPoint.y - this.input!.pointer.y) ** 2;
    if (distance < 10 ** 2) {
      if (this.ownerIsOnline && !this.isHand) return;
      this.state = this.isVisible && !this.isHand ? CardState.BACK : CardState.FRONT;
      this.owner = '';
      SoundEffect.play(PresetSound.cardDraw);
    }
  }

  onDragstart(e: DragEvent) {
    e.stopPropagation();
    e.preventDefault();
  }

  onInputStart(e: MouseEvent | TouchEvent) {
    this.startDoubleClickTimer(e);
    this.card().toTopmost();
    this.startIconHiddenTimer();
  }

  onContextMenu(e: Event) {
    e.stopPropagation();
    e.preventDefault();
    if (!this.pointerDeviceService.isAllowedToOpenContextMenu) return;
    const position = this.pointerDeviceService.pointers[0];
    this.contextMenuService.open(
      position,
      buildCardContextMenu(this.card(), this.gridSize, {
        onCreateStack: () => this.createStack(),
        onShowDetail: () => this.showDetail(this.card()),
      }),
      this.isVisible ? this.name() : 'カード'
    );
  }

  onMove() {
    this.input!.cancel();
    SoundEffect.play(PresetSound.cardPick);
  }

  onMoved() {
    SoundEffect.play(PresetSound.cardPut);
    this.dispatchCardDropEvent();
  }

  private createStack() {
    const cardStack = CardStack.create('山札');
    cardStack.location.x = this.card().location.x;
    cardStack.location.y = this.card().location.y;
    cardStack.posZ = this.card().posZ;
    cardStack.location.name = this.card().location.name;
    cardStack.rotate = this.rotate;
    cardStack.zindex = this.card().zindex;

    const cards: Card[] = this.tabletopService.cards.filter((card) => {
      const distance: number =
        (card.location.x - this.card().location.x) ** 2 +
        (card.location.y - this.card().location.y) ** 2 +
        (card.posZ - this.card().posZ) ** 2;
      return distance < 100 ** 2;
    });

    cards.sort((a, b) => {
      if (a.zindex < b.zindex) return 1;
      if (a.zindex > b.zindex) return -1;
      return 0;
    });

    for (const card of cards) {
      cardStack.putOnBottom(card);
    }
  }

  private dispatchCardDropEvent() {
    const element: HTMLElement = this.elementRef.nativeElement;
    const parent = element.parentElement!;
    const children = parent.children;
    const event = new CustomEvent('carddrop', { detail: this.card(), bubbles: true });
    for (let i = 0; i < children.length; i++) {
      children[i].dispatchEvent(event);
    }
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

  private showDetail(gameObject: Card) {
    this.selectionSignalService.selectObject(gameObject.identifier, gameObject.aliasName);
    const coordinate = this.pointerDeviceService.pointers[0];
    let title = 'カード設定';
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
}
