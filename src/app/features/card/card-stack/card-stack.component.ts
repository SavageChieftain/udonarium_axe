import { NgClass, NgStyle } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { RolePermissionService } from '@axe/application/permission/role-permission.service';
import { ImageService } from '@axe/application/storage/image.service';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { TabletopService } from '@axe/application/tabletop/tabletop.service';
import { ContextMenuSeparator, ContextMenuService } from '@axe/application/ui/context-menu.service';
import { ModalService } from '@axe/application/ui/modal.service';
import { MultiMovableService } from '@axe/application/ui/multi-movable.service';
import { tryBuildMultiSelectionContextMenu } from '@axe/application/ui/multi-selection-context-menu';
import { PanelOption, PanelService } from '@axe/application/ui/panel.service';
import { SelectionSignalService } from '@axe/application/ui/selection-signal.service';
import { buildSurfaceSwitchContextMenu } from '@axe/application/ui/surface-switch-context-menu';
import { PointerDeviceService } from '@axe/core/input/pointer-device.service';
import { imageFileEqual } from '@axe/core/storage/image-file';
import { ObjectStore } from '@axe/core/sync/object-store';
import { Card } from '@axe/domain/card/card';
import { CardStack } from '@axe/domain/card/card-stack';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { surfaceOf } from '@axe/domain/tabletop/tabletop-object';
import { CardDrawCountDialogComponent } from '@axe/features/card/card-draw-count-dialog/card-draw-count-dialog.component';
import { buildCardStackContextMenu } from '@axe/features/card/card-stack/card-stack-context-menu';
import { MovableOption } from '@axe/ui/directives/movable.directive';
import { MovableDirective } from '@axe/ui/directives/movable.directive';
import { RotableOption } from '@axe/ui/directives/rotable.directive';
import { RotableDirective } from '@axe/ui/directives/rotable.directive';
import { SelectableDirective } from '@axe/ui/directives/selectable.directive';
import { SafePipe } from '@axe/ui/pipes/safe.pipe';
import { setupInputHandler, setupMovableRotableForPiece } from '@axe/ui/tabletop/setup-tabletop-piece';
import { supersampleFactor, supersampleInsetPercent, supersampleTransform } from '@axe/ui/tabletop/supersample';
import { translateZCss, Z_OFFSET_TABLETOP_OBJECT_PX } from '@axe/ui/tabletop/z-offset';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  selector: 'card-stack',
  templateUrl: './card-stack.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MovableDirective, NgClass, RotableDirective, SelectableDirective, NgStyle, SafePipe, TranslocoModule],
  host: {
    class: 'block',
    '(carddrop)': 'onCardDrop($event)',
    '(dragstart)': 'onDragstart($event)',
    '(contextmenu)': 'onContextMenu($event)',
  },
})
export class CardStackComponent {
  private readonly contextMenuService = inject(ContextMenuService);
  private readonly rolePermission = inject(RolePermissionService);
  private readonly panelService = inject(PanelService);
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly imageService = inject(ImageService);
  private readonly pointerDeviceService = inject(PointerDeviceService);
  private readonly objectStore = inject(ObjectStore);
  private readonly selectionSignalService = inject(SelectionSignalService);
  private readonly objectChange = inject(ObjectChangeService);
  protected readonly tabletopService = inject(TabletopService);
  private readonly modalService = inject(ModalService);
  private readonly multiMovableService = inject(MultiMovableService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly translateFn = inject(TRANSLATE_FN);

  readonly cardStack = input.required<CardStack>();

  get isLock(): boolean {
    return this.cardStack().isLock;
  }
  set isLock(isLock: boolean) {
    this.cardStack().isLock = isLock;
  }

  readonly name = computed(() => {
    this.objectChange.versionOf(this.cardStack().identifier)();
    this.objectChange.networkVersion();
    if (this.cardStack().owner) {
      const cursor = PeerCursor.findByUserId(this.cardStack().owner);
      if (cursor) this.objectChange.versionOf(cursor.identifier)();
    }
    return this.cardStack().name;
  });
  get rotate(): number {
    return this.cardStack().rotate;
  }
  set rotate(rotate: number) {
    this.cardStack().rotate = rotate;
  }
  get zindex(): number {
    return this.cardStack().zindex;
  }
  get isShowTotal(): boolean {
    return this.cardStack().isShowTotal;
  }
  get cards(): readonly Card[] {
    this.cardsVersion();
    return this.cardStack().cards;
  }
  get isEmpty(): boolean {
    return this.cardStack().isEmpty;
  }
  get size(): number {
    const card = this.cardStack().topCard;
    return card ? card.size : 2;
  }

  get hasOwner(): boolean {
    return this.cardStack().hasOwner;
  }
  get ownerName(): string {
    return this.cardStack().ownerName;
  }

  get topCard(): Card | null {
    return this.cardStack().topCard;
  }

  private static readonly STACK_PIXELS_PER_CARD = 1.0;
  private static readonly STACK_MAX_THICKNESS_PX = 60;
  private static readonly STACK_MAX_LAYERS = 30;

  readonly isPoster = computed(() => {
    this.objectChange.versionOf(this.cardStack().identifier)();
    return surfaceOf(this.cardStack()) !== 'floor';
  });

  protected readonly stackThicknessPx = computed<number>(() => {
    this.cardsVersion();
    if (this.tabletopService.mode2d() || this.isPoster()) return 0;
    const count = this.cardStack().cards.length;
    if (count <= 1) return 0;
    return Math.min(CardStackComponent.STACK_MAX_THICKNESS_PX, count * CardStackComponent.STACK_PIXELS_PER_CARD);
  });

  protected readonly stackLayers = computed<readonly { z: number; bg: string }[]>(() => {
    this.cardsVersion();
    if (this.tabletopService.mode2d() || this.isPoster()) return [];
    const count = this.cardStack().cards.length;
    if (count <= 1) return [];
    const thickness = this.stackThicknessPx();
    const layerCount = Math.min(count - 1, CardStackComponent.STACK_MAX_LAYERS);
    const spacing = thickness / layerCount;
    return Array.from({ length: layerCount }, (_, i) => ({
      z: i * spacing,
      bg: i % 2 === 0 ? '#f5efe2' : '#2a1f0d',
    }));
  });

  readonly imageFile = computed(
    () => {
      this.objectChange.fileVersion();
      const cardStack = this.cardStack();
      this.objectChange.versionOf(cardStack.identifier)();
      return this.imageService.getSkeletonOr(cardStack.imageFile);
    },
    { equal: imageFileEqual() }
  );

  private readonly imageNaturalSize = linkedSignal<string, { width: number; height: number } | null>({
    source: () => this.imageFile().url,
    computation: () => null,
  });

  onImageLoad(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img.naturalWidth <= 0 || img.naturalHeight <= 0) return;
    this.imageNaturalSize.set({ width: img.naturalWidth, height: img.naturalHeight });
  }

