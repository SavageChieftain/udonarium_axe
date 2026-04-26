import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ObjectStore } from '@axe/core/sync/object-store';
import { Alarm } from '@axe/domain/alarm/alarm';
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
export class AlarmWindowComponent {
  private readonly modalService = inject(ModalService);
  private readonly panelService = inject(PanelService);
  private readonly chatMessageService = inject(ChatMessageService);
  private readonly objectStore = inject(ObjectStore);

  private timestamp = 0;
  get alarm(): Alarm {
    return this.objectStore.get<Alarm>('Alarm')!;
  }

  constructor() {
    this.timestamp = this.alarm.initTimeStamp;
  }

  time!: string;
  title!: string;
}
