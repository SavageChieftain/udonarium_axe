import { NgClass, NgStyle } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ImageService } from '@axe/core/image.service';
import { Network } from '@axe/core/index';
import { PointerDeviceService } from '@axe/core/pointer-device.service';
import { ImageFile } from '@axe/core/storage/image-file';
import { ObjectStore } from '@axe/core/sync/object-store';
import { Card } from '@axe/domain/card/card';
import { CardStack } from '@axe/domain/card/card-stack';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { CardStackListComponent } from '@axe/features/card/card-stack-list/card-stack-list.component';
import { GameCharacterSheetComponent } from '@axe/features/character/game-character-sheet/game-character-sheet.component';
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

import { buildCardStackContextMenu } from './card-stack-context-menu';

@Component({
  selector: 'card-stack',
  templateUrl: './card-stack.component.html',
  styleUrls: ['./card-stack.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MovableDirective, NgClass, RotableDirective, NgStyle, SafePipe],
  host: {
    '(carddrop)': 'onCardDrop($event)',
    '(dragstart)': 'onDragstart($event)',
    '(contextmenu)': 'onContextMenu($event)',
  },
})
export class CardStackComponent implements OnInit, AfterViewInit, OnDestroy {
  private contextMenuService = inject(ContextMenuService);
  private panelService = inject(PanelService);
  private elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private imageService = inject(ImageService);
  private pointerDeviceService = inject(PointerDeviceService);
  private objectStore = inject(ObjectStore);
  private selectionSignalService = inject(SelectionSignalService);
  private objectChange = inject(ObjectChangeService);
  private destroyRef = inject(DestroyRef);

  readonly cardStack = input<CardStack>(null!);

  get isLock(): boolean {
    return this.cardStack().isLock;
  }
  set isLock(isLock: boolean) {
    this.cardStack().isLock = isLock;
  }

  get name(): string {
    this.objectChange.versionOf(this.cardStack().identifier)();
    this.objectChange.networkVersion();
    if (this.cardStack().owner) {
      const cursor = PeerCursor.findByUserId(this.cardStack().owner);
      if (cursor) this.objectChange.versionOf(cursor.identifier)();
    }
    return this.cardStack().name;
  }
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
  get cards(): Card[] {
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

  get topCard(): Card {
    return this.cardStack().topCard;
  }
  get imageFile(): ImageFile {
    this.objectChange.fileVersion();
    return this.imageService.getSkeletonOr(this.cardStack().imageFile);
  }

  readonly animeState = signal<'active' | 'inactive'>('inactive');
  private readonly cardsVersion = signal(0);

  private iconHiddenTimer: NodeJS.Timeout | null = null;
  readonly isIconHidden = signal(false);

  gridSize: number = 50;

  movableOption: MovableOption = {};
  rotableOption: RotableOption = {};

  private doubleClickTimer: NodeJS.Timeout | null = null;
  private doubleClickPoint = { x: 0, y: 0 };

  private input: InputHandler | null = null;
  ngOnInit() {
    this.objectChange.shuffleCardStack$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      if (event.identifier === this.cardStack().identifier) {
        this.animeState.set('active');
      }
    });
    this.objectChange.cardStackDecreased$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      if (event.cardStackIdentifier === this.cardStack().identifier && this.cardStack())
        this.cardsVersion.update((v) => v + 1);
    });
    this.movableOption = {
      tabletopObject: this.cardStack(),
      transformCssOffset: 'translateZ(0.15px)',
      colideLayers: ['terrain'],
    };
    this.rotableOption = {
      tabletopObject: this.cardStack(),
    };
  }

  ngAfterViewInit() {
    this.input = new InputHandler(this.elementRef.nativeElement);
    this.input.onStart = (e) => this.onInputStart(e);
  }

  ngOnDestroy() {
    clearTimeout(this.doubleClickTimer ?? undefined);
    clearTimeout(this.iconHiddenTimer ?? undefined);
    if (this.input) this.input.destroy();
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
      if (distance < 50 ** 2) this.cardStack().putOnTop(card);
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

    if (this.isLock) {
      this.selectionSignalService.notifyDragLocked();
    }

    this.selectionSignalService.selectObject(this.cardStack().identifier, 'GameCharacter');
  }

  onContextMenu(e: Event) {
    e.stopPropagation();
    e.preventDefault();

    if (!this.pointerDeviceService.isAllowedToOpenContextMenu) return;
    const position = this.pointerDeviceService.pointers[0];
    const menuArray = buildCardStackContextMenu(
      this.cardStack(),
      this.gridSize,
      () => this.drawCard(),
      (cs) => this.showStackList(cs),
      (n) => this.splitStack(n),
      () => this.breakStack(),
      (cs) => this.showDetail(cs)
    );
    this.contextMenuService.open(position, menuArray, this.name);
  }

  onMove() {
    SoundEffect.play(PresetSound.cardPick);
  }

  onMoved() {
    SoundEffect.play(PresetSound.cardPut);
    this.dispatchCardDropEvent();
  }

  private drawCard(): Card {
    const card = this.cardStack().drawCard();
    if (card) {
      this.cardStack().update(); // todo
      card.location.x += 100 + Math.random() * 50;
      card.location.y += 25 + Math.random() * 50;
      card.setLocation(this.cardStack().location.name);
    }
    return card;
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
    let title = '山札設定';
    if (gameObject.name.length) title += ' - ' + gameObject.name;
    const option: PanelOption = {
      title: title,
      left: coordinate.x - 300,
      top: coordinate.y - 300,
      width: 600,
      height: 600,
    };
    const component = this.panelService.open<GameCharacterSheetComponent>(GameCharacterSheetComponent, option);
    component.tabletopObject = gameObject;
  }

  private showStackList(gameObject: CardStack) {
    this.selectionSignalService.selectObject(gameObject.identifier, gameObject.aliasName);

    const coordinate = this.pointerDeviceService.pointers[0];
    const option: PanelOption = { left: coordinate.x - 200, top: coordinate.y - 300, width: 400, height: 600 };

    this.cardStack().owner = Network.peerContext.userId;
    const component = this.panelService.open<CardStackListComponent>(CardStackListComponent, option);
    //    let component = this.panelService.open<CardStackListComponentEx>(CardStackListComponentEx, option);
    component.cardStack = gameObject;
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
