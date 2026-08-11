import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { ChatMessageService } from '@axe/application/chat/chat-message.service';
import { decodeI18nMessage } from '@axe/application/i18n/i18n-message';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { OverlayModeService } from '@axe/application/ui/overlay-mode.service';
import type { ChatMessage } from '@axe/domain/chat/chat-message';
import type { ChatTab } from '@axe/domain/chat/chat-tab';
import { canRoleViewTab } from '@axe/domain/chat/chat-tab-permission';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { PeerRole } from '@axe/domain/peer/peer-role';
import {
  buildOverlayFeed,
  DEFAULT_OVERLAY_FEED_OPTIONS,
  type OverlaySource,
} from '@axe/features/streaming-overlay/streaming-overlay-feed';
import { turnIndicatorSignal } from '@axe/ui/turn/turn-indicator.signal';
import { TranslocoModule } from '@jsverse/transloco';

/** 古い行を落とすためだけの拍。卓が静かな間も、貼り付いたままにしない。 */
const TICK_MS = 10_000;

/**
 * 配信に重ねる画面。
 *
 * 盤面もパネルも出さず、直近のやり取りと手番だけを透過の背景に出す。
 *
 * 出す範囲は**狭いほうに倒す**。配信の画面は誰のものでもない場所に出るので、
 * 密談も、伏せたダイスも、入った役割に見えないタブも出さない。
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'streaming-overlay',
  templateUrl: './streaming-overlay.component.html',
  host: { class: 'pointer-events-none fixed inset-0 z-160 block' },
  imports: [TranslocoModule],
})
export class StreamingOverlayComponent {
  private readonly chat = inject(ChatMessageService);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly overlayMode = inject(OverlayModeService);
  private readonly t = inject(TRANSLATE_FN);

  private readonly tick = signal(0);

  protected readonly turn = turnIndicatorSignal();

  protected readonly feed = computed(() => {
    this.tick();
    this.objectChange.collectionOf('chat-tab')();
    if (PeerCursor.myCursor) this.objectChange.versionOf(PeerCursor.myCursor.identifier)();

    const role = this.viewerRole();
    const sources: OverlaySource[] = [];
    for (const tab of this.chat.chatTabs) {
      // 発言はタブの子として増える。タブの版を見ておかないと、増えても気づけない。
      this.objectChange.versionOf(tab.identifier)();
      if (tab.isSystemTab || !canRoleViewTab(tab, role)) continue;
      for (const message of recentOf(tab)) sources.push(this.sourceOf(message));
    }
    sources.sort((a, b) => a.order - b.order);
    return buildOverlayFeed(sources, this.chat.getTime());
  });

  constructor() {
    const timer = setInterval(() => this.tick.update((value) => value + 1), TICK_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  /**
   * 見せてよい範囲。
   *
   * 入室が終わるまで自分の役割は既定（PL）のままなので、リンクで頼んだ役割と
   * 狭いほうを採る。広いほうを採ると、入室の途中だけ見えてはいけないタブが映る。
   */
  private viewerRole(): PeerRole {
    const current = PeerCursor.myRole;
    const requested = this.overlayMode.requestedRole;
    if (current === PeerRole.Guest || requested === PeerRole.Guest) return PeerRole.Guest;
    if (current === PeerRole.Player || requested === PeerRole.Player) return PeerRole.Player;
    return PeerRole.GameMaster;
  }

  private sourceOf(message: ChatMessage): OverlaySource {
    return {
      identifier: message.identifier,
      name: decodeI18nMessage(message.name, this.t),
      text: decodeI18nMessage(message.text, this.t),
      timestamp: message.timestamp,
      order: message.index,
      color: message.messColor,
      isDice: message.isDicebot,
      isDirect: message.isDirect,
      isSecret: message.isSecret,
      isDisplayable: message.isDisplayable,
    };
  }
}

/** 出すのは最後の数件だけ。全部を写して並べ替えると、長い卓ほど無駄が増える。 */
function recentOf(tab: ChatTab): readonly ChatMessage[] {
  return tab.chatMessages.slice(-DEFAULT_OVERLAY_FEED_OPTIONS.limit);
}
