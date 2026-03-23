import { NgTemplateOutlet } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Alarm } from '@axe/class/alarm';
import { ObjectStore } from '@axe/class/core/synchronize-object/object-store';
import { EventSystem } from '@axe/class/core/system';
import { ChatMessageService } from '@axe/service/chat-message.service';
import { ModalService } from '@axe/service/modal.service';
import { PanelService } from '@axe/service/panel.service';

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
  private changeDetectionRef = inject(ChangeDetectorRef);
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

  ngOnDestroy() {
    EventSystem.unregister(this);
  }
}
