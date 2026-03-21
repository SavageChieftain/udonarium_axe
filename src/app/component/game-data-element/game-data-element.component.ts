import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnDestroy,
  OnInit,
  HostListener,
  inject,
} from '@angular/core';
import { EventSystem } from '@axe/core/system';
import { DataElement } from '@axe/data-element';
import { MarkDown } from '@axe/mark-down';

import { ImageFile } from '@axe/core/file-storage/image-file';
import { ImageStorage } from '@axe/core/file-storage/image-storage';
import { ObjectStore } from '@axe/core/synchronize-object/object-store';
import { FileSelecterComponent } from 'component/file-selecter/file-selecter.component';
import { ModalService } from 'service/modal.service';
import { PanelService } from 'service/panel.service';

import { SafeHtml, DomSanitizer } from '@angular/platform-browser';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LinkyModule } from 'ngx-linky';
import { SafePipe } from 'pipe/safe.pipe';

@Component({
  selector: 'game-data-element, [game-data-element]',
  templateUrl: './game-data-element.component.html',
  styleUrls: ['./game-data-element.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet, FormsModule, LinkyModule, SafePipe],
})
export class GameDataElementComponent implements OnInit, OnDestroy, AfterViewInit {
  private panelService = inject(PanelService);
  private modalService = inject(ModalService);
  private changeDetector = inject(ChangeDetectorRef);
  private domSanitizer = inject(DomSanitizer);

  @Input() gameDataElement: DataElement = null!;
  @Input() isEdit: boolean = false;
  @Input() isTagLocked: boolean = false;
  @Input() isValueLocked: boolean = false;

  @Input() isImage: boolean = false;
  @Input() indexNum: number = 0;

  private _name: string = '';
  get name(): string {
    return this._name;
  }
  set name(name: string) {
    this._name = name;
    this.setUpdateTimer();
  }

  private _value: number | string = 0;
  get value(): number | string {
    return this._value;
  }
  set value(value: number | string) {
    this._value = value;
    this.setUpdateTimer();
  }

  private _currentValue: number | string = 0;
  get currentValue(): number | string {
    return this._currentValue;
  }
  set currentValue(currentValue: number | string) {
    this._currentValue = currentValue;
    this.setUpdateTimer();
  }

  private updateTimer: NodeJS.Timeout = null!;
  ngOnInit() {
    if (this.gameDataElement) this.setValues(this.gameDataElement);

    EventSystem.register(this)
      .on('UPDATE_GAME_OBJECT', (event) => {
        if (this.gameDataElement && event.data.identifier === this.gameDataElement.identifier) {
          this.setValues(this.gameDataElement);
          this.changeDetector.markForCheck();
        }
      })
      .on('DELETE_GAME_OBJECT', (event) => {
        if (this.gameDataElement && this.gameDataElement.identifier === event.data.identifier) {
          this.changeDetector.markForCheck();
        }
      });
  }

  ngOnDestroy() {
    EventSystem.unregister(this);
  }

  ngAfterViewInit() {}

  get imageFileUrl(): string {
    const image: ImageFile = ImageStorage.instance.get(<string>this.gameDataElement.value);
    if (image) return image.url;
    return '';
  }

  openModal(_name: string = '', isAllowedEmpty: boolean = false) {
    this.modalService.open<string>(FileSelecterComponent, { isAllowedEmpty: isAllowedEmpty }).then((value) => {
      //      if (!this.tabletopObject || !this.tabletopObject.imageDataElement || !value) return;
      if (!value) return;
      const element = this.gameDataElement;
      if (!element) return;
      element.value = value;
    });
  }

  updateKomaIconMaxValue(root: DataElement) {
    const image = root.getFirstElementByName('image');
    const icon = root.getElementsByName('ICON');
    if (icon) {
      icon[0].value = image.children.length - 1;
      if (+icon[0].currentValue > +icon[0].value) icon[0].currentValue = icon[0].value;
    }
  }

  addImageElement() {
    this.gameDataElement.appendChild(DataElement.create('imageIdentifier', '', { type: 'image' }));
    const root: DataElement = <DataElement>this.gameDataElement.parent;

    this.updateKomaIconMaxValue(root);
  }

  addElement() {
    this.gameDataElement.appendChild(DataElement.create('タグ', '', {}));
  }

  deleteElement() {
    this.gameDataElement.destroy();
  }

  deleteImageElement() {
    const root: DataElement = <DataElement>this.gameDataElement.parent.parent;
    if (this.gameDataElement.parent.children[0] != this.gameDataElement) {
      this.gameDataElement.destroy();
      this.updateKomaIconMaxValue(root);
    }
  }

  upElement() {
    const parentElement = this.gameDataElement.parent;
    const index: number = parentElement.children.indexOf(this.gameDataElement);
    if (0 < index) {
      const prevElement = parentElement.children[index - 1];
      parentElement.insertBefore(this.gameDataElement, prevElement);
    }
  }

  downElement() {
    const parentElement = this.gameDataElement.parent;
    const index: number = parentElement.children.indexOf(this.gameDataElement);
    if (index < parentElement.children.length - 1) {
      const nextElement = index < parentElement.children.length - 2 ? parentElement.children[index + 2] : null!;
      parentElement.insertBefore(this.gameDataElement, nextElement);
    }
  }

  setElementType(type: string) {
    this.gameDataElement.setAttribute('type', type);
  }

  private setValues(object: DataElement) {
    this._name = object.name;
    this._currentValue = object.currentValue;
    this._value = object.value;
  }

  private setUpdateTimer() {
    clearTimeout(this.updateTimer);
    this.updateTimer = setTimeout(() => {
      if (this.gameDataElement.name !== this.name) this.gameDataElement.name = this.name;
      if (this.gameDataElement.currentValue !== this.currentValue)
        this.gameDataElement.currentValue = this.currentValue;
      if (this.gameDataElement.value !== this.value) this.gameDataElement.value = this.value;
      this.updateTimer = null!;
    }, 66);
  }

  escapeHtml(text: string | number): string {
    return String(text)
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

  escapeHtmlMarkDown(text: string | number, baseId: string): SafeHtml {
    text = String(text);
    const textCheckBox = this.markdown.markDownCheckBox(text, baseId);
    const textTable = this.markdown.markDownTable(textCheckBox);

    return this.domSanitizer.bypassSecurityTrustHtml('<div>' + textTable + '</div>');
  }

  @HostListener('click', ['$event'])
  click(event: MouseEvent) {
    if (this.markdown) {
      console.log('event.timeStamp:' + event.timeStamp);
      this.markdown.changeMarkDownCheckBox((event.target as HTMLElement)?.id, event.timeStamp);
    }
  }

  isEditMarkDown(dataElmIdentifier: string) {
    const box = <HTMLInputElement>document.getElementById(dataElmIdentifier);
    if (!box) return false;
    return box.checked;
  }

  isEditUrl(dataElmIdentifier: string) {
    const box = <HTMLInputElement>document.getElementById(dataElmIdentifier);
    if (!box) return false;
    return box.checked;
  }

  isUrlText(text: string | number): boolean {
    if (typeof text !== 'string') return false;
    if (text.match(/^https:\/\//)) return true;
    if (text.match(/^http:\/\//)) return true;
    return false;
  }

  changeChk() {
    //実処理なし
  }

  textFocus(dataElmIdentifier: string) {
    const box = <HTMLInputElement>document.getElementById(dataElmIdentifier);
    box.checked = true;
  }
}
