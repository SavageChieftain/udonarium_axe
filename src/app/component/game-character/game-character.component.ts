import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { GameObject } from '@axe/core/synchronize-object/game-object';
import { ImageFile } from '@axe/core/file-storage/image-file';
import { ObjectNode } from '@axe/core/synchronize-object/object-node';
import { ObjectStore } from '@axe/core/synchronize-object/object-store';
import { EventSystem, Network } from '@axe/core/system';
import { GameCharacter } from '@axe/game-character';
import { PresetSound, SoundEffect } from '@axe/sound-effect';
import { ChatPaletteComponent } from 'component/chat-palette/chat-palette.component';
import { GameCharacterSheetComponent } from 'component/game-character-sheet/game-character-sheet.component';
import { InputHandler } from 'directive/input-handler';
import { MovableOption } from 'directive/movable.directive';
import { RotableOption } from 'directive/rotable.directive';
import { ContextMenuSeparator, ContextMenuService } from 'service/context-menu.service';
import { PanelOption, PanelService } from 'service/panel.service';
import { PointerDeviceService } from 'service/pointer-device.service';
import { RemoteControllerComponent } from 'component/remote-controller/remote-controller.component';
import { GameCharacterBuffViewComponent } from 'component/game-character-buff-view/game-character-buff-view.component';
import { MovableDirective } from 'directive/movable.directive';
import { RotableDirective } from 'directive/rotable.directive';
import { NgStyle } from '@angular/common';
import { GameDataElementBuffComponent } from 'component/game-data-element-buff/game-data-element-buff.component';
import { SafePipe } from 'pipe/safe.pipe';

