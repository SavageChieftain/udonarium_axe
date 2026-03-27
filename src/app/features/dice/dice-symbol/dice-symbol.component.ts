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
import { DiceSymbol } from '@axe/domain/dice/dice-symbol';
import { callRollDiceSymbol } from '@axe/domain/domain-events';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { GameCharacterSheetComponent } from '@axe/features/character/game-character-sheet/game-character-sheet.component';
import { ContextMenuAction, ContextMenuSeparator, ContextMenuService } from '@axe/shared/context-menu.service';
import { InputHandler } from '@axe/shared/directives/input-handler';
import { MovableOption } from '@axe/shared/directives/movable.directive';
import { MovableDirective } from '@axe/shared/directives/movable.directive';
import { RotableOption } from '@axe/shared/directives/rotable.directive';
import { RotableDirective } from '@axe/shared/directives/rotable.directive';
import { PanelOption, PanelService } from '@axe/shared/panel.service';
import { SafePipe } from '@axe/shared/pipes/safe.pipe';
import { SelectionSignalService } from '@axe/shared/selection-signal.service';
import { ObjectChangeService } from '@axe/shared/sync/object-change.service';

@Component({
  selector: 'dice-symbol',
  templateUrl: './dice-symbol.component.html',
  styleUrls: ['./dice-symbol.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MovableDirective, RotableDirective, NgClass, NgStyle, SafePipe],
  host: {
    '(dragstart)': 'onDragstart($event)',
    '(contextmenu)': 'onContextMenu($event)',
  },
})
export class DiceSymbolComponent implements OnInit, AfterViewInit, OnDestroy {
  private panelService = inject(PanelService);
  private contextMenuService = inject(ContextMenuService);
  private elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private imageService = inject(ImageService);
  private pointerDeviceService = inject(PointerDeviceService);
  private objectStore = inject(ObjectStore);
  private selectionSignalService = inject(SelectionSignalService);
  private objectChange = inject(ObjectChangeService);
  private destroyRef = inject(DestroyRef);

  readonly diceSymbol = input<DiceSymbol>(null!);

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

  get name(): string {
    this.objectChange.versionOf(this.diceSymbol().identifier)();
    this.objectChange.networkVersion();
    if (this.diceSymbol().owner) {
      const cursor = PeerCursor.findByUserId(this.diceSymbol().owner);
      if (cursor) this.objectChange.versionOf(cursor.identifier)();
    }
    return this.diceSymbol().name;
  }
  set name(name: string) {
    this.diceSymbol().name = name;
  }
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
  get imageFile(): ImageFile {
    this.objectChange.fileVersion();
    return this.imageService.getEmptyOr(this.diceSymbol().imageFile);
  }

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

  private iconHiddenTimer: NodeJS.Timeout = null!;
  readonly isIconHidden = signal(false);

  gridSize: number = 50;

  movableOption: MovableOption = {};
  rotableOption: RotableOption = {};

  private doubleClickTimer: NodeJS.Timeout = null!;
  private doubleClickPoint = { x: 0, y: 0 };

  private input: InputHandler = null!;
  ngOnInit() {
    this.objectChange.rollDiceSymbol$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      if (event.identifier === this.diceSymbol().identifier) {
        this.animeState.set('inactive');
        setTimeout(() => {
          this.animeState.set('active');
        });
      }
    });
    this.movableOption = {
      tabletopObject: this.diceSymbol(),
      transformCssOffset: 'translateZ(1.0px)',
      colideLayers: ['terrain'],
    };
    this.rotableOption = {
      tabletopObject: this.diceSymbol(),
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
        this.showDetail(this.diceSymbol());
      },
    });
    actions.push({
      name: 'コピーを作る',
      action: () => {
        const cloneObject = this.diceSymbol().clone();
        cloneObject.location.x += this.gridSize;
        cloneObject.location.y += this.gridSize;
        cloneObject.update();
        SoundEffect.play(PresetSound.dicePut);
      },
    });
    actions.push({
      name: '削除する',
      action: () => {
        this.diceSymbol().destroy();
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
    const component = this.panelService.open<GameCharacterSheetComponent>(GameCharacterSheetComponent, option);
    component.tabletopObject = gameObject;
  }

  private startIconHiddenTimer() {
    clearTimeout(this.iconHiddenTimer);
    this.iconHiddenTimer = setTimeout(() => {
      this.iconHiddenTimer = null!;
      this.isIconHidden.set(false);
    }, 300);
    this.isIconHidden.set(true);
  }

  private adjustMinBounds(value: number, min: number = 0): number {
    return value < min ? min : value;
  }
}
