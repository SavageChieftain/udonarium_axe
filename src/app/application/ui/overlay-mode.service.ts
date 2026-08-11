import { DOCUMENT, inject, Injectable, signal } from '@angular/core';
import { parseInviteLink } from '@axe/domain/peer/invite-link';
import { PeerRole } from '@axe/domain/peer/peer-role';

export const OVERLAY_BODY_CLASS = 'overlay-mode';

/**
 * 配信に重ねるための画面。
 *
 * 盤面もパネルも出さず、背景を抜いて発言と手番だけを出す。OBS のブラウザソースに URL を貼る用。
 *
 * ノベルモードと違い **同期しない**。同期すると、配信用に開いた 1 枚のために
 * 卓の全員の画面が切り替わってしまう。この端末の見え方に閉じている。
 *
 * 入り口は招待リンクだけなので、**画面を組み立てる前に**リンクから決める。
 * 入室の完了を待つと、配信に卓の画面が一瞬映ってから切り替わる。
 */
@Injectable({ providedIn: 'root' })
export class OverlayModeService {
  private readonly document = inject(DOCUMENT);
  private readonly _active = signal(false);
  private _requestedRole: PeerRole = PeerRole.Guest;

  readonly active = this._active.asReadonly();

  /** リンクで指定された役割。入室が終わるまで、見える範囲はこちらの側で狭く見積もる。 */
  get requestedRole(): PeerRole {
    return this._requestedRole;
  }

  constructor() {
    const params = parseInviteLink(this.document.location?.hash ?? '');
    if (!params?.overlay) return;
    this._requestedRole = params.role ?? PeerRole.Guest;
    this.activate();
  }

  activate(): void {
    if (this._active()) return;
    this._active.set(true);
    this.document.body.classList.add(OVERLAY_BODY_CLASS);
  }
}
