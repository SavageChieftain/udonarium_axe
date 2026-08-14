import { inject, Injectable, signal } from '@angular/core';
import { ObjectStore } from '@axe/core/sync/object-store';
import { ChatTab } from '@axe/domain/chat/chat-tab';

/**
 * いま見ているチャットのタブ。
 *
 * 卓の上で振った結果は、卓から見ればどのタブの出来事でもない。それでも
 * 読み手は自分が開いているタブを見ているので、結果はそこへ出す。
 */
@Injectable({ providedIn: 'root' })
export class ActiveChatTabService {
  private readonly objectStore = inject(ObjectStore);
  private readonly identifier = signal('');

  /** チャット窓がタブを切り替えるたびに伝えてくる。 */
  set(identifier: string): void {
    this.identifier.set(identifier);
  }

  /**
   * 見ているタブ。まだ窓を開いていない、あるいはそのタブが消えたなら null。
   *
   * 行き先が無いことを黙って別のタブで埋めない。呼び出し側が、そのとき何が
   * ふさわしいかを決める。
   */
  current(): ChatTab | null {
    const tab = this.objectStore.get<ChatTab>(this.identifier());
    return tab instanceof ChatTab ? tab : null;
  }
}
