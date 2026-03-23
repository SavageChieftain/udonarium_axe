import { NgStyle } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  inject,
  Input,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { Card, CardState } from '@axe/class/card';
import { CardStack } from '@axe/class/card-stack';
import { ImageFile } from '@axe/class/core/file-storage/image-file';
import { ObjectNode } from '@axe/class/core/synchronize-object/object-node';
import { ObjectStore } from '@axe/class/core/synchronize-object/object-store';
import { EventSystem, Network } from '@axe/class/core/system';
import { PeerCursor } from '@axe/class/peer-cursor';
import { PresetSound, SoundEffect } from '@axe/class/sound-effect';
import { GameCharacterSheetComponent } from '@axe/component/game-character-sheet/game-character-sheet.component';
import { InputHandler } from '@axe/directive/input-handler';
import { MovableOption } from '@axe/directive/movable.directive';
import { MovableDirective } from '@axe/directive/movable.directive';
import { RotableOption } from '@axe/directive/rotable.directive';
import { RotableDirective } from '@axe/directive/rotable.directive';
import { SafePipe } from '@axe/pipe/safe.pipe';
import { ContextMenuSeparator, ContextMenuService } from '@axe/service/context-menu.service';
import { ImageService } from '@axe/service/image.service';
import { PanelOption, PanelService } from '@axe/service/panel.service';
import { PointerDeviceService } from '@axe/service/pointer-device.service';
import { SelectionSignalService } from '@axe/service/selection-signal.service';
import { TabletopService } from '@axe/service/tabletop.service';

@Component({
  selector: 'card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MovableDirective, RotableDirective, NgStyle, SafePipe],
})
export class CardComponent implements OnInit, OnDestroy, AfterViewInit {
  private contextMenuService = inject(ContextMenuService);
  private panelService = inject(PanelService);
  private elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private changeDetector = inject(ChangeDetectorRef);
  private tabletopService = inject(TabletopService);
  private imageService = inject(ImageService);
  private pointerDeviceService = inject(PointerDeviceService);
  private objectStore = inject(ObjectStore);
  private selectionSignalService = inject(SelectionSignalService);

  @Input() card: Card = null!;
  @Input() is3D: boolean = false;

  get dispLockMark(): boolean {
    return this.card.dispLockMark;
  }
  set dispLockMark(disp: boolean) {
    this.card.dispLockMark = disp;
  }

  get isLock(): boolean {
    return this.card.isLock;
  }
  set isLock(isLock: boolean) {
    this.card.isLock = isLock;
  }

  get name(): string {
    return this.card.name;
  }
  get state(): CardState {
    return this.card.state;
  }
  set state(state: CardState) {
    this.card.state = state;
  }
  get rotate(): number {
    return this.card.rotate;
  }
  set rotate(rotate: number) {
    this.card.rotate = rotate;
  }
  get owner(): string {
    return this.card.owner;
  }
  set owner(owner: string) {
    this.card.owner = owner;
  }
  get zindex(): number {
    return this.card.zindex;
  }
  get size(): number {
    return this.adjustMinBounds(this.card.size);
  }

  get isHand(): boolean {
    return this.card.isHand;
  }
  get isFront(): boolean {
    return this.card.isFront;
  }
  get isVisible(): boolean {
    return this.card.isVisible;
  }
  get hasOwner(): boolean {
    return this.card.hasOwner;
  }
  get ownerIsOnline(): boolean {
    return this.card.ownerIsOnline;
  }
  get ownerName(): string {
    return this.card.ownerName;
  }

  get imageFile(): ImageFile {
    return this.imageService.getSkeletonOr(this.card.imageFile);
  }
  get frontImage(): ImageFile {
    return this.imageService.getSkeletonOr(this.card.frontImage);
  }
  get backImage(): ImageFile {
    return this.imageService.getSkeletonOr(this.card.backImage);
  }

  private iconHiddenTimer: NodeJS.Timeout = null!;
  get isIconHidden(): boolean {
    return this.iconHiddenTimer != null;
  }

  gridSize: number = 50;

  movableOption: MovableOption = {};
  rotableOption: RotableOption = {};

  private doubleClickTimer: NodeJS.Timeout = null!;
  private doubleClickPoint = { x: 0, y: 0 };

