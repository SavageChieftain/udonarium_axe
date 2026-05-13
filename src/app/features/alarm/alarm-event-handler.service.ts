import { DestroyRef, inject, Injectable } from '@angular/core';
import { ChatMessageService } from '@axe/application/chat/chat-message.service';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { PanelOption, PanelService } from '@axe/application/ui/panel.service';
import { AlarmWindowComponent } from '@axe/features/alarm/alarm-window/alarm-window.component';

/**
 * アラームのドメインイベント (alarmTimeUp$ / alarmPop$) を購読し、
 * アラーム発火時にアラームパネルを開き、時刻読み上げをチャットに流すサービス。
 * `providedIn: 'root'` で AppComponent が inject() するだけで自動的に起動する。
 * 個別 feature が自身のイベント処理を所有することで composition root の肥大化を防ぐ。
 */
@Injectable({ providedIn: 'root' })
export class AlarmEventHandlerService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly panelService = inject(PanelService);
  private readonly chatMessageService = inject(ChatMessageService);

  constructor() {
    this.objectChange.alarmTimeUp$.subscribe((event) => {
      this.chatMessageService.sendSystemMessageLastSendCharactor(event.text);
    }, this.destroyRef);
    this.objectChange.alarmPop$.subscribe((event) => {
      this.openAlarmPanel(event.title, String(event.time));
    }, this.destroyRef);
  }

  private openAlarmPanel(title: string, time: string): void {
    const winW = 200;
    const winH = 80;
    const marginW = Math.max(0, window.innerWidth - winW);
    const marginH = Math.max(0, window.innerHeight - winH - 25);

    const option: PanelOption = {
      title: 'アラーム ' + title,
      width: winW,
      height: winH + 25,
      left: marginW * 0.5,
      top: marginH * 0.5,
    };

    const component = this.panelService.open(AlarmWindowComponent, option);
    component.title = title;
    component.time = time;
  }
}
