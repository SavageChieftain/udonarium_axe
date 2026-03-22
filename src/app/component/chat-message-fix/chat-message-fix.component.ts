import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
  inject,
} from '@angular/core';
import GameSystemClass from 'bcdice/lib/game_system';
import { ChatMessage } from '@axe/chat-message';
import { ObjectStore } from '@axe/core/synchronize-object/object-store';
import { DiceBot } from '@axe/dice-bot';
import { PeerCursor } from '@axe/peer-cursor';
import { BatchService } from 'service/batch.service';

import { ChatMessageService } from 'service/chat-message.service';
import { PanelService } from 'service/panel.service';
import { PointerDeviceService } from 'service/pointer-device.service';

import { FormsModule } from '@angular/forms';

@Component({
  selector: 'chat-message-fix',
  templateUrl: './chat-message-fix.component.html',
  styleUrls: ['./chat-message-fix.component.css'],
  imports: [FormsModule],
})
export class ChatMessageFixComponent implements OnInit, OnDestroy {
  private ngZone = inject(NgZone);
  chatMessageService = inject(ChatMessageService);
  private batchService = inject(BatchService);
  private panelService = inject(PanelService);
  private pointerDeviceService = inject(PointerDeviceService);

  @ViewChild('textArea', { static: true }) textAreaElementRef: ElementRef;

  @Input('autoCompleteListLen') _autoCompleteListLen: number = -1;

  @Input('text') _text: string = '';
  get text(): string {
    return this._text;
  }
  set text(text: string) {
    this._text = text;
  }

  @Output() chat = new EventEmitter<{
    text: string;
    gameSystem: GameSystemClass;
    sendFrom: string;
    sendTo: string;
    tachieNum: number;
    messColor: string;
  }>();

  chatMessage!: ChatMessage;
  initTimestamp = 0;

  private previousWritingLength: number = 0;

  get diceBotInfos() {
    return DiceBot.diceBotInfos;
  }
  get myPeer(): PeerCursor {
    return PeerCursor.myCursor;
  }
  get otherPeers(): PeerCursor[] {
    return ObjectStore.instance.getObjects(PeerCursor);
  }

  private calcFitHeightInterval: NodeJS.Timeout = null!;
  constructor() {
    this.initTimestamp = Date.now();
  }

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
        const txtarea = <HTMLInputElement>document.getElementById('messageFix' + '_' + this.initTimestamp);
        txtarea.focus();
      }, 0);
    }
  }

  calcFitHeight() {
    const textArea: HTMLTextAreaElement = this.textAreaElementRef.nativeElement;
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
