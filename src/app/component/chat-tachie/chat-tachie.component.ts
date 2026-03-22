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
import { FormsModule } from '@angular/forms';
import { ChatTab } from '@axe/chat-tab';
import { ChatTabList } from '@axe/chat-tab-list';
import { ObjectStore } from '@axe/core/synchronize-object/object-store';
import { EventSystem } from '@axe/core/system';
import { ChatMessageSettingComponent } from 'component/chat-message-setting/chat-message-setting.component';
import { ChatTachieImageComponent as ChatTachieImageComponent_1 } from 'component/chat-tachie-img/chat-tachie-img.component';
import { ChatMessageService } from 'service/chat-message.service';
import { PanelOption, PanelService } from 'service/panel.service';
import { PointerDeviceService } from 'service/pointer-device.service';

@Component({
  selector: 'chat-tachie',
  templateUrl: './chat-tachie.component.html',
  styleUrls: ['./chat-tachie.component.css'],
  imports: [FormsModule, NgStyle, ChatTachieImageComponent_1],
})
export class ChatTachieComponent implements OnDestroy, AfterViewInit, AfterViewChecked {
  chatMessageService = inject(ChatMessageService);
  private changeDetectionRef = inject(ChangeDetectorRef);
  private panelService = inject(PanelService);
  private pointerDeviceService = inject(PointerDeviceService);

  @Input() chatTabidentifier: string = '';
  @ViewChild('tachieArea', { read: ElementRef }) private tachieArea: ElementRef;
  private _tachieAreaWidth = 0;

  get chatTab(): ChatTab {
    return ObjectStore.instance.get<ChatTab>(this.chatTabidentifier);
  }

  get chatTabList(): ChatTabList {
    return ObjectStore.instance.get<ChatTabList>('ChatTabList');
  }

  get tachieAreaWidth(): number {
    return this._tachieAreaWidth;
  }

  chkHeight(newNum: number) {
    if (newNum <= this.chatTabList.minTachieSize) this.chatTabList.tachieHeightValue = this.chatTabList.minTachieSize;
    if (newNum >= this.chatTabList.maxTachieSize) this.chatTabList.tachieHeightValue = this.chatTabList.maxTachieSize;
  }

  get tachieAreaHeight(): number {
    if (this.chatTab) {
      if (this.chatTab.tachieDispFlag) {
        if (this.chatTabList.isTachieInWindow) {
          return this.chatTabList.tachieHeightValue;
        }
      }
    }
    return 0;
  }

  private timerId: ReturnType<typeof setTimeout> | null = null;

  ngAfterViewInit() {}

  ngAfterViewChecked() {}

  shoeMessageSetting() {
    const coordinate = this.pointerDeviceService.pointers[0];
    const title = 'チャット詳細設定';
    const option: PanelOption = {
      title: title,
      left: coordinate.x + 50,
      top: coordinate.y - 200,
      width: 340,
      height: 220,
    };
    this.panelService.open<ChatMessageSettingComponent>(ChatMessageSettingComponent, option);
  }

  ngOnDestroy() {
    EventSystem.unregister(this);
  }

  trackByChatTab(index: number, chatTab: ChatTab) {
    return chatTab.identifier;
  }

  changeSimpleDisp() {
    EventSystem.trigger('RE_DRAW_CHAT', {});
  }
}
