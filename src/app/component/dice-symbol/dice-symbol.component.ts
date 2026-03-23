import { NgClass, NgStyle } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  inject,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { ImageFile } from '@axe/class/core/file-storage/image-file';
import { ObjectNode } from '@axe/class/core/synchronize-object/object-node';
import { ObjectStore } from '@axe/class/core/synchronize-object/object-store';
import { EventSystem, Network } from '@axe/class/core/system';
import { DiceSymbol } from '@axe/class/dice-symbol';
import { PeerCursor } from '@axe/class/peer-cursor';
import { PresetSound, SoundEffect } from '@axe/class/sound-effect';
import { GameCharacterSheetComponent } from '@axe/component/game-character-sheet/game-character-sheet.component';
import { InputHandler } from '@axe/directive/input-handler';
import { MovableOption } from '@axe/directive/movable.directive';
import { MovableDirective } from '@axe/directive/movable.directive';
import { RotableOption } from '@axe/directive/rotable.directive';
import { RotableDirective } from '@axe/directive/rotable.directive';
import { SafePipe } from '@axe/pipe/safe.pipe';
import { ContextMenuAction, ContextMenuSeparator, ContextMenuService } from '@axe/service/context-menu.service';
import { ImageService } from '@axe/service/image.service';
import { PanelOption, PanelService } from '@axe/service/panel.service';
import { PointerDeviceService } from '@axe/service/pointer-device.service';
import { SelectionSignalService } from '@axe/service/selection-signal.service';