  private static readonly FRAME_BORDER_PX = 5;

  private readonly imageBoxWidthPx = computed(() => this.size * this.gridSize - CardStackComponent.FRAME_BORDER_PX * 2);

  readonly imageSupersample = computed(() => {
    const natural = this.imageNaturalSize();
    if (!natural) return 1;
    return supersampleFactor(natural.width, this.imageBoxWidthPx());
  });

  readonly imageSupersamplePercent = computed(() => this.imageSupersample() * 100 + '%');

  readonly imageSupersampleInset = computed(() => supersampleInsetPercent(this.imageSupersample()) + '%');

  readonly imageBoxHeightPx = computed(() => {
    const natural = this.imageNaturalSize();
    if (!natural || this.imageSupersample() <= 1) return null;
    return (this.imageBoxWidthPx() * natural.height) / natural.width;
  });

  imageTransform(inner: string): string {
    return supersampleTransform({ factor: this.imageSupersample(), anchor: 'top', inner });
  }

  readonly animeState = signal<'active' | 'inactive'>('inactive');
  private readonly cardsVersion = signal(0);

  private iconHiddenTimer: NodeJS.Timeout | null = null;
  readonly isIconHidden = signal(false);

  get gridSize(): number {
    return this.tabletopService.gridSize();
  }

  readonly movableOption = signal<MovableOption>({});
  readonly rotableOption = signal<RotableOption>({});

  private doubleClickTimer: NodeJS.Timeout | null = null;
  private doubleClickPoint = { x: 0, y: 0 };

