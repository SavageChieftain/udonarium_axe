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
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GameObjectInventoryService } from '@axe/application/inventory/game-object-inventory.service';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { ContextMenuService } from '@axe/application/ui/context-menu.service';
import { PanelOption, PanelService } from '@axe/application/ui/panel.service';
import { SelectionSignalService } from '@axe/application/ui/selection-signal.service';
import { UiSignalService } from '@axe/application/ui/ui-signal.service';
import { PointerDeviceService } from '@axe/core/input/pointer-device.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { DataElement } from '@axe/domain/data/data-element';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import { TextNote } from '@axe/domain/tabletop/text-note';
import { buildTextNoteContextMenu } from '@axe/features/tabletop/text-note/text-note-context-menu';
import { InputHandler } from '@axe/ui/directives/input-handler';
import { MovableOption } from '@axe/ui/directives/movable.directive';
import { MovableDirective } from '@axe/ui/directives/movable.directive';
import { RotableOption } from '@axe/ui/directives/rotable.directive';
import { RotableDirective } from '@axe/ui/directives/rotable.directive';
import { SafePipe } from '@axe/ui/pipes/safe.pipe';
import { translateZCss, Z_OFFSET_TABLETOP_OBJECT_PX } from '@axe/ui/tabletop/z-offset';

@Component({
  selector: 'text-note',
  templateUrl: './text-note.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MovableDirective, RotableDirective, NgStyle, FormsModule, SafePipe],
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
        transformCssOffset: translateZCss(Z_OFFSET_TABLETOP_OBJECT_PX),
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

    if (!this.textNote().limitHeight) {
      // flex:1 で親の高さを埋め尽くすため、インライン height をリセットして CSS に委ねる
      textArea.style.height = '';
    } else {
      textArea.style.height = '0';
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