@Component({
  selector: 'dice-symbol',
  templateUrl: './dice-symbol.component.html',
  styleUrls: ['./dice-symbol.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MovableDirective, RotableDirective, NgClass, NgStyle, SafePipe],
})
export class DiceSymbolComponent implements OnInit, AfterViewInit, OnDestroy {
  private ngZone = inject(NgZone);
  private panelService = inject(PanelService);
  private contextMenuService = inject(ContextMenuService);
  private elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private changeDetector = inject(ChangeDetectorRef);
  private imageService = inject(ImageService);
  private pointerDeviceService = inject(PointerDeviceService);
  private objectStore = inject(ObjectStore);
  private selectionSignalService = inject(SelectionSignalService);

  @Input() diceSymbol: DiceSymbol = null!;
  @Input() is3D: boolean = false;

  get face(): string {
    return this.diceSymbol.face;
  }
  set face(face: string) {
    this.diceSymbol.face = face;
  }
  get owner(): string {
    return this.diceSymbol.owner;
  }
  set owner(owner: string) {
    this.diceSymbol.owner = owner;
  }
  get rotate(): number {
    return this.diceSymbol.rotate;
  }
  set rotate(rotate: number) {
    this.diceSymbol.rotate = rotate;
  }

  get name(): string {
    return this.diceSymbol.name;
  }
  set name(name: string) {
    this.diceSymbol.name = name;
  }
  get size(): number {
    return this.adjustMinBounds(this.diceSymbol.size);
  }

  get imageHeignt(): number {
    return this.diceSymbol.komaImageHeight;
  }
  get specifyImageFlag(): boolean {
    return this.diceSymbol.specifyKomaImageFlag;
  }

  get faces(): string[] {
    return this.diceSymbol.faces;
  }
  get imageFile(): ImageFile {
    return this.imageService.getEmptyOr(this.diceSymbol.imageFile);
  }

  get isMine(): boolean {
    return this.diceSymbol.isMine;
  }
  get hasOwner(): boolean {
    return this.diceSymbol.hasOwner;
  }
  get ownerName(): string {
    return this.diceSymbol.ownerName;
  }
  get isVisible(): boolean {
    return this.diceSymbol.isVisible;
  }

  get isLock(): boolean {
    return this.diceSymbol.isLock;
  }
  set isLock(isLock: boolean) {
    this.diceSymbol.isLock = isLock;
  }

  animeState: 'inactive' | 'active' = 'inactive';

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
      .on('ROLL_DICE_SYMBOL', (event) => {
        if (event.data.identifier === this.diceSymbol.identifier) {
          this.ngZone.run(() => {
            this.animeState = 'inactive';
            this.changeDetector.markForCheck();
            setTimeout(() => {
              this.animeState = 'active';
              this.changeDetector.markForCheck();
            });
          });
        }
      })
      .on('UPDATE_GAME_OBJECT', (event) => {
        const object = this.objectStore.get(event.data.identifier);
        if (!this.diceSymbol || !object) return;
        if (
          this.diceSymbol === object ||
          (object instanceof ObjectNode && this.diceSymbol.contains(object)) ||
          (object instanceof PeerCursor && object.userId === this.diceSymbol.owner)
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
        if (!cursor || this.diceSymbol.owner === cursor.userId) this.changeDetector.markForCheck();
      });
    this.movableOption = {
      tabletopObject: this.diceSymbol,
      transformCssOffset: 'translateZ(1.0px)',
      colideLayers: ['terrain'],
    };
    this.rotableOption = {
      tabletopObject: this.diceSymbol,
    };
  }

  ngAfterViewInit() {
    this.ngZone.runOutsideAngular(() => {
      this.input = new InputHandler(this.elementRef.nativeElement);
    });
    this.input.onStart = (e) => this.ngZone.run(() => this.onInputStart(e));
  }

  ngOnDestroy() {
    clearTimeout(this.doubleClickTimer);
    clearTimeout(this.iconHiddenTimer);
    if (this.input) this.input.destroy();
    EventSystem.unregister(this);
  }

  @HostListener('dragstart', ['$event'])
  onDragstart(e: DragEvent) {
    e.stopPropagation();
    e.preventDefault();
  }

  onDiceRollEnd() {
    this.animeState = 'inactive';
    this.changeDetector.markForCheck();
  }

  onInputStart(e: MouseEvent | TouchEvent) {
    this.startDoubleClickTimer(e);
    this.startIconHiddenTimer();

    // TODO:もっと良い方法考える
    if (this.isLock) {
      this.selectionSignalService.notifyDragLocked();
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
      if (this.isVisible) this.diceRoll();
    }
  }

  @HostListener('contextmenu', ['$event'])
  onContextMenu(e: Event) {
    e.stopPropagation();
    e.preventDefault();

    if (!this.pointerDeviceService.isAllowedToOpenContextMenu) return;
    const position = this.pointerDeviceService.pointers[0];

    const actions: ContextMenuAction[] = [];

    if (this.isVisible) {
      actions.push({
        name: 'ダイスを振る',
        action: () => {
          this.diceRoll();
        },
      });
    }
    if (actions.length) actions.push(ContextMenuSeparator);
    if (this.isMine || this.hasOwner) {
      actions.push({
        name: 'ダイスを公開',
        action: () => {
          this.owner = '';
          SoundEffect.play(PresetSound.unlock);
        },
      });
    }
    if (!this.isMine) {
      actions.push({
        name: '自分だけ見る',
        action: () => {
          this.owner = Network.peerContext.userId;
          SoundEffect.play(PresetSound.lock);
        },
      });
    }

    if (this.isVisible) {
      const subActions: ContextMenuAction[] = [];
      this.faces.forEach((face) => {
        subActions.push({
          name: `${face}`,
          action: () => {
            this.face = face;
            SoundEffect.play(PresetSound.dicePut);
          },
        });
      });
      actions.push({ name: `ダイス目を設定`, action: undefined, subActions: subActions });
    }

    actions.push(ContextMenuSeparator);
    actions.push(
      this.isLock
        ? {
            name: '固定解除',
            action: () => {
              this.isLock = false;
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
    actions.push(ContextMenuSeparator);

    actions.push({
      name: '詳細を表示',
      action: () => {
        this.showDetail(this.diceSymbol);
      },
    });
    actions.push({
      name: 'コピーを作る',
      action: () => {
        const cloneObject = this.diceSymbol.clone();
        cloneObject.location.x += this.gridSize;
        cloneObject.location.y += this.gridSize;
        cloneObject.update();
        SoundEffect.play(PresetSound.dicePut);
      },
    });
    actions.push({
      name: '削除する',
      action: () => {
        this.diceSymbol.destroy();
        SoundEffect.play(PresetSound.sweep);
      },
    });
    this.contextMenuService.open(position, actions, this.name);
  }

  onMove() {
    SoundEffect.play(PresetSound.dicePick);
  }

  onMoved() {
    SoundEffect.play(PresetSound.dicePut);
  }

  diceRoll(): string {
    EventSystem.call('ROLL_DICE_SYMBOL', { identifier: this.diceSymbol.identifier });
    SoundEffect.play(PresetSound.diceRoll1);
    return this.diceSymbol.diceRoll();
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
    const component = this.panelService.open<GameCharacterSheetComponent>(GameCharacterSheetComponent, option);
    component.tabletopObject = gameObject;
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
}
