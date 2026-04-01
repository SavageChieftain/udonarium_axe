import { NgStyle } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  OnDestroy,
  OnInit,
  viewChild,
} from '@angular/core';
import { Network } from '@axe/core/index';
import { PointerDeviceService } from '@axe/core/input/pointer-device.service';
import { ImageFile } from '@axe/core/storage/image-file';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import { GameCharacterBuffViewComponent } from '@axe/features/character/game-character-buff-view/game-character-buff-view.component';
import { GameCharacterSheetComponent } from '@axe/features/character/game-character-sheet/game-character-sheet.component';
import { GameDataElementBuffComponent } from '@axe/features/character/game-data-element-buff/game-data-element-buff.component';
import { ChatPaletteComponent } from '@axe/features/chat/chat-palette/chat-palette.component';
import { RemoteControllerComponent } from '@axe/features/controller/remote-controller/remote-controller.component';
import { InputHandler } from '@axe/shared/directives/input-handler';
import { MovableOption } from '@axe/shared/directives/movable.directive';
import { MovableDirective } from '@axe/shared/directives/movable.directive';
import { RotableOption } from '@axe/shared/directives/rotable.directive';
import { RotableDirective } from '@axe/shared/directives/rotable.directive';
import { GameObjectInventoryService } from '@axe/shared/inventory/game-object-inventory.service';
import { SafePipe } from '@axe/shared/pipes/safe.pipe';
import { ObjectChangeService } from '@axe/shared/sync/object-change.service';
import { ContextMenuSeparator, ContextMenuService } from '@axe/shared/ui/context-menu.service';
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
export class GameCharacterComponent implements OnInit, OnDestroy, AfterViewInit {
  private contextMenuService = inject(ContextMenuService);
  private elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private panelService = inject(PanelService);
  private pointerDeviceService = inject(PointerDeviceService);
  private objectStore = inject(ObjectStore);
  private selectionSignalService = inject(SelectionSignalService);
  private inventoryService = inject(GameObjectInventoryService);
  private uiSignalService = inject(UiSignalService);
  private objectChange = inject(ObjectChangeService);
  private destroyRef = inject(DestroyRef);

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

  get name(): string {
    const char = this.gameCharacter();
    if (!char) return '';
    this.objectChange.versionOf(char.identifier)();
    return char.name;
  }
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
  get imageFile(): ImageFile {
    this.objectChange.fileVersion();
    const char = this.gameCharacter();
    if (!char) throw new Error('gameCharacter is not set');
    return char.imageFile;
  }
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

  protected foldingBuff: boolean = false;
  isEdit: boolean = false;
  gridSize: number = 50;
  math = Math;

  viewRotateX = 50;
  readonly viewRotateZ = computed(() => this.uiSignalService.tableViewRotation()?.z ?? 10);

  movableOption: MovableOption = {};
  private input: InputHandler | null = null;

  rotableOption: RotableOption = {};

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

  ngOnInit() {
    const char = this.gameCharacter();
    if (!char) return;
    this.movableOption = {
      tabletopObject: char,
      transformCssOffset: 'translateZ(1.0px)',
      colideLayers: ['terrain'],
    };
    this.rotableOption = {
      tabletopObject: char,
    };
  }

  ngAfterViewInit() {
    this.input = new InputHandler(this.elementRef.nativeElement);
    if (this.input) this.input.onStart = (e) => this.onInputStart(e);
  }

  ngOnDestroy() {
    clearTimeout(this.highlightTimer);
    clearTimeout(this.unhighlightTimer);
    if (this.input) this.input.destroy();
  }

  onDragstart(e: DragEvent) {
    e.stopPropagation();
    e.preventDefault();
  }

  onInputStart(_e: MouseEvent | TouchEvent) {
    if (this.input) this.input.cancel();

    // TODO:もっと良い方法考える
    if (this.isLock) {
      this.selectionSignalService.notifyDragLocked();
    }
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
      [
        {
          name: '高度設定',
          action: undefined,
          subActions: [
            {
              name: '高度を0にする',
              action: () => {
                if (this.altitude != 0) {
                  this.altitude = 0;
                  SoundEffect.play(PresetSound.sweep);
                }
              },
              altitudeHande: char,
            },
            this.isAltitudeIndicate
              ? {
                  name: '☑ 高度の表示',
                  action: () => {
                    this.isAltitudeIndicate = false;
                    SoundEffect.play(PresetSound.sweep);
                    this.inventoryService.notifyInventoryUpdate();
                  },
                }
              : {
                  name: '☐ 高度の表示',
                  action: () => {
                    this.isAltitudeIndicate = true;
                    SoundEffect.play(PresetSound.sweep);
                    this.inventoryService.notifyInventoryUpdate();
                  },
                },
            this.isDropShadow
              ? {
                  name: '☑ 影の表示',
                  action: () => {
                    this.isDropShadow = false;
                    SoundEffect.play(PresetSound.sweep);
                    this.inventoryService.notifyInventoryUpdate();
                  },
                }
              : {
                  name: '☐ 影の表示',
                  action: () => {
                    this.isDropShadow = true;
                    SoundEffect.play(PresetSound.sweep);
                    this.inventoryService.notifyInventoryUpdate();
                  },
                },
          ],
        },
        ContextMenuSeparator,
        {
          name: '詳細を表示',
          action: () => {
            this.showDetail(char);
          },
        },
        {
          name: 'チャットパレットを表示',
          action: () => {
            this.showChatPalette(char);
          },
        },
        {
          name: 'リモコンを表示',
          action: () => {
            this.showRemoteController(char);
          },
        },
        {
          name: 'バフ編集',
          action: () => {
            this.showBuffEdit(char);
          },
        },
        ContextMenuSeparator,
        {
          name: '共有イベントリに移動',
          action: () => {
            char.setLocation('common');
            SoundEffect.play(PresetSound.piecePut);
          },
        },
        {
          name: '個人イベントリに移動',
          action: () => {
            char.setLocation(Network.peerId);
            SoundEffect.play(PresetSound.piecePut);
          },
        },
        {
          name: '墓場に移動',
          action: () => {
            char.setLocation('graveyard');
            SoundEffect.play(PresetSound.sweep);
          },
        },
        ContextMenuSeparator,
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
            },
        ContextMenuSeparator,
        {
          name: 'コピーを作る',
          action: () => {
            const cloneObject = char.clone();
            cloneObject.location.x += this.gridSize;
            cloneObject.location.y += this.gridSize;
            cloneObject.update();
            SoundEffect.play(PresetSound.piecePut);
          },
        },
      ],
      this.name
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
    const component = this.panelService.open<ChatPaletteComponent>(ChatPaletteComponent, option);
    component.character = gameObject;
  }

  private showRemoteController(gameObject: GameCharacter) {
    const coordinate = this.pointerDeviceService.pointers[0];
    const option: PanelOption = {
      left: coordinate.x - 250,
      top: coordinate.y - 175,
      width: 700,
      height: 600,
    };
    const component = this.panelService.open<RemoteControllerComponent>(RemoteControllerComponent, option);
    component.character = gameObject;
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
    component.character = gameObject;
  }

  protected foldingBuffFlag(flag: boolean) {
    this.foldingBuff = flag;
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
