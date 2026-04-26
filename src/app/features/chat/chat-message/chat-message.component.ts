import { DatePipe, NgClass, NgStyle } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { PointerDeviceService } from '@axe/core/input/pointer-device.service';
import { ImageFile } from '@axe/core/storage/image-file';
import { ObjectStore } from '@axe/core/sync/object-store';
import { ChatMessage } from '@axe/domain/chat/chat-message';
import { ChatTabList } from '@axe/domain/chat/chat-tab-list';
import { ChatMessageFixComponent } from '@axe/features/chat/chat-message-fix/chat-message-fix.component';
import { ChatMessageService } from '@axe/shared/chat/chat-message.service';
import { LinkifyPipe } from '@axe/shared/pipes/linkify.pipe';
import { SafePipe } from '@axe/shared/pipes/safe.pipe';
import { ObjectChangeService } from '@axe/shared/sync/object-change.service';
import { PanelOption, PanelService } from '@axe/shared/ui/panel.service';

@Component({
  selector: 'chat-message',
  templateUrl: './chat-message.component.html',
  host: { class: 'block' },
  styleUrls: ['./chat-message.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, NgStyle, DatePipe, LinkifyPipe, SafePipe],
})
export class ChatMessageComponent {
  private readonly chatMessageService = inject(ChatMessageService);
  private readonly pointerDeviceService = inject(PointerDeviceService);
  private readonly panelService = inject(PanelService);
  private readonly objectStore = inject(ObjectStore);
  private readonly objectChange = inject(ObjectChangeService);

  protected readonly chatMessageInput = input<ChatMessage>(null!, { alias: 'chatMessage' });
  get chatMessage(): ChatMessage {
    return this.chatMessageInput();
  }

  readonly simpleDispFlagTime = input(false);
  readonly simpleDispFlagUserId = input(false);
  readonly chatSimpleDispFlag = input(false);

  readonly imageFile = signal<ImageFile>(ImageFile.Empty);
  readonly animeState = signal<string>('inactive');

  constructor() {
    effect(() => {
      const chatMessage = this.chatMessageInput();
      const file = chatMessage.image;
      if (file) this.imageFile.set(file);
      const time = this.chatMessageService.getTime();
      if (time - 10 * 1000 < chatMessage.timestamp) this.animeState.set('active');
    });
  }

  get chatTabList(): ChatTabList {
    return this.objectStore.get<ChatTabList>('ChatTabList')!;
  }

  discloseMessage() {
    this.chatMessage.tag = this.chatMessage.tag.replace('secret', '');
  }

  clickFix() {
    const coordinate = this.pointerDeviceService.pointers[0];
    const option: PanelOption = { width: 700, height: 120, left: coordinate.x, top: coordinate.y };
    option.title = 'チャット編集';
    const component = this.panelService.open(ChatMessageFixComponent, option);
    component.chatMessage = this.chatMessage;
    component.text = this.chatMessage.text;
  }

  escapeHtmlAndRuby(text: string) {
    this.objectChange.versionOf(this.chatMessage?.identifier)();
    // ルビ機能 ハーメルン記法を参考 半角全角|始まり。振られる側にスペースは不可。
    // 記入例：|永遠力暴風雪《エターナルフォースブリザード》
    // 振られる側に《スキル名》は有効：|《約束された勝利の剣》《エクスカリバー》
    const escapeText = this.escapeHtml(text);
    return escapeText
      .replace(/[|｜]([^|｜\s]+?)《(.+?)》/g, '<ruby style="white-space:normal;">$1<rt>$2</rt></ruby>')
      .replace(/\\s/g, ' ');
  }

  escapeHtml(text: string) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
