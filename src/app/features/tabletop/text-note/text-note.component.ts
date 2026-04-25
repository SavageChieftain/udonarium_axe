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
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PointerDeviceService } from '@axe/core/input/pointer-device.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { DataElement } from '@axe/domain/data/data-element';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import { TextNote } from '@axe/domain/tabletop/text-note';
import { buildTextNoteContextMenu } from '@axe/features/tabletop/text-note/text-note-context-menu';
import { InputHandler } from '@axe/shared/directives/input-handler';
import { MovableOption } from '@axe/shared/directives/movable.directive';
import { MovableDirective } from '@axe/shared/directives/movable.directive';
import { RotableOption } from '@axe/shared/directives/rotable.directive';
import { RotableDirective } from '@axe/shared/directives/rotable.directive';
import { GameObjectInventoryService } from '@axe/shared/inventory/game-object-inventory.service';
import { SafePipe } from '@axe/shared/pipes/safe.pipe';
import { ObjectChangeService } from '@axe/shared/sync/object-change.service';
import { ContextMenuService } from '@axe/shared/ui/context-menu.service';
import { PanelOption, PanelService } from '@axe/shared/ui/panel.service';
import { SelectionSignalService } from '@axe/shared/ui/selection-signal.service';
import { UiSignalService } from '@axe/shared/ui/ui-signal.service';

