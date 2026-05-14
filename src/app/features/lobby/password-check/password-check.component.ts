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

/**
 * パスワード保護されたルームへの入室前にパスワード入力を受け付ける modal。
 *
 * 入力された PeerContext そのものを使って verifyPassword するため、
 * 呼び出し側 (lobby) は roomName を含む完全な PeerContext を渡す必要がある。
 * peerId 文字列だけを渡された場合は PeerContext.parse() が roomName を空にしてしまい、
 * digest 計算がずれて検証が常に失敗する。
 */
export interface PasswordCheckOptions {
  /** 対象ルームの PeerContext（roomName まで埋まっていること）。 */
  peerContext: PeerContext;
  /** タイトルバー表示用ラベル（任意）。 */
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
    // verifyPassword は this.roomName / this.digestUserId / this.roomId など複数フィールドを
    // 参照するため、呼び出し側で完全に組み立てた PeerContext をそのまま受け取る設計。
    // peerId だけを渡されると roomName が空になり digest がずれて常に false になる。
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
