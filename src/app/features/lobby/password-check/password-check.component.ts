import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalService } from '@axe/application/ui/modal.service';
import { PanelService } from '@axe/application/ui/panel.service';
import { PeerContext } from '@axe/core/network/peer-context';

export interface PasswordCheckOptions {
  peerContext: PeerContext;
  title?: string;
}

@Component({
  selector: 'password-check',
  templateUrl: './password-check.component.html',
  host: { class: 'block' },
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasswordCheckComponent {
  private readonly panelService = inject(PanelService);
  private readonly modalService = inject(ModalService);

  readonly passwordInputElementRef = viewChild.required<ElementRef<HTMLInputElement>>('passwordInput');

  readonly password = signal<string>('');
  readonly help = signal('');

  private readonly targetPeerContext: PeerContext;
  readonly title: string;

  constructor() {
    const option = this.modalService.option as Partial<PasswordCheckOptions> | undefined;
    this.targetPeerContext = option?.peerContext ?? PeerContext.parse('???');
    this.title = option?.title ?? '';

    queueMicrotask(() => (this.modalService.title = this.panelService.title = `パスワード ＜${this.title}＞`));
    afterNextRender(() => {
      this.passwordInputElementRef().nativeElement.focus();
    });
  }

  onPasswordChange(value: string): void {
    this.password.set(value);
    this.help.set('');
  }

  async submit() {
    if (await this.targetPeerContext.verifyPassword(this.password())) {
      this.modalService.resolve(this.password());
      return;
    }
    this.help.set('パスワードが違います');
  }
}
