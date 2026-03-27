import { NgTemplateOutlet } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, Component, inject, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ObjectStore } from '@axe/core/sync/object-store';
import { Alarm } from '@axe/domain/shared/alarm';
import { ChatMessageService } from '@axe/shared/chat/chat-message.service';
import { ModalService } from '@axe/shared/ui/modal.service';
import { PanelService } from '@axe/shared/ui/panel.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-alarm-window',
  templateUrl: './alarm-window.component.html',
  styleUrls: ['./alarm-window.component.css'],
  imports: [NgTemplateOutlet, FormsModule],
})
export class AlarmWindowComponent implements AfterViewInit, OnDestroy {
  private modalService = inject(ModalService);
  private panelService = inject(PanelService);
  private chatMessageService = inject(ChatMessageService);
  private objectStore = inject(ObjectStore);

  private timestamp = 0;
  get alarm(): Alarm {
    return this.objectStore.get<Alarm>('Alarm');
  }

  constructor() {
    this.timestamp = this.alarm.initTimeStamp;
  }

  time!: string;
  title!: string;

  ngAfterViewInit() {}

  ngOnDestroy() {}
}