@Component({
  selector: 'game-character',
  templateUrl: './game-character.component.html',
  styleUrls: ['./game-character.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MovableDirective, RotableDirective, NgStyle, GameDataElementBuffComponent, SafePipe],
})
export class GameCharacterComponent implements OnInit, OnDestroy, AfterViewInit {
  private ngZone = inject(NgZone);
  private contextMenuService = inject(ContextMenuService);
  private elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private panelService = inject(PanelService);
  private changeDetector = inject(ChangeDetectorRef);
  private pointerDeviceService = inject(PointerDeviceService);

  @Input() gameCharacter: GameCharacter | null = null!;
  @Input() is3D: boolean = false;
  @ViewChild('root') rootElementRef!: ElementRef<HTMLElement>;

  get isLock(): boolean {
    return this.gameCharacter!.isLock;
  }
  set isLock(isLock: boolean) {
    this.gameCharacter!.isLock = isLock;
  }

  get name(): string {
    return this.gameCharacter!.name;
  }
  get size(): number {
    return this.adjustMinBounds(this.gameCharacter!.size);
  }
  get altitude(): number {
    return this.gameCharacter!.altitude;
  }
  set altitude(altitude: number) {
    this.gameCharacter!.altitude = altitude;
  }
  get imageFile(): ImageFile {
    return this.gameCharacter!.imageFile;
  }
  get rotate(): number {
    return this.gameCharacter!.rotate;
  }
  set rotate(rotate: number) {
    this.gameCharacter!.rotate = rotate;
  }
  get roll(): number {
    return this.gameCharacter!.roll;
  }
  set roll(roll: number) {
    this.gameCharacter!.roll = roll;
  }
  get isDropShadow(): boolean {
    return this.gameCharacter!.isDropShadow;
  }
  set isDropShadow(isDropShadow: boolean) {
    this.gameCharacter!.isDropShadow = isDropShadow;
  }
  get isAltitudeIndicate(): boolean {
    return this.gameCharacter!.isAltitudeIndicate;
  }
  set isAltitudeIndicate(isAltitudeIndicate: boolean) {
    this.gameCharacter!.isAltitudeIndicate = isAltitudeIndicate;
  }

  protected foldingBuff: boolean = false;
  isEdit: boolean = false;
  gridSize: number = 50;
  math = Math;

  viewRotateX = 50;
  viewRotateZ = 10;

  movableOption: MovableOption = {};
  private input: InputHandler = null!;

  rotableOption: RotableOption = {};

  private highlightTimer: ReturnType<typeof setTimeout> = null!;
  private unhighlightTimer: ReturnType<typeof setTimeout> = null!;

  get elevation(): number {
    return +((this.gameCharacter!.posZ + this.altitude * this.gridSize) / this.gridSize).toFixed(1);
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
    this.gameCharacter!.chatBubbleAltitude = ret;
*/
    const ret = 0;
    return ret;
  }

  ngOnInit() {
    EventSystem.register(this)
      .on('UPDATE_GAME_OBJECT', (event) => {
        const object = ObjectStore.instance.get(event.data.identifier);
        if (!this.gameCharacter || !object) return;
        if (this.gameCharacter === object || (object instanceof ObjectNode && this.gameCharacter!.contains(object))) {
          this.changeDetector.markForCheck();
        }
      })
      .on('SYNCHRONIZE_FILE_LIST', (_event) => {
        this.changeDetector.markForCheck();
      })
      .on('UPDATE_FILE_RESOURE', (_event) => {
        this.changeDetector.markForCheck();
      })
      .on<{ x: number; z: number }>('TABLE_VIEW_ROTATE', -1000, (event) => {
        this.ngZone.run(() => {
          this.viewRotateX = event.data['x'];
          this.viewRotateZ = event.data['z'];
          this.changeDetector.markForCheck();
        });
      })
      .on('CHK_TARGET_CHANGE', -1000, (event) => {
        const objct = ObjectStore.instance.get(event.data.identifier);
        if (objct == this.gameCharacter!) {
          this.changeDetector.detectChanges();
        }
      })

      .on('HIGHTLIGHT_TABLETOP_OBJECT', (event) => {
        if (this.gameCharacter!.identifier !== event.data.identifier) {
          return;
        }
        if (this.gameCharacter!.location.name != 'table') {
          return;
        }

        console.log(`recv focus event to ${this.gameCharacter!.name}`);
        // アニメーション開始のタイマーが既にあってアニメーション開始前（ごくわずかな間）ならば何もしない
        if (this.highlightTimer != null) {
          return;
        }

        // アニメーション中であればアニメーションを初期化
        if (this.rootElementRef.nativeElement.classList.contains('focused')) {
          clearTimeout(this.unhighlightTimer);
          this.rootElementRef.nativeElement.classList.remove('focused');
        }

        // アニメーション開始処理タイマー
        this.highlightTimer = setTimeout(() => {
          this.highlightTimer = null!;
          this.rootElementRef.nativeElement.classList.add('focused');
        }, 0);

        // アニメーション終了処理タイマー
        this.unhighlightTimer = setTimeout(() => {
          this.unhighlightTimer = null!;
          this.rootElementRef.nativeElement.classList.remove('focused');
        }, 1010);
      });
    this.movableOption = {
      tabletopObject: this.gameCharacter!,
      transformCssOffset: 'translateZ(1.0px)',
      colideLayers: ['terrain'],
    };
    this.rotableOption = {
      tabletopObject: this.gameCharacter!,
    };
  }

  ngAfterViewInit() {
    this.ngZone.runOutsideAngular(() => {
      this.input = new InputHandler(this.elementRef.nativeElement);
    });
    this.input.onStart = this.onInputStart.bind(this);
  }

  ngOnDestroy() {
    if (this.input) this.input.destroy();
    EventSystem.unregister(this);
  }

  @HostListener('dragstart', ['$event'])
  onDragstart(e: DragEvent) {
    console.log('Dragstart Cancel !!!!');
    e.stopPropagation();
    e.preventDefault();
  }

  onInputStart(_e: MouseEvent | TouchEvent) {
    this.input.cancel();

    // TODO:もっと良い方法考える
    if (this.isLock) {
      EventSystem.trigger('DRAG_LOCKED_OBJECT', {});
    }
  }

  @HostListener('contextmenu', ['$event'])
  onContextMenu(e: Event) {
    e.stopPropagation();
    e.preventDefault();

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
              altitudeHande: this.gameCharacter!,
            },
            this.isAltitudeIndicate
              ? {
                  name: '☑ 高度の表示',
                  action: () => {
                    this.isAltitudeIndicate = false;
                    SoundEffect.play(PresetSound.sweep);
                    EventSystem.trigger('UPDATE_INVENTORY', null!);
                  },
                }
              : {
                  name: '☐ 高度の表示',
                  action: () => {
                    this.isAltitudeIndicate = true;
                    SoundEffect.play(PresetSound.sweep);
                    EventSystem.trigger('UPDATE_INVENTORY', null!);
                  },
                },
            this.isDropShadow
              ? {
                  name: '☑ 影の表示',
                  action: () => {
                    this.isDropShadow = false;
                    SoundEffect.play(PresetSound.sweep);
                    EventSystem.trigger('UPDATE_INVENTORY', null!);
                  },
                }
              : {
                  name: '☐ 影の表示',
                  action: () => {
                    this.isDropShadow = true;
                    SoundEffect.play(PresetSound.sweep);
                    EventSystem.trigger('UPDATE_INVENTORY', null!);
                  },
                },
          ],
        },
        ContextMenuSeparator,
        {
          name: '詳細を表示',
          action: () => {
            this.showDetail(this.gameCharacter!);
          },
        },
        {
          name: 'チャットパレットを表示',
          action: () => {
            this.showChatPalette(this.gameCharacter!);
          },
        },
        {
          name: 'リモコンを表示',
          action: () => {
            this.showRemoteController(this.gameCharacter!);
          },
        },
        {
          name: 'バフ編集',
          action: () => {
            this.showBuffEdit(this.gameCharacter!);
          },
        },
        ContextMenuSeparator,
        {
          name: '共有イベントリに移動',
          action: () => {
            this.gameCharacter!.setLocation('common');
            SoundEffect.play(PresetSound.piecePut);
          },
        },
        {
          name: '個人イベントリに移動',
          action: () => {
            this.gameCharacter!.setLocation(Network.peerId);
            SoundEffect.play(PresetSound.piecePut);
          },
        },
        {
          name: '墓場に移動',
          action: () => {
            this.gameCharacter!.setLocation('graveyard');
            SoundEffect.play(PresetSound.sweep);
          },
        },
        /*
      {
        name: '削除', action: () => {
          console.log("円柱_削除実行_キャラコマ");
          this.gameCharacter!.setLocation('graveyard');
          this.deleteGameObject(this.gameCharacter!);
          ObjectStore.instance.clearDeleteHistory();
        }
      },
*/
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
            const cloneObject = this.gameCharacter!.clone();
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

  private deleteGameObject(gameObject: GameObject) {
    gameObject.destroy();
    this.changeDetector.markForCheck();
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
    const key_ctrl = key_event.ctrlKey;
    const key_alt = key_event.altKey;
    const key_meta = key_event.metaKey;
    //キーに対応した処理

    if (key_shift) console.log('shiftキー');
    if (key_ctrl) console.log('ctrlキー');
    if (key_alt) {
      console.log('altキー');
      this.gameCharacter!.targeted = this.gameCharacter!.targeted ? false : true;
    }
    if (key_meta) console.log('metaキー');

    if (key_shift && key_alt) {
      console.log('shift+ALTキー');
      const objects = ObjectStore.instance.getObjects(GameCharacter);
      for (const object of objects) {
        object.targeted = false;
        EventSystem.trigger('CHK_TARGET_CHANGE', {
          identifier: object.identifier,
          className: object.aliasName,
        });
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
    console.log('private foldingBuffFlag');
    this.foldingBuff = flag;
  }

  get buffNum(): number {
    if (this.gameCharacter!.buffDataElement.children.length == 0) {
      return 0;
    }
    return this.gameCharacter!.buffDataElement.children[0].children.length;
  }
}