  constructor() {
    this.objectChange.shuffleCardStack$.subscribe((event) => {
      if (event.identifier === this.cardStack().identifier) {
        this.animeState.set('active');
      }
    }, this.destroyRef);
    this.objectChange.cardStackDecreased$.subscribe((event) => {
      if (event.cardStackIdentifier === this.cardStack().identifier && this.cardStack())
        this.cardsVersion.update((v) => v + 1);
    }, this.destroyRef);
    setupMovableRotableForPiece(this, {
      target: this.cardStack,
      collideLayers: ['terrain'],
      transformCssOffset: translateZCss(Z_OFFSET_TABLETOP_OBJECT_PX),
    });
    this.destroyRef.onDestroy(() => {
      clearTimeout(this.doubleClickTimer ?? undefined);
      clearTimeout(this.iconHiddenTimer ?? undefined);
    });
  }

  private readonly inputRef = setupInputHandler({
    elementRef: this.elementRef,
    destroyRef: this.destroyRef,
    onStart: (e) => this.onInputStart(e),
  });

  private get input() {
    return this.inputRef.current;
  }

  onShuffleDone() {
    this.animeState.set('inactive');
  }

  onCardDrop(e: Event) {
    const ce = e as CustomEvent;
    if (this.cardStack() === ce.detail || (!(ce.detail instanceof Card) && !(ce.detail instanceof CardStack))) {
      return;
    }
    e.stopPropagation();
    e.preventDefault();

    if (ce.detail instanceof Card) {
      const card: Card = ce.detail;
      const distance: number =
        (card.location.x - this.cardStack().location.x) ** 2 +
        (card.location.y - this.cardStack().location.y) ** 2 +
        (card.posZ - this.cardStack().posZ) ** 2;
      if (distance < 50 ** 2) {
        this.cardStack().putOnTop(card);
        for (const follower of this.multiMovableService.followerTabletopObjectsFor(card.identifier)) {
          if (follower instanceof Card) this.cardStack().putOnTop(follower);
        }
      }
    } else if (ce.detail instanceof CardStack) {
      const cardStack: CardStack = ce.detail;
      const distance: number =
        (cardStack.location.x - this.cardStack().location.x) ** 2 +
        (cardStack.location.y - this.cardStack().location.y) ** 2 +
        (cardStack.posZ - this.cardStack().posZ) ** 2;
      if (distance < 25 ** 2) this.concatStack(cardStack);
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
    if (this.input) this.input.onEnd = null;
  }

  onDoubleClick() {
    this.stopDoubleClickTimer();
    if (!this.rolePermission.canEditTabletop) return;
    const distance =
      (this.doubleClickPoint.x - this.input!.pointer.x) ** 2 + (this.doubleClickPoint.y - this.input!.pointer.y) ** 2;
    if (distance < 10 ** 2) {
      if (this.drawCard() != null) {
        SoundEffect.play(PresetSound.cardDraw);
      }
    }
  }

  onDragstart(e: DragEvent) {
    e.stopPropagation();
    e.preventDefault();
  }

  onInputStart(e: MouseEvent | TouchEvent) {
    this.startDoubleClickTimer(e);
    this.cardStack().toTopmost();
    this.startIconHiddenTimer();

    this.selectionSignalService.selectObject(this.cardStack().identifier, 'GameCharacter');
  }

  onContextMenu(e: Event) {
    e.stopPropagation();
    e.preventDefault();

    if (!this.pointerDeviceService.isAllowedToOpenContextMenu) return;
    const position = this.pointerDeviceService.pointers[0];
    const multi = tryBuildMultiSelectionContextMenu({
      self: this.cardStack(),
      selectionSignalService: this.selectionSignalService,
      objectStore: this.objectStore,
      t: this.translateFn,
      gridSize: this.gridSize,
    });
    if (multi) {
      this.contextMenuService.open(position, multi, this.translateFn('feature.tabletop.selection.title'));
      return;
    }
    const menuArray = buildCardStackContextMenu(
      this.cardStack(),
      this.gridSize,
      () => this.drawCard(),
      () => this.openDrawCardsDialog(),
      (n) => this.splitStack(n),
      () => this.breakStack(),
      (cs) => this.showDetail(cs),
      this.translateFn
    );
    const surfaceEntries = buildSurfaceSwitchContextMenu(
      this.cardStack(),
      this.tabletopService.currentTable,
      this.translateFn
    );
    this.contextMenuService.open(
      position,
      surfaceEntries.length > 0 ? [...menuArray, ContextMenuSeparator, ...surfaceEntries] : menuArray,
      this.name()
    );
  }

  onMove() {
    SoundEffect.play(PresetSound.cardPick);
  }

  onMoved() {
    SoundEffect.play(PresetSound.cardPut);
    this.dispatchCardDropEvent();
  }

  private drawCard(): Card | null {
    return this.drawCardAt(0);
  }

  private drawCards(count: number): Card[] {
    const normalizedCount = Number.isFinite(count) ? Math.floor(count) : 0;
    const drawCount = Math.min(Math.max(0, normalizedCount), this.cardStack().cards.length);
    const cards: Card[] = [];
    for (let index = 0; index < drawCount; index++) {
      const card = this.drawCardAt(index);
      if (!card) break;
      cards.push(card);
    }
    return cards;
  }

  private drawCardAt(index: number): Card | null {
    const card = this.cardStack().drawCard();
    if (card) {
      this.cardStack().update();
      card.location.x += 100 + index * 18 + Math.random() * 50;
      card.location.y += 25 + index * 8 + Math.random() * 50;
      card.setLocation(this.cardStack().location.name);
    }
    return card;
  }

  private async openDrawCardsDialog() {
    const maxCount = this.cardStack().cards.length;
    if (maxCount < 1) return;

    const count = await this.modalService
      .open<number | null>(CardDrawCountDialogComponent, {
        title: this.translateFn('feature.card.drawDialog.title'),
        maxCount,
        defaultCount: Math.min(2, maxCount),
      })
      .catch(() => null);
    if (count == null) return;

    if (this.drawCards(count).length > 0) {
      SoundEffect.play(PresetSound.cardDraw);
    }
  }

  private breakStack() {
    const cards = this.cardStack().drawCardAll().reverse();
    for (const card of cards) {
      card.location.x += 25 - Math.random() * 50;
      card.location.y += 25 - Math.random() * 50;
      card.toTopmost();
      card.setLocation(this.cardStack().location.name);
    }
    this.cardStack().setLocation('graveyard');
    this.cardStack().destroy();
  }

  private splitStack(split: number) {
    if (split < 2) return;
    const cardStacks: CardStack[] = [];
    for (let i = 0; i < split; i++) {
      const cardStack = CardStack.create(this.cardStack().name);
      cardStack.location.x = this.cardStack().location.x + 50 - Math.random() * 100;
      cardStack.location.y = this.cardStack().location.y + 50 - Math.random() * 100;
      cardStack.posZ = this.cardStack().posZ;
      cardStack.location.name = this.cardStack().location.name;
      cardStack.rotate = this.rotate;
      cardStack.toTopmost();
      cardStacks.push(cardStack);
    }

    const cards = this.cardStack().drawCardAll();
    this.cardStack().setLocation('graveyard');
    this.cardStack().destroy();

    let num = 0;
    let splitIndex = (cards.length / split) * (num + 1);
    for (let i = 0; i < cards.length; i++) {
      cardStacks[num].putOnBottom(cards[i]);
      if (splitIndex <= i + 1) {
        num++;
        splitIndex = (cards.length / split) * (num + 1);
      }
    }
  }

  private concatStack(topStack: CardStack, bottomStack: CardStack = this.cardStack()) {
    const newCardStack = CardStack.create(topStack.name);
    newCardStack.location.name = bottomStack.location.name;
    newCardStack.location.x = bottomStack.location.x;
    newCardStack.location.y = bottomStack.location.y;
    newCardStack.posZ = bottomStack.posZ;
    newCardStack.zindex = topStack.zindex;
    newCardStack.rotate = bottomStack.rotate;

    const bottomCards: Card[] = bottomStack.drawCardAll();
    const topCards: Card[] = topStack.drawCardAll();
    for (const card of [...topCards, ...bottomCards]) newCardStack.putOnBottom(card);

    bottomStack.setLocation('');
    bottomStack.destroy();

    topStack.setLocation('');
    topStack.destroy();
  }

  private dispatchCardDropEvent() {
    const element: HTMLElement = this.elementRef.nativeElement;
    const parent = element.parentElement!;
    const children = parent.children;
    const event = new CustomEvent('carddrop', { detail: this.cardStack(), bubbles: true });
    for (let i = 0; i < children.length; i++) {
      children[i].dispatchEvent(event);
    }
  }

  private showDetail(gameObject: CardStack) {
    this.selectionSignalService.selectObject(gameObject.identifier, gameObject.aliasName);
    const coordinate = this.pointerDeviceService.pointers[0];
    let title = this.translateFn('feature.cardStack.settingTitle');
    if (gameObject.name.length) title += ' - ' + gameObject.name;
    const option: PanelOption = {
      title: title,
      left: coordinate.x - 300,
      top: coordinate.y - 300,
      width: 640,
      height: 720,
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
}
