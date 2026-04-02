import { NgStyle } from '@angular/common';
import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PointerDeviceService } from '@axe/core/input/pointer-device.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { ChatTab } from '@axe/domain/chat/chat-tab';
import { ChatTabList } from '@axe/domain/chat/chat-tab-list';
import { ChatMessageSettingComponent } from '@axe/features/chat/chat-message-setting/chat-message-setting.component';
import { ChatTachieImageComponent as ChatTachieImageComponent_1 } from '@axe/features/chat/chat-tachie-img/chat-tachie-img.component';
import { ChatMessageService } from '@axe/shared/chat/chat-message.service';
import { PanelOption, PanelService } from '@axe/shared/ui/panel.service';
import { UiSignalService } from '@axe/shared/ui/ui-signal.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'chat-tachie',
  templateUrl: './chat-tachie.component.html',
  styleUrls: ['./chat-tachie.component.css'],
  imports: [FormsModule, NgStyle, ChatTachieImageComponent_1],
})
export class ChatTachieComponent implements AfterViewChecked {
  chatMessageService = inject(ChatMessageService);
  private panelService = inject(PanelService);
  private pointerDeviceService = inject(PointerDeviceService);
  private objectStore = inject(ObjectStore);
  private uiSignalService = inject(UiSignalService);

  readonly chatTabidentifier = input('');
  private readonly tachieArea = viewChild<ElementRef>('tachieArea');
  private _tachieAreaWidth = 0;

  get chatTab(): ChatTab {
    return this.objectStore.get<ChatTab>(this.chatTabidentifier())!;
  }

  get chatTabList(): ChatTabList {
    return this.objectStore.get<ChatTabList>('ChatTabList')!;
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

  trackByChatTab(index: number, chatTab: ChatTab) {
    return chatTab.identifier;
  }

  changeSimpleDisp() {
    this.uiSignalService.notifyChatRedraw();
  }
}
