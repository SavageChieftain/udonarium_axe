import { DatePipe, NgClass, NgStyle } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, Component, inject, Input, OnInit } from '@angular/core';
import { ChatMessage } from '@axe/chat-message';
import { ChatTabList } from '@axe/chat-tab-list';
import { ImageFile } from '@axe/core/file-storage/image-file';
import { ObjectStore } from '@axe/core/synchronize-object/object-store';
import { ChatMessageFixComponent } from 'component/chat-message-fix/chat-message-fix.component';
import { LinkifyPipe } from 'pipe/linkify.pipe';
import { SafePipe } from 'pipe/safe.pipe';
import { ChatMessageService } from 'service/chat-message.service';
import { PanelOption, PanelService } from 'service/panel.service';
import { PointerDeviceService } from 'service/pointer-device.service';

@Component({
  selector: 'chat-message',
  templateUrl: './chat-message.component.html',
  styleUrls: ['./chat-message.component.css'],
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [NgClass, NgStyle, DatePipe, LinkifyPipe, SafePipe],
})
export class ChatMessageComponent implements OnInit, AfterViewInit {
  private chatMessageService = inject(ChatMessageService);
  private pointerDeviceService = inject(PointerDeviceService);
  private panelService = inject(PanelService);
  private objectStore = inject(ObjectStore);

  @Input() chatMessage: ChatMessage;

  @Input() simpleDispFlagTime: boolean = false;
  @Input() simpleDispFlagUserId: boolean = false;
  @Input() chatSimpleDispFlag: boolean = false;

  imageFile: ImageFile = ImageFile.Empty;
  animeState: string = 'inactive';

  get chatTabList(): ChatTabList {
    return this.objectStore.get<ChatTabList>('ChatTabList');
  }

  ngOnInit() {
    const file: ImageFile = this.chatMessage.image;
    if (file) this.imageFile = file;
    const time = this.chatMessageService.getTime();
    if (time - 10 * 1000 < this.chatMessage.timestamp) this.animeState = 'active';
  }

  ngAfterViewInit() {}

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