@Component({
  selector: 'text-note',
  templateUrl: './text-note.component.html',
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
        backface-visibility: hidden;
        -moz-user-select: none;
        -webkit-user-select: none;
        user-select: none;

        -moz-user-drag: none;
        -webkit-user-drag: none;

        width: 1px;
        height: 0;
      }

      .component-content {
        height: 100%;
        width: 100%;
        transform: translateX(-50%);
      }

      .upright-transform {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        transform-origin: 50% 100%;
        transform: rotateX(-90deg);
      }

      .is-bg-texture {
        background-repeat: no-repeat;
        background-size: 100% 100%;
      }

      .is-bg-color {
        box-sizing: border-box;
        color: #444;
        background-color: rgba(240, 218, 189, 0.9);
        border: solid 1px #999;
      }

      .title {
        box-sizing: border-box;
        font-size: 15px;
        padding: 3px 9px;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        backface-visibility: hidden;
      }

      .is-black-background {
        color: #ccc;
        background-color: rgba(30, 30, 30, 0.8);
      }

      .lock-icon {
        background-color: #cccccc;
        border-radius: 100%;
        color: #444;
        width: 25px;
        height: 25px;
      }

      .is-right {
        position: absolute;
        top: 0px;
        right: 0;
        margin: auto;
      }

      .textarea {
        width: 100%;
        height: 100%;
        resize: none;
        overflow: hidden;

        box-sizing: border-box;
        background: none;
        border: none;
        border-radius: 0px;
        outline: none;

        color: #444;
        font-family: Cambria, Georgia;
        font-size: 1rem;
        padding: 2px;
        margin: 0;
        white-space: pre-wrap;
        word-wrap: break-word;
        overflow-wrap: anywhere;
        word-break: break-word;

        backface-visibility: hidden;
      }

      .textarea:focus {
        background: rgba(255, 255, 255, 0.75);
      }

      .is-black-background {
        color: #ccc;
        background-color: rgba(30, 30, 30, 0.8);
      }

      .is-outline-text {
        font-size: 24px;
        color: #444;
        text-shadow:
          #f2f2f2 0px 0px 0.5px,
          #f2f2f2 0px 0px 0.5px,
          #f2f2f2 0px 0px 0.5px,
          #f2f2f2 0px 0px 0.5px,
          #f2f2f2 0px 0px 0.5px,
          #f2f2f2 0px 0px 0.5px,
          #f2f2f2 0px 0px 0.5px,
          #f2f2f2 0px 0px 0.5px;
      }

      .lock-icon-mark {
        position: absolute;
        width: 42px;
        height: 28px;
        box-sizing: border-box;
        z-index: 1;
        text-align: center;
        padding: 2px;
        background-color: rgba(30, 30, 30, 0.8);
        border-radius: 28px;
        color: #ccc;
        font-size: 8px;
      }

      .rotate-grab {
        position: absolute;
        width: 42px;
        height: 28px;
        box-sizing: border-box;
        cursor: -moz-default;
        cursor: -webkit-default;
        cursor: default;
        z-index: 1;
        text-align: center;
        padding: 2px;
        background-color: #cccccc;
        border-radius: 28px;
        color: #444;
        font-size: 8px;
      }

      .of-left-top {
        top: -14px;
        left: -21px;
      }

      .of-right-top {
        top: -14px;
        right: -21px;
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

      .altitude-indicator {
        padding-left: 2px;
        font-size: 11px;
        font-weight: bolder;
        color: blanchedalmond;
        text-shadow: #444 0px 0px 3px;
        backface-visibility: hidden;
      }

      .fall {
        -webkit-transition: -webkit-transform 132ms cubic-bezier(0.21, 0.97, 0.75, 1.25);
        transition: transform 132ms cubic-bezier(0.21, 0.97, 0.75, 1.25);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MovableDirective, RotableDirective, NgClass, NgStyle, FormsModule, SafePipe],
  host: {
    class: 'block',
    '(dragstart)': 'onDragstart($event)',
    '(mousedown)': 'onMouseDown($event)',
    '(contextmenu)': 'onContextMenu($event)',
  },
})
export class TextNoteComponent {
  private readonly contextMenuService = inject(ContextMenuService);
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly panelService = inject(PanelService);
  private readonly pointerDeviceService = inject(PointerDeviceService);
  private readonly objectStore = inject(ObjectStore);
  private readonly selectionSignalService = inject(SelectionSignalService);
  private readonly inventoryService = inject(GameObjectInventoryService);
  private readonly uiSignalService = inject(UiSignalService);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    effect(() => {
      const req = this.uiSignalService.noteResizeRequest();
      if (!req || !this.textNote()) return;
      if (this.textNote().identifier === req.identifier) {
        this.calcFitHeight();
      }
    });
    effect(() => {
      this.movableOption.set({
        tabletopObject: this.textNote(),
        transformCssOffset: 'translateZ(0.15px)',
        colideLayers: ['terrain'],
      });
      this.rotableOption.set({
        tabletopObject: this.textNote(),
      });
    });
    afterNextRender(() => {
      this.input = new InputHandler(this.elementRef.nativeElement);
      this.input.onStart = (e) => this.onInputStart(e);
    });
    this.destroyRef.onDestroy(() => {
      if (this._transitionTimeout) clearTimeout(this._transitionTimeout);
      if (this._fallTimeout) clearTimeout(this._fallTimeout);
      if (this.textUpdateTimer) clearTimeout(this.textUpdateTimer);
    });
    effect(() => {
      const note = this.textNote();
      this.objectChange.versionOf(note.identifier)();
      const trackChildren = (elms: readonly DataElement[]) => {
        for (const elm of elms) {
          this.objectChange.versionOf(elm.identifier)();
          if (elm.children.length) trackChildren(elm.children as DataElement[]);
        }
      };
      if (note.commonDataElement) trackChildren(note.commonDataElement.children as DataElement[]);
      this._text.set(note.text);
      this._fontSize.set(note.fontSize);
      this.calcFitHeightIfNeeded();
    });
  }

  readonly textAreaElementRef = viewChild.required<ElementRef>('textArea');

  readonly textNote = input.required<TextNote>();
  readonly is3D = input(false);

  readonly title = computed(() => {
    const note = this.textNote();
    this.objectChange.versionOf(note.identifier)();
    if (note.commonDataElement) {
      for (const elm of note.commonDataElement.children as DataElement[]) {
        this.objectChange.versionOf(elm.identifier)();
      }
    }
    return note.title;
  });

  /** TextNote とその子 DataElement の全変更を追跡する computed。テンプレートから参照して OnPush を突破する */
  readonly textNoteVersion = computed(() => {
    const note = this.textNote();
    let v = this.objectChange.versionOf(note.identifier)();
    if (note.commonDataElement) {
      for (const elm of note.commonDataElement.children as DataElement[]) {
        v += this.objectChange.versionOf(elm.identifier)();
      }
    }
    return v;
  });

  get isLock(): boolean {
    return this.textNote().isLock;
  }
  set isLock(isLock: boolean) {
    this.textNote().isLock = isLock;
  }

  private readonly _text = signal('');
  private readonly _fontSize = signal(9);
  private textUpdateTimer: ReturnType<typeof setTimeout> | null = null;

  get text(): string {
    return this._text();
  }
  set text(text: string) {
    this._text.set(text);
    this.setTextUpdateTimer();
  }
  get fontSize(): number {
    return this._fontSize();
  }

  private setTextUpdateTimer() {
    if (this.textUpdateTimer) clearTimeout(this.textUpdateTimer);
    this.textUpdateTimer = setTimeout(() => {
      const note = this.textNote();
      if (note.text !== this._text()) note.text = this._text();
      this.textUpdateTimer = null;
      this.calcFitHeightIfNeeded();
    }, 66);
  }

  readonly imageFile = computed(() => {
    this.objectChange.fileVersion();
    const textNote = this.textNote();
    this.objectChange.versionOf(textNote.identifier)();
    return textNote.imageFile;
  });
  get rotate(): number {
    return this.textNote().rotate;
  }
  set rotate(rotate: number) {
    this.textNote().rotate = rotate;
  }
  get height(): number {
    return this.adjustMinBounds(this.textNote().height);
  }
  get width(): number {
    return this.adjustMinBounds(this.textNote().width);
  }

  get altitude(): number {
    return this.textNote().altitude;
  }
  set altitude(altitude: number) {
    this.textNote().altitude = altitude;
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
    return this.textNote().isUpright;
  }
  set isUpright(isUpright: boolean) {
    this.textNote().isUpright = isUpright;
  }

  get isAltitudeIndicate(): boolean {
    return this.textNote().isAltitudeIndicate;
  }
  set isAltitudeIndicate(isAltitudeIndicate: boolean) {
    this.textNote().isAltitudeIndicate = isAltitudeIndicate;
  }

  get isSelected(): boolean {
    return document.activeElement === this.textAreaElementRef().nativeElement;
  }

  private callbackOnMouseUp = (e: MouseEvent) => this.onMouseUp(e);

  readonly gridSize = 50;
  math = Math;

  private _transitionTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly _transition = signal(false);
  get transition(): boolean {
    return this._transition();
  }
  set transition(transition: boolean) {
    if (this._transitionTimeout) clearTimeout(this._transitionTimeout);
    if (transition) {
      this._transition.set(true);
      this._transitionTimeout = setTimeout(() => {
        this._transition.set(false);
      }, 132);
    } else {
      this._transition.set(false);
      this._transitionTimeout = null;
    }
  }
  private _fallTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly _fall = signal(false);
  get fall(): boolean {
    return this._fall();
  }
  set fall(fall: boolean) {
    if (this._fallTimeout) clearTimeout(this._fallTimeout);
    if (fall) {
      this._fall.set(true);
      this._fallTimeout = setTimeout(() => {
        this._fall.set(false);
      }, 132);
    } else {
      this._fall.set(false);
      this._fallTimeout = null;
    }
  }

  private calcFitHeightTimer: ReturnType<typeof setTimeout> | null = null;
  readonly movableOption = signal<MovableOption>({});
  readonly rotableOption = signal<RotableOption>({});

  private input: InputHandler | null = null;
  readonly viewRotateZ = computed(() => this.uiSignalService.tableViewRotation()?.z ?? 10);

  onDragstart(e: DragEvent) {
    e.stopPropagation();
    e.preventDefault();
  }

  onMouseDown(e: MouseEvent) {
    if (this.isSelected) return;
    e.preventDefault();
    this.textNote().toTopmost();

    if (e.button === 2) return;
    this.addMouseEventListeners();
  }

  onMouseUp(e: MouseEvent) {
    if (this.pointerDeviceService.isAllowedToOpenContextMenu) {
      const selection = window.getSelection();
      if (!selection!.isCollapsed) selection!.removeAllRanges();

      //        if( e.target.id != 'scroll'){
      this.textAreaElementRef().nativeElement.focus();
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
  }

  onContextMenu(e: MouseEvent) {
    this.removeMouseEventListeners();
    if (this.isSelected) return;
    e.stopPropagation();
    e.preventDefault();

    if (!this.pointerDeviceService.isAllowedToOpenContextMenu) return;
    const position = this.pointerDeviceService.pointers[0];
    this.contextMenuService.open(
      position,
      buildTextNoteContextMenu(this.textNote(), this.gridSize, this.inventoryService, {
        onSetUpright: (isUpright) => {
          this.transition = true;
          this.textNote().isUpright = isUpright;
        },
        onShowDetail: () => this.showDetail(this.textNote()),
      }),
      this.title()
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
    const textArea: HTMLTextAreaElement = this.textAreaElementRef().nativeElement;

    textArea.style.height = '0';
    if (!this.textNote().limitHeight) {
      if (textArea.scrollHeight > textArea.offsetHeight) {
        textArea.style.height = textArea.scrollHeight + 'px';
        this.oldScrollHeight = textArea.scrollHeight;
        this.oldOffsetHeight = textArea.offsetHeight;
      }
    } else {
      let textAreaHeight = textArea.scrollHeight;
      let textAreaMax = this.height * this.gridSize - 2;

      if (textAreaMax < this.gridSize) textAreaMax = this.gridSize - 2;
      if (this.title().length) {
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
