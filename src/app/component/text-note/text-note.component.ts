import { NgClass, NgStyle } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  effect,
  ElementRef,
  HostListener,
  inject,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ImageFile } from '@axe/class/core/file-storage/image-file';
import { ObjectNode } from '@axe/class/core/synchronize-object/object-node';
import { ObjectStore } from '@axe/class/core/synchronize-object/object-store';
import { EventSystem } from '@axe/class/core/system';
import { PresetSound, SoundEffect } from '@axe/class/sound-effect';
import { TextNote } from '@axe/class/text-note';
import { GameCharacterSheetComponent } from '@axe/component/game-character-sheet/game-character-sheet.component';
import { InputHandler } from '@axe/directive/input-handler';
import { MovableOption } from '@axe/directive/movable.directive';
import { MovableDirective } from '@axe/directive/movable.directive';
import { RotableOption } from '@axe/directive/rotable.directive';
import { RotableDirective } from '@axe/directive/rotable.directive';
import { SafePipe } from '@axe/pipe/safe.pipe';
import { ContextMenuSeparator, ContextMenuService } from '@axe/service/context-menu.service';
import { GameObjectInventoryService } from '@axe/service/game-object-inventory.service';
import { PanelOption, PanelService } from '@axe/service/panel.service';
import { PointerDeviceService } from '@axe/service/pointer-device.service';
import { SelectionSignalService } from '@axe/service/selection-signal.service';
import { UiSignalService } from '@axe/service/ui-signal.service';

