import { NgTemplateOutlet } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, inject, NgZone, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Alarm } from '@axe/alarm';
import { ObjectStore } from '@axe/core/synchronize-object/object-store';
import { EventSystem } from '@axe/core/system';
import { ChatMessageService } from 'service/chat-message.service';
import { ModalService } from 'service/modal.service';
import { PanelService } from 'service/panel.service';

@Component({
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
  private ngZone = inject(NgZone);
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
