import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Network } from '@axe/core/index';
import { PeerContext } from '@axe/core/network/peer-context';
import { ModalService } from '@axe/shared/ui/modal.service';
import { PanelService } from '@axe/shared/ui/panel.service';

@Component({
  selector: 'password-check',
  templateUrl: './password-check.component.html',
  styleUrls: ['./password-check.component.css'],
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasswordCheckComponent {
  private readonly panelService = inject(PanelService);
  private readonly modalService = inject(ModalService);

  readonly passwordInputElementRef = viewChild.required<ElementRef<HTMLInputElement>>('passwordInput');

  readonly password = signal<string>('');
  readonly help = signal('');

  private targetPeerContext!: PeerContext;
  title: string = '';

  get peerId(): string {
    return Network.peerId;
  }
  readonly isConnected = computed(() => Network.peerIds.length > 1);

  constructor() {
    const modalService = this.modalService;
    const option = modalService.option as Record<string, unknown>;

    this.targetPeerContext = option.peerId ? PeerContext.parse(option.peerId as string) : PeerContext.parse('???');
    this.title = option.title ? (option.title as string) : '';

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
    if (await this.targetPeerContext.verifyPassword(this.password())) this.modalService.resolve(this.password());
    this.help.set('パスワードが違います');
  }
}
