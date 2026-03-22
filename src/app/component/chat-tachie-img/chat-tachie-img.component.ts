import { NgStyle } from '@angular/common';
import {
  AfterViewChecked,
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  inject,
  Input,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { ChatTab } from '@axe/chat-tab';
import { ChatTabList } from '@axe/chat-tab-list';
import { ImageFile } from '@axe/core/file-storage/image-file';
import { ImageStorage } from '@axe/core/file-storage/image-storage';
import { ObjectStore } from '@axe/core/synchronize-object/object-store';
import { EventSystem } from '@axe/core/system';
import { SafePipe } from 'pipe/safe.pipe';
import { ChatMessageService } from 'service/chat-message.service';
import { PanelService } from 'service/panel.service';
import { PointerDeviceService } from 'service/pointer-device.service';

@Component({
  selector: 'chat-tachie-img',
  templateUrl: './chat-tachie-img.component.html',
  styleUrls: ['./chat-tachie-img.component.css'],
  imports: [NgStyle, SafePipe],
})
export class ChatTachieImageComponent implements OnDestroy, AfterViewInit, AfterViewChecked {
  chatMessageService = inject(ChatMessageService);
  private changeDetectionRef = inject(ChangeDetectorRef);
  private panelService = inject(PanelService);
  private pointerDeviceService = inject(PointerDeviceService);
  private objectStore = inject(ObjectStore);
  private imageStorage = inject(ImageStorage);

  @Input() chatTabidentifier: string = '';
  @Input() isTilteTop = false;
  @Input() dispByMouse = false;

  @ViewChild('tachieArea', { read: ElementRef }) private tachieArea: ElementRef;
  private _tachieAreaWidth = 0;

  get chatTab(): ChatTab {
    return this.objectStore.get<ChatTab>(this.chatTabidentifier);
  }

  get tachieY_Pos(): number {
    if (!this.chatTabList.isTachieInWindow) {
      return -this.chatTabList.tachieHeightValue - 26;
    } else {
      return 0;
    }
  }

  get tachieAreaWidth(): number {
    return this._tachieAreaWidth;
  }

  get chatTabList(): ChatTabList {
    return this.objectStore.get<ChatTabList>('ChatTabList');
  }

  get dispFlag(): boolean {
    if (this.isTilteTop && !this.chatTabList.isTachieInWindow) return true;
    if (!this.isTilteTop && this.chatTabList.isTachieInWindow) return true;
    return false;
  }

  get isTachieDispMode() {
    if (this.chatTabList.isKeepTachieOutWindow) {
      return this.dispFlag;
    } else {
      return this.dispFlag && this.dispByMouse;
    }
  }

  tachieAreaHeight(pos: number): number {
    if (this.chatTab) {
      if (this.chatTab.tachieDispFlag) {
        if (this.chatTab.tachiePosIsDisp(pos)) {
          return this.chatTabList.tachieHeightValue;
        }
      }
    }
    return 0;
  }

  //
  get tachieAreaHeight00(): number {
    return this.tachieAreaHeight(0);
  }
  get tachieAreaHeight01(): number {
    return this.tachieAreaHeight(1);
  }
  get tachieAreaHeight02(): number {
    return this.tachieAreaHeight(2);
  }
  get tachieAreaHeight03(): number {
    return this.tachieAreaHeight(3);
  }
  get tachieAreaHeight04(): number {
    return this.tachieAreaHeight(4);
  }
  get tachieAreaHeight05(): number {
    return this.tachieAreaHeight(5);
  }
  get tachieAreaHeight06(): number {
    return this.tachieAreaHeight(6);
  }
  get tachieAreaHeight07(): number {
    return this.tachieAreaHeight(7);
  }
  get tachieAreaHeight08(): number {
    return this.tachieAreaHeight(8);
  }
  get tachieAreaHeight09(): number {
    return this.tachieAreaHeight(9);
  }
  get tachieAreaHeight10(): number {
    return this.tachieAreaHeight(10);
  }
  get tachieAreaHeight11(): number {
    return this.tachieAreaHeight(11);
  }

  private timerId: ReturnType<typeof setTimeout> | null = null;

  //立ち絵表示幅取得
  ngAfterViewInit() {
    this._tachieAreaWidth = this.tachieArea.nativeElement.offsetWidth;
    this.changeDetectionRef.detectChanges();
  }

  ngAfterViewChecked() {
    this._tachieAreaWidth = this.tachieArea.nativeElement.offsetWidth;
    this.changeDetectionRef.detectChanges();
  }

  //z-index取得
  private _zindexOffset = 10;

  get zIndex_00(): number {
    return this.chatTab.tachieZindex(0) + this._zindexOffset;
  }
  get zIndex_01(): number {
    return this.chatTab.tachieZindex(1) + this._zindexOffset;
  }
  get zIndex_02(): number {
    return this.chatTab.tachieZindex(2) + this._zindexOffset;
  }
  get zIndex_03(): number {
    return this.chatTab.tachieZindex(3) + this._zindexOffset;
  }
  get zIndex_04(): number {
    return this.chatTab.tachieZindex(4) + this._zindexOffset;
  }
  get zIndex_05(): number {
    return this.chatTab.tachieZindex(5) + this._zindexOffset;
  }
  get zIndex_06(): number {
    return this.chatTab.tachieZindex(6) + this._zindexOffset;
  }
  get zIndex_07(): number {
    return this.chatTab.tachieZindex(7) + this._zindexOffset;
  }
  get zIndex_08(): number {
    return this.chatTab.tachieZindex(8) + this._zindexOffset;
  }
  get zIndex_09(): number {
    return this.chatTab.tachieZindex(9) + this._zindexOffset;
  }
  get zIndex_10(): number {
    return this.chatTab.tachieZindex(10) + this._zindexOffset;
  }
  get zIndex_11(): number {
    return this.chatTab.tachieZindex(11) + this._zindexOffset;
  }

  private _opacity = 0.66;

  get opacity_00(): number {
    if (this.chatTab.tachieZindex(0) == 11) {
      return 1;
    } else {
      return this._opacity;
    }
  }
  get opacity_01(): number {
    if (this.chatTab.tachieZindex(1) == 11) {
      return 1;
    } else {
      return this._opacity;
    }
  }
  get opacity_02(): number {
    if (this.chatTab.tachieZindex(2) == 11) {
      return 1;
    } else {
      return this._opacity;
    }
  }
  get opacity_03(): number {
    if (this.chatTab.tachieZindex(3) == 11) {
      return 1;
    } else {
      return this._opacity;
    }
  }
  get opacity_04(): number {
    if (this.chatTab.tachieZindex(4) == 11) {
      return 1;
    } else {
      return this._opacity;
    }
  }
  get opacity_05(): number {
    if (this.chatTab.tachieZindex(5) == 11) {
      return 1;
    } else {
      return this._opacity;
    }
  }
  get opacity_06(): number {
    if (this.chatTab.tachieZindex(6) == 11) {
      return 1;
    } else {
      return this._opacity;
    }
  }
  get opacity_07(): number {
    if (this.chatTab.tachieZindex(7) == 11) {
      return 1;
    } else {
      return this._opacity;
    }
  }
  get opacity_08(): number {
    if (this.chatTab.tachieZindex(8) == 11) {
      return 1;
    } else {
      return this._opacity;
    }
  }
  get opacity_09(): number {
    if (this.chatTab.tachieZindex(9) == 11) {
      return 1;
    } else {
      return this._opacity;
    }
  }
  get opacity_10(): number {
    if (this.chatTab.tachieZindex(10) == 11) {
      return 1;
    } else {
      return this._opacity;
    }
  }
  get opacity_11(): number {
    if (this.chatTab.tachieZindex(11) == 11) {
      return 1;
    } else {
      return this._opacity;
    }
  }

  //この実装は後でどうにかしたい
  get imageFileUrl_00(): string {
    if (!this.chatTab.imageIdentifier) return '';
    const image: ImageFile = this.imageStorage.get(this.chatTab.imageIdentifier[0]);
    if (image) return image.url;
    return '';
  }

  get imageFileUrl_01(): string {
    if (!this.chatTab.imageIdentifier) return '';
    const image: ImageFile = this.imageStorage.get(this.chatTab.imageIdentifier[1]);
    if (image) return image.url;
    return '';
  }

  get imageFileUrl_02(): string {
    if (!this.chatTab.imageIdentifier) return '';
    const image: ImageFile = this.imageStorage.get(this.chatTab.imageIdentifier[2]);
    if (image) return image.url;
    return '';
  }

  get imageFileUrl_03(): string {
    if (!this.chatTab.imageIdentifier) return '';
    const image: ImageFile = this.imageStorage.get(this.chatTab.imageIdentifier[3]);
    if (image) return image.url;
    return '';
  }

  get imageFileUrl_04(): string {
    if (!this.chatTab.imageIdentifier) return '';
    const image: ImageFile = this.imageStorage.get(this.chatTab.imageIdentifier[4]);
    if (image) return image.url;
    return '';
  }

  get imageFileUrl_05(): string {
    if (!this.chatTab.imageIdentifier) return '';
    const image: ImageFile = this.imageStorage.get(this.chatTab.imageIdentifier[5]);
    if (image) return image.url;
    return '';
  }

  get imageFileUrl_06(): string {
    if (!this.chatTab.imageIdentifier) return '';
    const image: ImageFile = this.imageStorage.get(this.chatTab.imageIdentifier[6]);
    if (image) return image.url;
    return '';
  }

  get imageFileUrl_07(): string {
    if (!this.chatTab.imageIdentifier) return '';
    const image: ImageFile = this.imageStorage.get(this.chatTab.imageIdentifier[7]);
    if (image) return image.url;
    return '';
  }

  get imageFileUrl_08(): string {
    if (!this.chatTab.imageIdentifier) return '';
    const image: ImageFile = this.imageStorage.get(this.chatTab.imageIdentifier[8]);
    if (image) return image.url;
    return '';
  }

  get imageFileUrl_09(): string {
    if (!this.chatTab.imageIdentifier) return '';
    const image: ImageFile = this.imageStorage.get(this.chatTab.imageIdentifier[9]);
    if (image) return image.url;
    return '';
  }

  get imageFileUrl_10(): string {
    if (!this.chatTab.imageIdentifier) return '';
    const image: ImageFile = this.imageStorage.get(this.chatTab.imageIdentifier[10]);
    if (image) return image.url;
    return '';
  }

  get imageFileUrl_11(): string {
    if (!this.chatTab.imageIdentifier) return '';
    const image: ImageFile = this.imageStorage.get(this.chatTab.imageIdentifier[11]);
    if (image) return image.url;
    return '';
  }

  tachieClick(pos: number) {
    this.chatTab.tachiePosHide(pos);
  }

  ngOnDestroy() {
    EventSystem.unregister(this);
  }

  trackByChatTab(index: number, chatTab: ChatTab) {
    return chatTab.identifier;
  }
}
