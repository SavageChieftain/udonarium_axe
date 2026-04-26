import { NgStyle } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PointerDeviceService } from '@axe/core/input/pointer-device.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { ChatTab } from '@axe/domain/chat/chat-tab';
import { ChatTabList } from '@axe/domain/chat/chat-tab-list';
import { ChatMessageSettingComponent } from '@axe/features/chat/chat-message-setting/chat-message-setting.component';
import { ChatPortraitImageComponent as ChatPortraitImageComponent_1 } from '@axe/features/chat/chat-portrait-img/chat-portrait-img.component';
import { ChatMessageService } from '@axe/shared/chat/chat-message.service';
import { PanelOption, PanelService } from '@axe/shared/ui/panel.service';
import { UiSignalService } from '@axe/shared/ui/ui-signal.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'chat-portrait',
  templateUrl: './chat-portrait.component.html',
  imports: [FormsModule, NgStyle, ChatPortraitImageComponent_1],
})
export class ChatPortraitComponent {
  chatMessageService = inject(ChatMessageService);
  private readonly panelService = inject(PanelService);
  private readonly pointerDeviceService = inject(PointerDeviceService);
  private readonly objectStore = inject(ObjectStore);
  private readonly uiSignalService = inject(UiSignalService);

  readonly chatTabidentifier = input('');

  get chatTab(): ChatTab {
    return this.objectStore.get<ChatTab>(this.chatTabidentifier())!;
  }

  get chatTabList(): ChatTabList {
    return this.objectStore.get<ChatTabList>('ChatTabList')!;
  }

  chkHeight(newNum: number) {
    if (newNum <= this.chatTabList.minPortraitSize) this.chatTabList.portraitHeight = this.chatTabList.minPortraitSize;
    if (newNum >= this.chatTabList.maxPortraitSize) this.chatTabList.portraitHeight = this.chatTabList.maxPortraitSize;
  }

  get portraitAreaHeight(): number {
    if (this.chatTab) {
      if (this.chatTab.portraitDisplayFlag) {
        if (this.chatTabList.isPortraitInWindow) {
          return this.chatTabList.portraitHeight;
        }
      }
    }
    return 0;
  }

  showMessageSetting() {
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

  onChkHeight(event: Event): void {
    this.chkHeight((event.target as HTMLInputElement).valueAsNumber);
  }

  changeSimpleDisp() {
    this.uiSignalService.notifyChatRedraw();
  }
}
