import { DatePipe, NgClass, NgStyle } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { ChatMessageService } from '@axe/application/chat/chat-message.service';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { PanelOption, PanelService } from '@axe/application/ui/panel.service';
import { PointerDeviceService } from '@axe/core/input/pointer-device.service';
import { ImageFile } from '@axe/core/storage/image-file';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { ObjectStore } from '@axe/core/sync/object-store';
import { ChatMessage } from '@axe/domain/chat/chat-message';
import { ChatTabList } from '@axe/domain/chat/chat-tab-list';
import { ChatMessageFixComponent } from '@axe/features/chat/chat-message-fix/chat-message-fix.component';
import { ChatColorStylePipe } from '@axe/ui/pipes/chat-color-style.pipe';
import { LinkifyPipe } from '@axe/ui/pipes/linkify.pipe';
import { SafePipe } from '@axe/ui/pipes/safe.pipe';

@Component({
  selector: 'chat-message',
  templateUrl: './chat-message.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, NgStyle, DatePipe, LinkifyPipe, ChatColorStylePipe, SafePipe],
})
export class ChatMessageComponent {
  protected readonly SYSTEM_ICON_URL = 'assets/images/system_chang.png';
  protected readonly DICEBOT_ICON_URL = 'assets/images/system_chang_roll.png';

  private readonly chatMessageService = inject(ChatMessageService);
  private readonly pointerDeviceService = inject(PointerDeviceService);
  private readonly panelService = inject(PanelService);
  private readonly objectStore = inject(ObjectStore);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly imageStorage = inject(ImageStorage);

  protected readonly chatMessageInput = input<ChatMessage>(null!, { alias: 'chatMessage' });
  get chatMessage(): ChatMessage {
    return this.chatMessageInput();
  }

  /** システムちゃんアイコンを表示すべきメッセージか判定する */
  get isSystemMessage(): boolean {
    // チュートリアル等: from === 'System'
    // sendSystemMessage: tag に 'system-message' を含む
    // BCDice (System-BCDice) は除外
    return this.chatMessage.from === 'System' || (this.chatMessage.tag ?? '').includes('system-message');
  }

  readonly simpleDispFlagTime = input(false);
  readonly simpleDispFlagUserId = input(false);
  readonly chatSimpleDispFlag = input(false);

  readonly imageFile = signal<ImageFile>(ImageFile.Empty);
  readonly attachmentImageFiles = computed(() => {
    const chatMessage = this.chatMessageInput();
    if (!chatMessage) return [];
    this.objectChange.versionOf(chatMessage.identifier)();
    this.objectChange.fileVersion();
    return chatMessage.attachmentImageIdentifierList
      .map((identifier) => this.imageStorage.get(identifier))
      .filter((image): image is ImageFile => image != null);
  });
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
      .replace(/[|｜]([^|｜\s]+?)《(.+?)》/g, '<ruby class="chat-ruby"><rb>$1</rb><rt>$2</rt></ruby>')
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
