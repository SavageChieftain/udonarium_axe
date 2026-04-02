import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
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
export class PasswordCheckComponent implements OnInit, AfterViewInit, OnDestroy {
  private panelService = inject(PanelService);
  private modalService = inject(ModalService);

  readonly passwordInputElementRef = viewChild.required<ElementRef<HTMLInputElement>>('passwordInput');

  password: string = '';
  readonly help = signal('');

  private targetPeerContext!: PeerContext;
  title: string = '';

  get peerId(): string {
    return Network.peerId;
  }
  get isConnected(): boolean {
    return Network.peerIds.length <= 1 ? false : true;
  }

  constructor() {
    const modalService = this.modalService;
    const option = modalService.option as Record<string, unknown>;

    this.targetPeerContext = option.peerId ? PeerContext.parse(option.peerId as string) : PeerContext.parse('???');
    this.title = option.title ? (option.title as string) : '';
  }

  ngOnInit() {
    queueMicrotask(() => (this.modalService.title = this.panelService.title = `パスワード ＜${this.title}＞`));
  }

  ngAfterViewInit() {
    this.passwordInputElementRef().nativeElement.focus();
  }

  ngOnDestroy() {}

  onInputChange(_value: string) {
    this.help.set('');
  }

  async submit() {
    if (await this.targetPeerContext.verifyPassword(this.password)) this.modalService.resolve(this.password);
    this.help.set('パスワードが違います');
  }
}
