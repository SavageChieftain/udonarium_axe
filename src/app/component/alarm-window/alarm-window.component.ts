import { AfterViewInit, ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit, inject } from '@angular/core';

import { ObjectStore } from '@axe/core/synchronize-object/object-store';

import { EventSystem } from '@axe/core/system';

import { ChatMessageService } from 'service/chat-message.service';
import { ModalService } from 'service/modal.service';
import { PanelService } from 'service/panel.service';

import { Alarm } from '@axe/alarm';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-alarm-window',
  templateUrl: './alarm-window.component.html',
  styleUrls: ['./alarm-window.component.css'],
  imports: [NgTemplateOutlet, FormsModule],
})
export class AlarmWindowComponent implements AfterViewInit, OnInit, OnDestroy {
  private modalService = inject(ModalService);
  private panelService = inject(PanelService);
  private changeDetectionRef = inject(ChangeDetectorRef);
  private chatMessageService = inject(ChatMessageService);
  private ngZone = inject(NgZone);

  private timestamp = 0;
  get alarm(): Alarm {
    return ObjectStore.instance.get<Alarm>('Alarm');
  }

  constructor() {
    this.timestamp = this.alarm.initTimeStamp;
  }

  time!: string;
  title!: string;

  ngOnInit() {}

  ngAfterViewInit() {}

  ngOnDestroy() {
    EventSystem.unregister(this);
  }
}
