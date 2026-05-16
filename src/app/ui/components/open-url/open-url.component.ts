import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { ModalService } from '@axe/application/ui/modal.service';
import { PanelService } from '@axe/application/ui/panel.service';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'open-url',
  templateUrl: './open-url.component.html',
  imports: [TranslocoModule],
})
export class OpenUrlComponent {
  private readonly panelService = inject(PanelService);
  private readonly modalService = inject(ModalService);
  private readonly t = inject(TRANSLATE_FN);

  url: string = '';
  title: string = '';
  subTitle: string = '';
  urlObj: URL | null = null;

  constructor() {
    const modalService = this.modalService;
    const option = modalService.option as Record<string, unknown>;

    this.url = option.url ? (option.url as string) : '';
    this.title = option.title ? (option.title as string) : '';
    this.subTitle = option.subTitle ? (option.subTitle as string) : '';
    this.urlObj = this.isValid ? new URL(this.url) : null;
    queueMicrotask(() => {
      let titleBar: string;
      if (this.title && this.subTitle) {
        titleBar = this.t('ui.openUrl.panelTitleWithTitleAndSubtitle', { title: this.title, subTitle: this.subTitle });
      } else if (this.title) {
        titleBar = this.t('ui.openUrl.panelTitleWithTitle', { title: this.title });
      } else if (this.subTitle) {
        titleBar = this.t('ui.openUrl.panelTitleWithSubtitleOnly', { subTitle: this.subTitle });
      } else {
        titleBar = this.t('ui.openUrl.panelTitle');
      }
      this.modalService.title = this.panelService.title = titleBar;
    });
  }

  get isValid(): boolean {
    return this.validUrl(this.url.trim());
  }

  get isOuter(): boolean {
    if (!this.isValid || this.urlObj === null) return false;
    return window.location.origin !== this.urlObj.origin;
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

  openUrl() {
    window.open(this.url.trim(), '_blank', 'noopener');
    this.modalService.resolve(true);
  }

  cancel() {
    this.modalService.resolve(false);
  }
}
