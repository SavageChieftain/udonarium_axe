import { NgStyle } from '@angular/common';
import {
  AfterViewChecked,
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { PointerDeviceService } from '@axe/core/input/pointer-device.service';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { ObjectStore } from '@axe/core/sync/object-store';
import { ChatTab } from '@axe/domain/chat/chat-tab';
import { ChatTabList } from '@axe/domain/chat/chat-tab-list';
import { ChatMessageService } from '@axe/shared/chat/chat-message.service';
import { SafePipe } from '@axe/shared/pipes/safe.pipe';
import { ObjectChangeService } from '@axe/shared/sync/object-change.service';
import { PanelService } from '@axe/shared/ui/panel.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'chat-tachie-img',
  templateUrl: './chat-tachie-img.component.html',
  styleUrls: ['./chat-tachie-img.component.css'],
  imports: [NgStyle, SafePipe],
})
export class ChatTachieImageComponent implements AfterViewInit, AfterViewChecked {
  chatMessageService = inject(ChatMessageService);
  private changeDetectionRef = inject(ChangeDetectorRef);
  private panelService = inject(PanelService);
  private pointerDeviceService = inject(PointerDeviceService);
  private objectStore = inject(ObjectStore);
  private imageStorage = inject(ImageStorage);
  private objectChange = inject(ObjectChangeService);

  readonly chatTabidentifier = input('');
  readonly isTilteTop = input(false);
  readonly dispByMouse = input(false);

  private readonly tachieArea = viewChild.required<ElementRef>('tachieArea');
  private _tachieAreaWidth = 0;

  get chatTab(): ChatTab {
    this.objectChange.versionOf(this.chatTabidentifier())();
    return this.objectStore.get<ChatTab>(this.chatTabidentifier())!;
  }

  get tachieY_Pos(): number {
    if (!this.chatTabList?.isTachieInWindow) {
      return -(this.chatTabList?.tachieHeightValue ?? 0) - 26;
    } else {
      return 0;
    }
  }

  get tachieAreaWidth(): number {
    return this._tachieAreaWidth;
  }

  get chatTabList(): ChatTabList {
    return this.objectStore.get<ChatTabList>('ChatTabList')!;
  }

  get dispFlag(): boolean {
    if (!this.chatTabList) return false;
    if (this.isTilteTop() && !this.chatTabList.isTachieInWindow) return true;
    if (!this.isTilteTop() && this.chatTabList.isTachieInWindow) return true;
    return false;
  }

  get isTachieDispMode() {
    if (!this.chatTabList) return false;
    if (this.chatTabList.isKeepTachieOutWindow) {
      return this.dispFlag;
    } else {
      return this.dispFlag && this.dispByMouse();
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
    this._tachieAreaWidth = this.tachieArea().nativeElement.offsetWidth;
    this.changeDetectionRef.detectChanges();
  }

  ngAfterViewChecked() {
    this._tachieAreaWidth = this.tachieArea().nativeElement.offsetWidth;
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

  private imageFileUrlAt(position: number): string {
    const chatTab = this.chatTab;
    if (!chatTab?.imageIdentifier) return '';

    const imageIdentifier = chatTab.imageIdentifier[position];
    if (!imageIdentifier) return '';

    const image = this.imageStorage.get(imageIdentifier);
    return image ? image.url : '';
  }

  //この実装は後でどうにかしたい
  get imageFileUrl_00(): string {
    this.objectChange.fileVersion();
    return this.imageFileUrlAt(0);
  }

  get imageFileUrl_01(): string {
    return this.imageFileUrlAt(1);
  }

  get imageFileUrl_02(): string {
    return this.imageFileUrlAt(2);
  }

  get imageFileUrl_03(): string {
    return this.imageFileUrlAt(3);
  }

  get imageFileUrl_04(): string {
    return this.imageFileUrlAt(4);
  }

  get imageFileUrl_05(): string {
    return this.imageFileUrlAt(5);
  }

  get imageFileUrl_06(): string {
    return this.imageFileUrlAt(6);
  }

  get imageFileUrl_07(): string {
    return this.imageFileUrlAt(7);
  }

  get imageFileUrl_08(): string {
    return this.imageFileUrlAt(8);
  }

  get imageFileUrl_09(): string {
    return this.imageFileUrlAt(9);
  }

  get imageFileUrl_10(): string {
    return this.imageFileUrlAt(10);
  }

  get imageFileUrl_11(): string {
    return this.imageFileUrlAt(11);
  }

  tachieClick(pos: number) {
    this.chatTab.tachiePosHide(pos);
  }

  trackByChatTab(index: number, chatTab: ChatTab) {
    return chatTab.identifier;
  }
}