  private input: InputHandler = null!;
  ngOnInit() {
    EventSystem.register(this)
      .on('UPDATE_GAME_OBJECT', (event) => {
        const object = this.objectStore.get(event.data.identifier);
        if (!this.card || !object) return;
        if (
          this.card === object ||
          (object instanceof ObjectNode && this.card.contains(object)) ||
          (object instanceof PeerCursor && object.userId === this.card.owner)
        ) {
          this.changeDetector.markForCheck();
        }
      })
      .on('SYNCHRONIZE_FILE_LIST', (_event) => {
        this.changeDetector.markForCheck();
      })
      .on('UPDATE_FILE_RESOURE', (_event) => {
        this.changeDetector.markForCheck();
      })
      .on('DISCONNECT_PEER', (event) => {
        const cursor = PeerCursor.findByPeerId(event.data.peerId);
        if (!cursor || this.card.owner === cursor.userId) this.changeDetector.markForCheck();
      });
    this.movableOption = {
      tabletopObject: this.card,
      transformCssOffset: 'translateZ(0.15px)',
      colideLayers: ['terrain'],
    };
    this.rotableOption = {
      tabletopObject: this.card,
    };
  }

  ngAfterViewInit() {
    this.input = new InputHandler(this.elementRef.nativeElement);
    this.input.onStart = (e) => this.onInputStart(e);
  }

  ngOnDestroy() {
    clearTimeout(this.doubleClickTimer);
    clearTimeout(this.iconHiddenTimer);
    if (this.input) this.input.destroy();
    EventSystem.unregister(this);
  }

  @HostListener('carddrop', ['$event'])
  onCardDrop(e: Event) {
    const ce = e as CustomEvent;
    if (this.card === ce.detail || (ce.detail instanceof Card === false && ce.detail instanceof CardStack === false)) {
      return;
    }
    e.stopPropagation();
    e.preventDefault();

    if (ce.detail instanceof CardStack) {
      const cardStack: CardStack = ce.detail;
      const distance: number =
        (cardStack.location.x - this.card.location.x) ** 2 +
        (cardStack.location.y - this.card.location.y) ** 2 +
        (cardStack.posZ - this.card.posZ) ** 2;
      if (distance < 25 ** 2) {
        cardStack.location.x = this.card.location.x;
        cardStack.location.y = this.card.location.y;
        cardStack.posZ = this.card.posZ;
        cardStack.putOnBottom(this.card);
      }
    }
  }

  startDoubleClickTimer(e: MouseEvent | TouchEvent) {
    if (!this.doubleClickTimer) {
      this.stopDoubleClickTimer();
      this.doubleClickTimer = setTimeout(() => this.stopDoubleClickTimer(), (e as TouchEvent).touches ? 500 : 300);
      this.doubleClickPoint = this.input.pointer;
      return;
    }

    if ((e as TouchEvent).touches) {
      this.input.onEnd = () => this.onDoubleClick();
    } else {
      this.onDoubleClick();
    }
  }

  stopDoubleClickTimer() {
    clearTimeout(this.doubleClickTimer);
    this.doubleClickTimer = null!;
    this.input.onEnd = null!;
  }

  onDoubleClick() {
    this.stopDoubleClickTimer();
    const distance =
      (this.doubleClickPoint.x - this.input.pointer.x) ** 2 + (this.doubleClickPoint.y - this.input.pointer.y) ** 2;
    if (distance < 10 ** 2) {
      if (this.ownerIsOnline && !this.isHand) return;
      this.state = this.isVisible && !this.isHand ? CardState.BACK : CardState.FRONT;
      this.owner = '';
      SoundEffect.play(PresetSound.cardDraw);
    }
  }

  @HostListener('dragstart', ['$event'])
  onDragstart(e: DragEvent) {
    e.stopPropagation();
    e.preventDefault();
  }

  onInputStart(e: MouseEvent | TouchEvent) {
    this.startDoubleClickTimer(e);
    this.card.toTopmost();
    this.startIconHiddenTimer();

    if (this.isLock) {
      this.selectionSignalService.notifyDragLocked();
    }
  }