@Component({
  selector: 'text-note',
  templateUrl: './text-note.component.html',
  styleUrls: ['./text-note.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MovableDirective, RotableDirective, NgClass, NgStyle, FormsModule, SafePipe],
})
export class TextNoteComponent implements OnInit, OnDestroy, AfterViewInit {
  private contextMenuService = inject(ContextMenuService);
  private elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private panelService = inject(PanelService);
  private changeDetector = inject(ChangeDetectorRef);
  private pointerDeviceService = inject(PointerDeviceService);
  private objectStore = inject(ObjectStore);
  private selectionSignalService = inject(SelectionSignalService);
  private inventoryService = inject(GameObjectInventoryService);
  private uiSignalService = inject(UiSignalService);

  constructor() {
    effect(() => {
      const rotation = this.uiSignalService.tableViewRotation();
      if (!rotation) return;
      this.viewRotateZ = rotation.z ?? 10;
      this.changeDetector.markForCheck();
    });
    effect(() => {
      const req = this.uiSignalService.noteResizeRequest();
      if (!req || !this.textNote) return;
      if (this.textNote.identifier === req.identifier) {
        this.calcFitHeight();
      }
    });
  }

  @ViewChild('textArea', { static: true }) textAreaElementRef: ElementRef;

  @Input() textNote: TextNote = null!;
  @Input() is3D: boolean = false;

  get title(): string {
    return this.textNote.title;
  }
  get isLock(): boolean {
    return this.textNote.isLock;
  }
  set isLock(isLock: boolean) {
    this.textNote.isLock = isLock;
  }

  oldText: string = '';
  oldFontSize: number = 9;
  get text(): string {
    if (this.oldText != this.textNote.text) {
      this.calcFitHeightIfNeeded();
    }
    this.oldText = this.textNote.text;
    return this.textNote.text;
  }
  set text(text: string) {
    this.calcFitHeightIfNeeded();
    this.textNote.text = text;
    this.oldText = text;
  }
  get fontSize(): number {
    if (this.oldFontSize != this.textNote.fontSize) {
      this.calcFitHeightIfNeeded();
    }
    this.oldFontSize = this.textNote.fontSize;
    return this.textNote.fontSize;
  }
  get imageFile(): ImageFile {
    return this.textNote.imageFile;
  }
  get rotate(): number {
    return this.textNote.rotate;
  }
  set rotate(rotate: number) {
    this.textNote.rotate = rotate;
  }
  get height(): number {
    return this.adjustMinBounds(this.textNote.height);
  }
  get width(): number {
    return this.adjustMinBounds(this.textNote.width);
  }

  get altitude(): number {
    return this.textNote.altitude;
  }
  set altitude(altitude: number) {
    this.textNote.altitude = altitude;
  }

  get textNoteAltitude(): number {
    let ret = this.altitude;
    if (this.isUpright && this.altitude < 0) {
      if (-this.height <= this.altitude) return 0;
      ret += this.height;
    }
    return +ret.toFixed(1);
  }

  get isUpright(): boolean {
    return this.textNote.isUpright;
  }
  set isUpright(isUpright: boolean) {
    this.textNote.isUpright = isUpright;
  }

  get isAltitudeIndicate(): boolean {
    return this.textNote.isAltitudeIndicate;
  }
  set isAltitudeIndicate(isAltitudeIndicate: boolean) {
    this.textNote.isAltitudeIndicate = isAltitudeIndicate;
  }

  get isSelected(): boolean {
    return document.activeElement === this.textAreaElementRef.nativeElement;
  }

  private callbackOnMouseUp = (e: MouseEvent) => this.onMouseUp(e);

  gridSize: number = 50;
  math = Math;

  private _transitionTimeout: ReturnType<typeof setTimeout> | null = null;
  private _transition: boolean = false;
  get transition(): boolean {
    return this._transition;
  }
  set transition(transition: boolean) {
    this._transition = transition;
    if (this._transitionTimeout) clearTimeout(this._transitionTimeout);
    if (transition) {
      this._transitionTimeout = setTimeout(() => {
        this._transition = false;
      }, 132);
    } else {
      this._transitionTimeout = null!;
    }
  }
  private _fallTimeout: ReturnType<typeof setTimeout> | null = null;
  private _fall: boolean = false;
  get fall(): boolean {
    return this._fall;
  }
  set fall(fall: boolean) {
    this._fall = fall;
    if (this._fallTimeout) clearTimeout(this._fallTimeout);
    if (fall) {
      this._fallTimeout = setTimeout(() => {
        this._fall = false;
      }, 132);
    } else {
      this._fallTimeout = null!;
    }
  }

  private calcFitHeightTimer: ReturnType<typeof setTimeout> | null = null;
  movableOption: MovableOption = {};
  rotableOption: RotableOption = {};

  private input: InputHandler | null = null;
  viewRotateZ = 10;

  ngOnInit() {
    EventSystem.register(this)
      .on('UPDATE_GAME_OBJECT', -1000, (event) => {
        const object = this.objectStore.get(event.data.identifier);
        if (!this.textNote || !object) return;
        if (this.textNote === object || (object instanceof ObjectNode && this.textNote.contains(object))) {
          this.changeDetector.markForCheck();
        }
      })
      .on('SYNCHRONIZE_FILE_LIST', (_event) => {
        this.changeDetector.markForCheck();
      })
      .on('UPDATE_FILE_RESOURE', -1000, (_event) => {
        this.changeDetector.markForCheck();
      });
    this.movableOption = {
      tabletopObject: this.textNote,
      transformCssOffset: 'translateZ(0.15px)',
      colideLayers: ['terrain'],
    };
    this.rotableOption = {
      tabletopObject: this.textNote,
    };
  }

  ngAfterViewInit() {
    this.input = new InputHandler(this.elementRef.nativeElement);
    this.input!.onStart = (e) => this.onInputStart(e);
  }

  ngOnDestroy() {
    if (this._transitionTimeout) clearTimeout(this._transitionTimeout);
    if (this._fallTimeout) clearTimeout(this._fallTimeout);
    EventSystem.unregister(this);
  }

  @HostListener('dragstart', ['$event'])
  onDragstart(e: DragEvent) {
    e.stopPropagation();
    e.preventDefault();
  }

  @HostListener('mousedown', ['$event'])
  onMouseDown(e: MouseEvent) {
    if (this.isSelected) return;
    e.preventDefault();
    this.textNote.toTopmost();

    // TODO:もっと良い方法考える
    if (e.button === 2) {
      this.selectionSignalService.notifyDragLocked();
      return;
    }
    this.addMouseEventListeners();
  }

  onMouseUp(e: MouseEvent) {
    if (this.pointerDeviceService.isAllowedToOpenContextMenu) {
      const selection = window.getSelection();
      if (!selection!.isCollapsed) selection!.removeAllRanges();

      //        if( e.target.id != 'scroll'){
      this.textAreaElementRef.nativeElement.focus();
      //        }
    }
    this.removeMouseEventListeners();
    e.preventDefault();
  }

  onRotateMouseDown(e: MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
  }

  onInputStart(_e: Event) {
    this.input!.cancel();

    // TODO:もっと良い方法考える
    if (this.isLock) {
      this.selectionSignalService.notifyDragLocked();
    }
  }

  @HostListener('contextmenu', ['$event'])
  onContextMenu(e: MouseEvent) {
    this.removeMouseEventListeners();
    if (this.isSelected) return;
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
              altitudeHande: this.textNote,
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
          ],
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
        this.isUpright
          ? {
              name: '寝かせる',
              action: () => {
                this.transition = true;
                this.isUpright = false;
                SoundEffect.play(PresetSound.sweep);
              },
            }
          : {
              name: '直立させる',
              action: () => {
                this.transition = true;
                this.isUpright = true;
                SoundEffect.play(PresetSound.sweep);
              },
            },
        ContextMenuSeparator,
        {
          name: 'メモを編集',
          action: () => {
            this.showDetail(this.textNote);
          },
        },
        {
          name: 'コピーを作る',
          action: () => {
            const cloneObject = this.textNote.clone();
            cloneObject.location.x += this.gridSize;
            cloneObject.location.y += this.gridSize;
            cloneObject.toTopmost();
            SoundEffect.play(PresetSound.cardPut);
          },
        },
        {
          name: '削除する',
          action: () => {
            this.textNote.destroy();
            SoundEffect.play(PresetSound.sweep);
          },
        },
      ],
      this.title
    );
  }

  onMove() {
    SoundEffect.play(PresetSound.cardPick);
  }

  onMoved() {
    SoundEffect.play(PresetSound.cardPut);
  }

  calcFitHeightIfNeeded() {
    if (this.calcFitHeightTimer) return;
    this.calcFitHeightTimer = setTimeout(() => {
      this.calcFitHeight();
      this.calcFitHeightTimer = null;
    }, 0);
  }

  oldScrollHeight = 0;
  oldOffsetHeight = 0;

  calcFitHeight() {
    const textArea: HTMLTextAreaElement = this.textAreaElementRef.nativeElement;

    //    if( ( this.oldScrollHeight == 0 ) && ( this.oldOffsetHeight == 0)){
    //      textArea.style.height = '0';
    //    }
    textArea.style.height = '0';
    if (!this.textNote.limitHeight) {
      if (textArea.scrollHeight > textArea.offsetHeight) {
        textArea.style.height = textArea.scrollHeight + 'px';
        this.oldScrollHeight = textArea.scrollHeight;
        this.oldOffsetHeight = textArea.offsetHeight;
      }
    } else {
      let textAreaHeight = textArea.scrollHeight;
      let textAreaMax = this.height * this.gridSize - 2;

      if (textAreaMax < this.gridSize) textAreaMax = this.gridSize - 2;
      if (this.title.length) {
        textAreaMax -= 32;
      } else {
        textAreaMax -= 2;
      }
      if (textAreaHeight > textAreaMax) textAreaHeight = textAreaMax;
      textArea.style.height = textAreaHeight + 'px';
    }
  }

  private adjustMinBounds(value: number, min: number = 0): number {
    return value < min ? min : value;
  }

  private addMouseEventListeners() {
    document.body.addEventListener('mouseup', this.callbackOnMouseUp, false);
  }

  private removeMouseEventListeners() {
    document.body.removeEventListener('mouseup', this.callbackOnMouseUp, false);
  }

  private showDetail(gameObject: TextNote) {
    this.selectionSignalService.selectObject(gameObject.identifier, gameObject.aliasName);
    const coordinate = this.pointerDeviceService.pointers[0];
    let title = '共有メモ設定';
    if (gameObject.title.length) title += ' - ' + gameObject.title;
    const option: PanelOption = {
      title: title,
      left: coordinate.x - 350,
      top: coordinate.y - 200,
      width: 700,
      height: 400,
    };
    const component = this.panelService.open<GameCharacterSheetComponent>(GameCharacterSheetComponent, option);
    component.tabletopObject = gameObject;
  }
}
