import { ChangeDetectionStrategy, Component, ElementRef, inject, OnDestroy, OnInit, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PointerDeviceService } from '@axe/core/pointer-device.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { ChatMessage } from '@axe/domain/chat/chat-message';
import { DiceBot } from '@axe/domain/dice/dice-bot';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { BatchService } from '@axe/shared/batch.service';
import { ChatMessageService } from '@axe/shared/chat/chat-message.service';
import { PanelService } from '@axe/shared/panel.service';
import GameSystemClass from 'bcdice/lib/game_system';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'chat-message-fix',
  templateUrl: './chat-message-fix.component.html',
  styleUrls: ['./chat-message-fix.component.css'],
  imports: [FormsModule],
})
export class ChatMessageFixComponent implements OnInit, OnDestroy {
  chatMessageService = inject(ChatMessageService);
  private batchService = inject(BatchService);
  private panelService = inject(PanelService);
  private pointerDeviceService = inject(PointerDeviceService);
  private objectStore = inject(ObjectStore);

  readonly textAreaElementRef = viewChild.required<ElementRef>('textArea');

  _autoCompleteListLen: number = -1;

  _text: string = '';
  get text(): string {
    return this._text;
  }
  set text(text: string) {
    this._text = text;
  }

  chat!: {
    text: string;
    gameSystem: GameSystemClass;
    sendFrom: string;
    sendTo: string;
    tachieNum: number;
    messColor: string;
  };

  chatMessage!: ChatMessage;

  private previousWritingLength: number = 0;

  get diceBotInfos() {
    return DiceBot.diceBotInfos;
  }
  get myPeer(): PeerCursor {
    return PeerCursor.myCursor;
  }
  get otherPeers(): PeerCursor[] {
    return this.objectStore.getObjects(PeerCursor);
  }

  private calcFitHeightInterval: NodeJS.Timeout = null!;

  ngOnInit(): void {
    this.kickCalcFitHeight();
  }

  ngOnDestroy() {}

  onInput() {
    this.previousWritingLength = this.text.length;
    this.calcFitHeight();
  }

  private history: string[] = [];
  private currentHistoryIndex: number = -1;
  private static MAX_HISTORY_NUM = 1000;

  kickCalcFitHeight() {
    if (this.calcFitHeightInterval == null) {
      this.calcFitHeightInterval = setTimeout(() => {
        this.calcFitHeightInterval = null!;
        this.calcFitHeight();
        this.textAreaElementRef().nativeElement.focus();
      }, 0);
    }
  }

  calcFitHeight() {
    const textArea: HTMLTextAreaElement = this.textAreaElementRef().nativeElement;
    textArea.style.height = '';
    if (textArea.scrollHeight >= textArea.offsetHeight) {
      textArea.style.height = textArea.scrollHeight + 'px';
    }
  }

  fix(event: Event | null) {
    if (event) event.preventDefault();
    if (event && (event as KeyboardEvent).keyCode !== 13) return;
    if (this.chatMessage.text != this.text) {
      this.chatMessage.text = this.text;
      this.chatMessage.fixd = true;
    }
    this.panelService.close();
  }

  cancel() {
    this.panelService.close();
  }
}
