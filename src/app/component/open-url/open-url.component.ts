import { NgClass } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { EventSystem } from '@axe/core/system';
import { ModalService } from 'service/modal.service';
import { PanelService } from 'service/panel.service';

@Component({
  selector: 'open-url',
  templateUrl: './open-url.component.html',
  styleUrls: ['./open-url.component.css'],
  imports: [NgClass],
})
export class OpenUrlComponent implements OnInit, OnDestroy {
  private panelService = inject(PanelService);
  private modalService = inject(ModalService);

  url: string = '';
  title: string = '';
  subTitle: string = '';
  urlObj!: URL;

  constructor() {
    const modalService = this.modalService;
    const option = modalService.option as Record<string, unknown>;

    this.url = option.url ? (option.url as string) : '';
    this.title = option.title ? (option.title as string) : '';
    this.subTitle = option.subTitle ? (option.subTitle as string) : '';
    this.urlObj = this.isValid ? new URL(this.url) : null!;
  }

  get isValid(): boolean {
    return this.validUrl(this.url.trim());
  }

  get isOuter(): boolean {
    if (!this.isValid) return false;
    return window.location.origin != this.urlObj.origin;
  }

  ngOnInit() {
    queueMicrotask(() => {
      let titleBar = '外部URLを開く';
      if (this.title) {
        titleBar += '〈' + this.title + (this.subTitle ? `：${this.subTitle}` : '') + '〉';
      } else if (this.subTitle) {
        titleBar += `〈${this.subTitle}〉`;
      }
      this.modalService.title = this.panelService.title = titleBar;
    });
    EventSystem.register(this);
  }

  validUrl(url: string): boolean {
    if (!url) return false;
    try {
      new URL(url.trim());
    } catch (_e) {
      return false;
    }
    return /^https?:\/\//.test(url.trim());
  }

  ngOnDestroy() {
    EventSystem.unregister(this);
  }

  openUrl() {
    window.open(this.url.trim(), '_blank', 'noopener');
    this.modalService.resolve(true);
  }

  cancel() {
    this.modalService.resolve(false);
  }
}
