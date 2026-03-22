import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  ViewChild,
  HostListener,
  inject,
} from '@angular/core';
import { ObjectNode } from '@axe/core/synchronize-object/object-node';
import { ObjectStore } from '@axe/core/synchronize-object/object-store';
import { EventSystem } from '@axe/core/system';
import { DataElement } from '@axe/data-element';
import { MarkDown } from '@axe/mark-down';

import { TabletopObject } from '@axe/tabletop-object';
import { GameObjectInventoryService } from 'service/game-object-inventory.service';
import { PointerDeviceService } from 'service/pointer-device.service';

import { GameCharacter } from '@axe/game-character'; //
import { TextNote } from '@axe/text-note'; //
import { Card } from '@axe/card'; //
import { CardStack } from '@axe/card-stack'; //

import { SafeHtml, DomSanitizer } from '@angular/platform-browser';
import { DraggableDirective } from 'directive/draggable.directive';
import { NgTemplateOutlet, NgClass, NgStyle } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LinkyModule } from 'ngx-linky';
import { SafePipe } from 'pipe/safe.pipe';

@Component({
  selector: 'overview-panel',
  templateUrl: './overview-panel.component.html',
  styleUrls: ['./overview-panel.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DraggableDirective, NgTemplateOutlet, NgClass, NgStyle, FormsModule, LinkyModule, SafePipe],
})
export class OverviewPanelComponent implements AfterViewInit, OnDestroy {
  private inventoryService = inject(GameObjectInventoryService);
  private changeDetector = inject(ChangeDetectorRef);
  private pointerDeviceService = inject(PointerDeviceService);
  private domSanitizer = inject(DomSanitizer);

  @ViewChild('draggablePanel', { static: true }) draggablePanel: ElementRef<HTMLElement>;
  @Input() tabletopObject: TabletopObject = null!;

  @Input() left: number = 0;
  @Input() top: number = 0;

  get imageUrl(): string {
    return this.tabletopObject && this.tabletopObject.imageFile ? this.tabletopObject.imageFile.url : '';
  }
  get hasImage(): boolean {
    return 0 < this.imageUrl.length;
  }

  get inventoryDataElms(): DataElement[] {
    return this.tabletopObject ? this.getInventoryTags(this.tabletopObject) : [];
  }
  get dataElms(): DataElement[] {
    return this.tabletopObject && this.tabletopObject.detailDataElement
      ? (this.tabletopObject.detailDataElement.children as DataElement[])
      : [];
  }
  get hasDataElms(): boolean {
    return 0 < this.dataElms.length;
  }

  get rangeElms(): DataElement[] {
    return this.tabletopObject && this.tabletopObject.commonDataElement
      ? (this.tabletopObject.commonDataElement.children as DataElement[])
      : [];
  }
  get hasRangeElms(): boolean {
    return 0 < this.rangeElms.length;
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

  ngAfterViewInit() {
    this.initPanelPosition();
    setTimeout(() => {
      this.adjustPositionRoot();
    }, 16);
    EventSystem.register(this)
      .on('UPDATE_GAME_OBJECT', (event) => {
        const object = ObjectStore.instance.get(event.data.identifier);
        if (!this.tabletopObject || !object || !(object instanceof ObjectNode)) return;
        if (this.tabletopObject === object || this.tabletopObject.contains(object)) {
          this.changeDetector.markForCheck();
        }
      })
      .on('SYNCHRONIZE_FILE_LIST', (_event) => {
        this.changeDetector.markForCheck();
      })
      .on('UPDATE_FILE_RESOURE', (_event) => {
        this.changeDetector.markForCheck();
      });
  }

  ngOnDestroy() {
    EventSystem.unregister(this);
  }

  private initPanelPosition() {
    const panel: HTMLElement = this.draggablePanel.nativeElement;
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
    const panel: HTMLElement = this.draggablePanel.nativeElement;

    const alias = this.tabletopObject.aliasName;
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

  private getInventoryTags(gameObject: TabletopObject): DataElement[] {
    return this.inventoryService.tableInventory.dataElementMap.get(gameObject.identifier) ?? [];
  }

  get overViewNoteWidth(): number {
    const note = <TextNote>this.tabletopObject;
    if (!note) return 250;
    let width = note.overViewWidth;
    if (width < 250) width = 250;
    if (width > 800) width = 800;

    return width;
  }

  get overViewNoteMaxHeight(): number {
    const note = <TextNote>this.tabletopObject;
    if (!note) return 250;
    let maxHeight = note.overViewMaxHeight;
    if (maxHeight < 250) maxHeight = 250;
    if (maxHeight > 1000) maxHeight = 1000;

    return maxHeight;
  }

  get overViewCharacterWidth(): number {
    const character = <GameCharacter>this.tabletopObject;
    if (!character) return 270;
    let width = character.overViewWidth;
    if (width < 270) width = 270;
    if (width > 800) width = 800;

    return width;
  }

  get overViewCharacterMaxHeight(): number {
    const character = <GameCharacter>this.tabletopObject;
    if (!character) return 250;
    let maxHeight = character.overViewMaxHeight;
    if (maxHeight < 250) maxHeight = 250;
    if (maxHeight > 1000) maxHeight = 1000;

    return maxHeight;
  }

  get overViewCardWidth(): number {
    const card = <Card>this.tabletopObject;
    const cardStack = <CardStack>this.tabletopObject;
    let object: Card | CardStack | null = null;

    console.log('overViewCardWidth');

    if (!card && !cardStack) return 250;
    if (card) {
      object = card;
      console.log('card');
    } else if (cardStack) {
      console.log('cardStack');
      object = cardStack;
    }

    let width = object!.overViewWidth;
    if (width < 250) width = 250;
    if (width > 1000) width = 1000;
    return width;
  }

  get overViewCardWidthNoMargin(): number {
    if (this.hasImage) return this.overViewCardWidth - 60 - 12 - 2;

    return this.overViewCardWidth - 12 - 2;
  }

  get overViewCardMaxHeight(): number {
    const card = <Card>this.tabletopObject;
    const cardStack = <CardStack>this.tabletopObject;
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

  clickMarkDownBox(id: string) {
    console.log('マークダウンクリック:' + id);
  }

  get markdown(): MarkDown {
    return ObjectStore.instance.get<MarkDown>('markdwon');
  }

  escapeHtmlMarkDown(text: string, baseId: string): SafeHtml {
    const textCheckBox = this.markdown.markDownCheckBox(text, baseId);
    const textTable = this.markdown.markDownTable(textCheckBox);

    return this.domSanitizer.bypassSecurityTrustHtml(textTable.replace(/\n/g, '<br>'));
  }

  @HostListener('click', ['$event'])
  click(event: MouseEvent) {
    if (this.markdown) {
      console.log('event.timeStamp:' + event.timeStamp);
      this.markdown.changeMarkDownCheckBox((event.target as HTMLElement).id, event.timeStamp);
    }
  }

  isEditUrl(dataElmIdentifier: string) {
    const box = <HTMLInputElement>document.getElementById(dataElmIdentifier);
    if (!box) return false;
    //   console.log( "Edit:" + dataElmIdentifier  + ":" + box.checked   );
    return box.checked;
  }

  isUrlText(text: string) {
    if (text.match(/^https:\/\//)) return true;
    if (text.match(/^http:\/\//)) return true;
    return false;
  }

  changeChk() {
    //実処理なし
  }

  textFocus(dataElmIdentifier: string) {
    //console.log( "text forcus:" + dataElmIdentifier );
    const box = <HTMLInputElement>document.getElementById(dataElmIdentifier);
    box.checked = true;
  }
}
