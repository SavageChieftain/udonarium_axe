import { DestroyRef, inject, Injectable } from '@angular/core';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { AudioStorage } from '@axe/core/storage/audio-storage';
import { ObjectStore } from '@axe/core/sync/object-store';
import { ChatMessage } from '@axe/domain/chat/chat-message';
import { CutIn } from '@axe/domain/media/cut-in';
import { CutInLauncher } from '@axe/domain/media/cut-in-launcher';
import { Jukebox } from '@axe/domain/media/jukebox';

const CHAT_TAIL_PATTERN = /\s(@?)(\S+)$/i;

/**
 * チャットメッセージ末尾の `@? 名前` パターンを解析し、合致する CutIn を発火するサービス。
 * - 正規表現マッチによる名前抽出（application 寄りの orchestration）
 * - 無タグかつ音声付き CutIn の場合、Jukebox を停止する副作用
 * - 名前一致した CutIn を `CutInLauncher.startCutIn` / `startSoundOnlyCutIn` にディスパッチ
 *
 * domain ({@link CutInLauncher}) は状態同期 (startCutIn/stopCutIn) に専念させ、
 * 「いつ」「どの条件で」発火するかは本サービスが担う。
 * `providedIn: 'root'` + `AppComponent` の `inject()` で eager 起動する。
 */
@Injectable({ providedIn: 'root' })
export class CutInService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly objectStore = inject(ObjectStore);
  private readonly audioStorage = inject(AudioStorage);

  constructor() {
    this.objectChange.messageAdded$.subscribe((event) => {
      const message = this.objectStore.get<ChatMessage>(event.messageIdentifier);
      if (!message || message.tags.includes('secret')) return;
      this.activateFromChatText(message.text, message.to ?? '');
    }, this.destroyRef);
  }

  /**
   * チャットテキスト末尾の `@? 名前` を検出し、該当する CutIn を発火する。
   * - `@名前` の場合: 音声のみカットイン（パネル不可視で音声再生）
   * - `名前` の場合: 通常カットイン。タグ無しかつ BGM 音源が登録済みなら Jukebox を停止する
   */
  activateFromChatText(text: string, sendTo: string): void {
    const matches = ` ${text}`.match(CHAT_TAIL_PATTERN);
    if (!matches) return;

    const isSoundOnly = matches[1] === '@';
    const activateName = matches[2];

    const launcher = this.objectStore.get<CutInLauncher>('CutInLauncher');
    if (!launcher) return;

    const target = this.objectStore.getObjects(CutIn).find((c) => c.chatActivate && c.name === activateName);
    if (!target) return;

    if (isSoundOnly) {
      launcher.startSoundOnlyCutIn(target, sendTo);
    } else {
      if (this.isCutInBgmUploaded(target.audioIdentifier) && target.tagName === '') {
        this.objectStore.get<Jukebox>('Jukebox')?.stop();
      }
      launcher.startCutIn(target, sendTo);
    }
  }

  /** CutIn が指定する audio identifier が AudioStorage に登録されているか。 */
  private isCutInBgmUploaded(audioIdentifier: string): boolean {
    return this.audioStorage.get(audioIdentifier) !== null;
  }
}
