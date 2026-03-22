import { Component, Input, OnInit, inject } from '@angular/core';

import { ModalService } from 'service/modal.service';
import { PanelService } from 'service/panel.service';

@Component({
  selector: 'text-view',
  templateUrl: './text-view.component.html',
  styleUrls: ['./text-view.component.css'],
})
export class TextViewComponent implements OnInit {
  private panelService = inject(PanelService);
  private modalService = inject(ModalService);

  @Input() text: string = '';
  @Input() title: string = '';

  ngOnInit() {
    queueMicrotask(() => {
      this.panelService.title = this.title;
      const option = this.modalService.option as Record<string, unknown>;
      if (option && option.title != null) {
        this.modalService.title = option.title ? (option.title as string) : '';
        this.text = option.text ? (option.text as string) : '';
      }
    });
  }
}