  @HostListener('contextmenu', ['$event'])
  onContextMenu(e: Event) {
    e.stopPropagation();
    e.preventDefault();
    if (!this.pointerDeviceService.isAllowedToOpenContextMenu) return;
    const position = this.pointerDeviceService.pointers[0];
    const menuArray = [];
    menuArray.push(
      this.isLock
        ? {
            name: '固定解除',
            action: () => {
              this.isLock = false;
              this.dispLockMark = true;
              SoundEffect.play(PresetSound.unlock);
            },
          }
        : {
            name: '固定する',
            action: () => {
              this.isLock = true;
              SoundEffect.play(PresetSound.lock);
            },
          }
    );
    if (this.isLock) {
      menuArray.push(
        this.dispLockMark
          ? {
              name: '固定マーク消去',
              action: () => {
                this.dispLockMark = false;
                SoundEffect.play(PresetSound.lock);
              },
            }
          : {
              name: '固定マーク表示',
              action: () => {
                this.dispLockMark = true;
                SoundEffect.play(PresetSound.lock);
              },
            }
      );
    }
    menuArray.push(ContextMenuSeparator);
    menuArray.push(
      !this.isVisible || this.isHand
        ? {
            name: '表にする',
            action: () => {
              this.card.faceUp();
              SoundEffect.play(PresetSound.cardDraw);
            },
          }
        : {
            name: '裏にする',
            action: () => {
              this.card.faceDown();
              SoundEffect.play(PresetSound.cardDraw);
            },
          }
    );
    menuArray.push(
      this.isHand
        ? {
            name: '裏にする',
            action: () => {
              this.card.faceDown();
              SoundEffect.play(PresetSound.cardDraw);
            },
          }
        : {
            name: '自分だけ見る',
            action: () => {
              SoundEffect.play(PresetSound.cardDraw);
              this.card.faceDown();
              this.owner = Network.peerContext.userId;
            },
          }
    );
    menuArray.push(ContextMenuSeparator);
    menuArray.push({
      name: '重なったカードで山札を作る',
      action: () => {
        this.createStack();
        SoundEffect.play(PresetSound.cardPut);
      },
    });
    menuArray.push({
      name: 'カードを編集',
      action: () => {
        this.showDetail(this.card);
      },
    });
    menuArray.push({
      name: 'コピーを作る',
      action: () => {
        const cloneObject = this.card.clone();
        cloneObject.location.x += this.gridSize;
        cloneObject.location.y += this.gridSize;
        cloneObject.toTopmost();
        SoundEffect.play(PresetSound.cardPut);
      },
    });
    menuArray.push({
      name: '削除する',
      action: () => {
        this.card.destroy();
        SoundEffect.play(PresetSound.sweep);
      },
    });
    this.contextMenuService.open(position, menuArray, this.isVisible ? this.name : 'カード');
  }

  onMove() {
    this.input.cancel();
    SoundEffect.play(PresetSound.cardPick);
  }

  onMoved() {
    SoundEffect.play(PresetSound.cardPut);
    this.dispatchCardDropEvent();
  }

  private createStack() {
    const cardStack = CardStack.create('山札');
    cardStack.location.x = this.card.location.x;
    cardStack.location.y = this.card.location.y;
    cardStack.posZ = this.card.posZ;
    cardStack.location.name = this.card.location.name;
    cardStack.rotate = this.rotate;
    cardStack.zindex = this.card.zindex;

    const cards: Card[] = this.tabletopService.cards.filter((card) => {
      const distance: number =
        (card.location.x - this.card.location.x) ** 2 +
        (card.location.y - this.card.location.y) ** 2 +
        (card.posZ - this.card.posZ) ** 2;
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
    const event = new CustomEvent('carddrop', { detail: this.card, bubbles: true });
    for (let i = 0; i < children.length; i++) {
      children[i].dispatchEvent(event);
    }
  }

  private startIconHiddenTimer() {
    clearTimeout(this.iconHiddenTimer);
    this.iconHiddenTimer = setTimeout(() => {
      this.iconHiddenTimer = null!;
      this.changeDetector.markForCheck();
    }, 300);
    this.changeDetector.markForCheck();
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
    const component = this.panelService.open<GameCharacterSheetComponent>(GameCharacterSheetComponent, option);
    component.tabletopObject = gameObject;
  }
}
