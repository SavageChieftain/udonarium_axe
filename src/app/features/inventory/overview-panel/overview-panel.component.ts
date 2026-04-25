import { NgClass, NgStyle, NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { PointerDeviceService } from '@axe/core/input/pointer-device.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { Card } from '@axe/domain/card/card'; //
import { CardStack } from '@axe/domain/card/card-stack'; //
import { GameCharacter } from '@axe/domain/character/game-character'; //
import { DataElement } from '@axe/domain/data/data-element';
import { MarkDown } from '@axe/domain/data/mark-down';
import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';
import { TextNote } from '@axe/domain/tabletop/text-note'; //
import { DraggableDirective } from '@axe/shared/directives/draggable.directive';
import { GameObjectInventoryService } from '@axe/shared/inventory/game-object-inventory.service';
import { LinkifyPipe } from '@axe/shared/pipes/linkify.pipe';
import { SafePipe } from '@axe/shared/pipes/safe.pipe';
import { ObjectChangeService } from '@axe/shared/sync/object-change.service';

@Component({
  selector: 'overview-panel',
  templateUrl: './overview-panel.component.html',
  styles: [
    `
      .component {
        position: absolute;
        max-height: 100%;
        max-width: 100%;
        box-sizing: border-box;
        overflow: visible;
        color: #444;
        z-index: 9000;
        overscroll-behavior: contain;
      }

      .component-content {
        font-size: 12px;
      }

      .is-large-size {
        max-width: 350px;
      }

      .is-middle-size {
        max-width: 270px;
      }

      .is-small-size {
        max-width: 250px;
      }

      .is-middle-size .grid-container-root {
        width: 270px;
      }

      .is-small-size .grid-container-root {
        width: 250px;
      }

      .component-background {
        background: linear-gradient(-30deg, rgba(240, 218, 189, 0.9), rgba(255, 244, 232, 0.9));
        border-bottom: solid 1px #999;
      }

      .component-title {
        color: #ccc;
        font-size: 1em;
        text-align: right;
        vertical-align: middle;
        height: 32px;
        line-height: 32px;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        padding: 0 1em;
      }

      .title-background {
        background-color: #555;
        border-top: solid 1px #999;
        border-left: solid 1px #999;
        border-right: solid 1px #999;
      }

      .component-owner {
        font-size: 0.8em;
        padding: 10px;
        color: #ccc;
        vertical-align: middle;
        overflow: hidden;
        text-align: right;
        padding: 2px 1em;
        max-width: 100%;
        box-sizing: border-box;
      }

      .owner-tag {
        width: min-content;
        max-width: 100%;
        margin-left: auto;
        margin-right: 0;
        overflow: hidden;
        color: #ccc;
        background-color: rgba(30, 30, 30, 0.8);
        box-sizing: border-box;
        padding: 3px 9px;
        border-radius: 6px;
        white-space: nowrap;
        text-overflow: ellipsis;
      }

      .card-image {
        width: 250px;
        max-height: 330px;
        padding: 8px;
        vertical-align: bottom;
        object-fit: contain;
        box-sizing: border-box;
        background-color: rgba(204, 204, 204, 0.5);
      }

      .zoom-button {
        position: absolute;
        left: 8px;
        bottom: -21px;
        width: 42px;
        height: 42px;
        border-radius: 100px;
        padding: 4px;
      }

      .zoom-button > .material-icons {
        font-size: 24px;
        vertical-align: bottom;
      }

      .position-right-bottom {
        position: absolute;
        right: 0;
        bottom: 0;
      }

      .image-view-background {
        color: #ccc;
        background-color: rgba(30, 30, 30, 0.3);
        z-index: 9900;
      }

      .image-view-background .close-button {
        position: absolute;
        right: 16px;
        top: 16px;
      }

      .image-view-background .close-button > .material-icons {
        font-size: 36px;
      }

      .contain-image {
        width: 100%;
        height: 100%;
        box-sizing: border-box;
        padding: 16px;
        vertical-align: bottom;
        object-fit: contain;
      }

      .text-note-container {
        width: 100%;
        max-height: 400px;
        padding: 0.6em 1.2em;
        box-sizing: border-box;
        overflow: hidden auto;
        line-height: 1.8;
        border-left: solid 1px #999;
        border-right: solid 1px #999;
      }

      .character-image-box {
        width: 100px;
        max-height: 120px;
        overflow: hidden;
        vertical-align: bottom;
        margin-left: 0.5em;
        margin-bottom: -6px;
        border-radius: 1em;
        z-index: 1;
      }

      .character-image {
        padding: 0;
        width: 100%;
        vertical-align: bottom;
      }

      .is-black-mask {
        filter: brightness(0);
      }

      .is-harf-black-mask {
        filter: brightness(0.5);
      }

      .character-grid-container {
        display: grid;
        grid-template-columns: min-content auto;
        grid-template-rows: 1fr auto auto auto;
      }

      .title-bg-area {
        grid-area: 3 / 1 / 4 / 3;
      }

      .title-area {
        grid-area: 3 / 2 / 4 / 3;
      }

      .owner-name-area {
        grid-area: 2 / 2 / 3 / 3;
      }

      .image-area {
        grid-area: 1 / 1 / 4 / 2;
      }

      .void-area {
        grid-area: 1 / 2 / 3 / 3;
      }

      .dataElm-area {
        grid-area: 4 / 1 / 5 / 3;
      }

      .grid-container-root {
        padding: 0.5em 1.2em;
        max-height: 250px;
        overflow: hidden auto;
        box-sizing: border-box;
        border-left: solid 1px #999;
        border-right: solid 1px #999;
      }

      .grid-container {
        display: grid;
        grid-template-columns: 1fr fit-content(80%);
      }

      .grid-container > div {
        box-sizing: border-box;
        line-height: 24px;
      }

      .indetnt {
        padding-left: 0.5em;
      }

      .section {
        max-width: 100%;
        grid-column: 1 / span 2;
      }

      .section-text {
        font-size: 1.1em;
        font-weight: bold;
        white-space: nowrap;
        text-overflow: ellipsis;
        overflow: hidden;
      }

      .note {
        margin-left: 0.5em;
        font-size: 1em;
        line-height: 1.8;
      }

      .textarea {
        width: 100%;
        height: 100%;
        font: inherit;
        font-size: inherit;
        line-height: inherit;
        background: none;
        border: none;
        border-radius: 2px;
        outline: none;
        color: #444;
        padding: 0;
        box-sizing: border-box;
        resize: none;
        overflow: hidden;
        white-space: pre-wrap;
        word-wrap: break-word;
        overflow-wrap: anywhere;
        word-break: break-word;
      }

      .textarea:hover {
        background: #eee;
      }

      .textarea:focus {
        background: #fff;
      }

      .textarea-url {
        width: 100%;
        height: 100%;
        font: inherit;
        font-size: inherit;
        line-height: inherit;
        background: none;
        border: none;
        border-radius: 2px;
        outline: none;
        color: #444;
        padding: 0;
        box-sizing: border-box;
        resize: none;
        overflow: hidden;
        white-space: pre-wrap;
        word-wrap: break-word;
        overflow-wrap: anywhere;
        word-break: break-word;
      }

      .tag {
        padding-right: 1em;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }

      .value {
        font-size: 1.2em;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        text-align: right;
      }

      .hidden-spacer {
        visibility: hidden;
        height: 0px;
        min-width: 3em;
        overflow: hidden;
        white-space: pre-wrap;
      }

      .textarea-spacer {
        visibility: hidden;
        min-width: 3em;
        height: auto;
        min-height: 24px;
        overflow: hidden;
        white-space: pre-wrap;
        word-wrap: break-word;
        overflow-wrap: anywhere;
        word-break: break-word;
      }

      .input {
        width: 100%;
        min-width: 3em;
        text-align: right;
        font: inherit;
        font-size: inherit;
        line-height: inherit;
        background: none;
        border: none;
        border-radius: 2px;
        outline: none;
        color: #444;
        padding: 0;
        box-sizing: border-box;
      }

      .input:hover {
        background: #eee;
      }

      .input:focus {
        background: #fff;
      }

      input[type='number'] {
        -moz-appearance: textfield;
      }

      input[type='number']:hover,
      input[type='number']:focus {
        -moz-appearance: number-input;
      }

      .border {
        border-bottom: 1px dotted #888;
      }

      .separator {
        padding: 2px 0 2px 0;
        border-bottom: 1px solid #888;
      }

      .with-button-marign {
        padding-left: 60px;
      }

      .is-fill {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
      }

      .is-bold {
        font-weight: bold;
      }

      .is-pointer-events-none {
        pointer-events: none;
      }

      .is-pointer-events-auto {
        pointer-events: auto;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DraggableDirective, NgTemplateOutlet, NgClass, NgStyle, FormsModule, LinkifyPipe, SafePipe],
  host: {
    class: 'block',
    '(click)': 'onClick($event)',
  },
})
export class OverviewPanelComponent {
  private readonly inventoryService = inject(GameObjectInventoryService);
  private readonly pointerDeviceService = inject(PointerDeviceService);
  private readonly domSanitizer = inject(DomSanitizer);
  private readonly objectStore = inject(ObjectStore);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly destroyRef = inject(DestroyRef);

  readonly draggablePanel = viewChild.required<ElementRef<HTMLElement>>('draggablePanel');
  tabletopObject: TabletopObject | null = null;

  left: number = 0;
  top: number = 0;

  readonly imageUrl = computed(() => {
    this.objectChange.fileVersion();
    if (this.tabletopObject) this.objectChange.versionOf(this.tabletopObject.identifier)();
    return this.tabletopObject && this.tabletopObject.imageFile ? this.tabletopObject.imageFile.url : '';
  });
  readonly hasImage = computed(() => this.imageUrl().length > 0);

  /** tabletopObject とその配下 DataElement の version を追跡し、OnPush を突破する */
  readonly objectVersion = computed(() => {
    if (!this.tabletopObject) return 0;
    this.objectChange.versionOf(this.tabletopObject.identifier)();
    const trackChildren = (elms: readonly DataElement[]) => {
      for (const elm of elms) {
        this.objectChange.versionOf(elm.identifier)();
        if (elm.children.length) trackChildren(elm.children as DataElement[]);
      }
    };
    if (this.tabletopObject.commonDataElement)
      trackChildren(this.tabletopObject.commonDataElement.children as DataElement[]);
    if (this.tabletopObject.detailDataElement)
      trackChildren(this.tabletopObject.detailDataElement.children as DataElement[]);
    return 1;
  });

  get inventoryDataElms(): DataElement[] {
    return this.tabletopObject ? this.getInventoryTags(this.tabletopObject).filter((e) => e != null) : [];
  }
  get dataElms(): DataElement[] {
    return this.tabletopObject && this.tabletopObject.detailDataElement
      ? this.tabletopObject.detailDataElement.children.filter((e) => e != null)
      : [];
  }
  get hasDataElms(): boolean {
    return this.dataElms.length > 0;
  }

  get rangeElms(): DataElement[] {
    return this.tabletopObject && this.tabletopObject.commonDataElement
      ? this.tabletopObject.commonDataElement.children.filter((e) => e != null)
      : [];
  }
  get hasRangeElms(): boolean {
    return this.rangeElms.length > 0;
  }

  get newLineString(): string {
    return this.inventoryService.newLineString;
  }
  get isPointerDragging(): boolean {
    return this.pointerDeviceService.isDragging;
  }

  get pointerEventsStyle(): Record<string, boolean> {
    return { 'is-pointer-events-auto': !this.isPointerDragging, 'pointer-events-none': this.isPointerDragging };
  }

  isOpenImageView: boolean = false;

  constructor() {
    afterNextRender(() => {
      this.initPanelPosition();
      this.adjustPositionRoot();
    });
  }

  private initPanelPosition() {
    const panel: HTMLElement = this.draggablePanel().nativeElement;
    const outerWidth = panel.offsetWidth;
    const outerHeight = panel.offsetHeight;

    let offsetLeft = this.left + 100;
    let offsetTop = this.top - outerHeight - 50;

    let isCollideLeft = false;

    if (window.innerWidth < offsetLeft + outerWidth) {
      offsetLeft = window.innerWidth - outerWidth;
      isCollideLeft = true;
    }

    if (offsetTop <= 0) {
      offsetTop = 0;
    }

    if (isCollideLeft) {
      offsetLeft = this.left - outerWidth - 100;
    }

    if (offsetLeft < 0) offsetLeft = 0;
    if (offsetTop < 0) offsetTop = 0;

    panel.style.left = offsetLeft + 'px';
    panel.style.top = offsetTop + 'px';
  }

  private adjustPositionRoot() {
    const panel: HTMLElement = this.draggablePanel().nativeElement;

    const alias = this.tabletopObject?.aliasName;
    let width: number = 250;

    if (alias == 'card') {
      width = this.overViewCardWidth;
    }

    if (alias == 'card-stack') {
      width = this.overViewCardWidth;
    }

    if (alias == 'text-note') {
      width = this.overViewNoteWidth;
    }

    if (alias == 'character') {
      width = this.overViewCharacterWidth;
    }

    if (alias == 'dice-symbol') {
      // 現状変更なし
    }

    if (alias == 'range') {
      // 現状変更なし
    }

    const panelBox = panel.getBoundingClientRect();

    let diffLeft: number = 0;
    let diffTop: number = 0;
    const panelLeft: number = Number(panelBox.left);
    const panelRight: number = Number(panelBox.left) + Number(width);

    if (window.innerWidth < panelRight + diffLeft) {
      diffLeft += window.innerWidth - (panelRight + diffLeft);
    }
    if (panelLeft + diffLeft < 0) {
      diffLeft += 0 - (panelLeft + diffLeft);
    }

    if (window.innerHeight < panelBox.bottom + diffTop) {
      diffTop += window.innerHeight - (panelBox.bottom + diffTop);
    }
    if (panelBox.top + diffTop < 0) {
      diffTop += 0 - (panelBox.top + diffTop);
    }

    panel.style.left = panel.offsetLeft + diffLeft + 'px';
    panel.style.top = panel.offsetTop + diffTop + 'px';
  }

  chanageImageView(isOpen: boolean) {
    this.isOpenImageView = isOpen;
  }

  private getInventoryTags(gameObject: TabletopObject): (DataElement | null)[] {
    return this.inventoryService.tableInventory.dataElementMap.get(gameObject.identifier) ?? [];
  }

  get overViewNoteWidth(): number {
    const note = this.tabletopObject as TextNote;
    if (!note) return 250;
    let width = note.overViewWidth;
    if (width < 250) width = 250;
    if (width > 800) width = 800;

    return width;
  }

  get overViewNoteMaxHeight(): number {
    const note = this.tabletopObject as TextNote;
    if (!note) return 250;
    let maxHeight = note.overViewMaxHeight;
    if (maxHeight < 250) maxHeight = 250;
    if (maxHeight > 1000) maxHeight = 1000;

    return maxHeight;
  }

  get overViewCharacterWidth(): number {
    const character = this.tabletopObject as GameCharacter;
    if (!character) return 270;
    let width = character.overViewWidth;
    if (width < 270) width = 270;
    if (width > 800) width = 800;

    return width;
  }

  get overViewCharacterMaxHeight(): number {
    const character = this.tabletopObject as GameCharacter;
    if (!character) return 250;
    let maxHeight = character.overViewMaxHeight;
    if (maxHeight < 250) maxHeight = 250;
    if (maxHeight > 1000) maxHeight = 1000;

    return maxHeight;
  }

  get overViewCardWidth(): number {
    const card = this.tabletopObject as Card;
    const cardStack = this.tabletopObject as CardStack;
    let object: Card | CardStack | null = null;

    if (!card && !cardStack) return 250;
    if (card) {
      object = card;
    } else if (cardStack) {
      object = cardStack;
    }

    let width = object!.overViewWidth;
    if (width < 250) width = 250;
    if (width > 1000) width = 1000;
    return width;
  }

  get overViewCardWidthNoMargin(): number {
    if (this.hasImage()) return this.overViewCardWidth - 60 - 12 - 2;

    return this.overViewCardWidth - 12 - 2;
  }

  get overViewCardMaxHeight(): number {
    const card = this.tabletopObject as Card;
    const cardStack = this.tabletopObject as CardStack;
    let object: Card | CardStack | null = null;

    if (!card && !cardStack) return 250;
    if (card) {
      object = card;
    } else if (cardStack) {
      object = cardStack;
    }
    let maxHeight = object!.overViewMaxHeight;
    if (maxHeight < 250) maxHeight = 250;
    if (maxHeight > 1000) maxHeight = 1000;
    return maxHeight;
  }

  escapeHtml(text: string) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  get markdown(): MarkDown {
    // 'markdwon' is the legacy identifier; keep as fallback for old peers in P2P sessions
    return (this.objectStore.get<MarkDown>('markdown') ?? this.objectStore.get<MarkDown>('markdwon'))!;
  }

  escapeHtmlMarkDown(text: string, baseId: string): SafeHtml {
    const textCheckBox = this.markdown.markDownCheckBox(text, baseId);
    const textTable = this.markdown.markDownTable(textCheckBox);

    return this.domSanitizer.bypassSecurityTrustHtml(textTable.replace(/\n/g, '<br>'));
  }

  onClick(event: MouseEvent) {
    if (this.markdown) {
      this.markdown.changeMarkDownCheckBox((event.target as HTMLElement).id, event.timeStamp);
    }
  }

  protected editCheckedIds = new Set<string>();

  isEditUrl(dataElmIdentifier: string) {
    return this.editCheckedIds.has(dataElmIdentifier);
  }

  isUrlText(text: string) {
    if (text.match(/^https:\/\//)) return true;
    if (text.match(/^http:\/\//)) return true;
    return false;
  }

  changeChk(dataElmIdentifier: string) {
    if (this.editCheckedIds.has(dataElmIdentifier)) {
      this.editCheckedIds.delete(dataElmIdentifier);
    } else {
      this.editCheckedIds.add(dataElmIdentifier);
    }
  }

  textFocus(dataElmIdentifier: string) {
    this.editCheckedIds.add(dataElmIdentifier);
  }
}
