import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';

import { EventSystem, Network } from '@axe/core/system';
import { PeerContext } from '@axe/core/system/network/peer-context';

import { ModalService } from 'service/modal.service';
import { PanelService } from 'service/panel.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'password-check',
  templateUrl: './password-check.component.html',
  styleUrls: ['./password-check.component.css'],
  imports: [FormsModule],
})
export class PasswordCheckComponent implements OnInit, AfterViewInit, OnDestroy {
  private panelService = inject(PanelService);
  private modalService = inject(ModalService);

  @ViewChild('passwordInput', { static: true }) passwordInputElementRef: ElementRef<HTMLInputElement>;

  password: string = '';
  help: string = '';

  private targetPeerContext: PeerContext = null!;
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
    Promise.resolve().then(() => (this.modalService.title = this.panelService.title = `パスワード ＜${this.title}＞`));
    EventSystem.register(this);
  }

  ngAfterViewInit() {
    this.passwordInputElementRef.nativeElement.focus();
  }

  ngOnDestroy() {
    EventSystem.unregister(this);
  }

  onInputChange(_value: string) {
    this.help = '';
  }

  async submit() {
    if (await this.targetPeerContext.verifyPassword(this.password)) this.modalService.resolve(this.password);
    this.help = 'パスワードが違います';
  }
}
