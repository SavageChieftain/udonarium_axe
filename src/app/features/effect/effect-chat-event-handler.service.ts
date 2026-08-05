import { DestroyRef, inject, Injectable } from '@angular/core';
import { EffectCastService } from '@axe/application/effect/effect-cast.service';
import { EffectLibraryService } from '@axe/application/effect/effect-library.service';
import { resourceEditMessage$ } from '@axe/core/event/domain-events';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { ChatMessage, ChatMessageTargetContext } from '@axe/domain/chat/chat-message';
import { parseEffectChatToken } from '@axe/domain/effect/effect-chat-token';
import { EffectPreset } from '@axe/domain/effect/effect-preset';

/**
 * チャット本文の演出トークン（`《爆炎》`）で演出を出す。
 *
 * 送った本人だけが発火する。`EffectCastService.fire()` が全員へ配るので、
 * 受け取った側でも走らせると人数ぶん重なってしまう。
 *
 * 対象はリソース操作（`t:HP-10`）と同じものを使う。1 行で「ダイス → ダメージ → 演出」が揃う。
 */
@Injectable({ providedIn: 'root' })
export class EffectChatEventHandlerService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly objectStore = inject(ObjectStore);
  private readonly library = inject(EffectLibraryService);
  private readonly castService = inject(EffectCastService);

  constructor() {
    resourceEditMessage$.subscribe((event) => {
      const message = this.objectStore.get<ChatMessage>(event.messageIdentifier);
      if (!(message instanceof ChatMessage) || !message.isSendFromSelf || message.isSystem) return;

      const token = parseEffectChatToken(message.text);
      if (!token) return;

      const preset = this.library.findByName(token.name);
      if (!preset) return;

      const targets = this.resolveTargets(preset, event.messageTargetContext);
      if (targets.length < 1) return;

      this.castService.fire(preset, targets, this.casterOf(message));
    }, this.destroyRef);
  }

  private resolveTargets(preset: EffectPreset, context: unknown[] | null): GameCharacter[] {
    const targeted = (context ?? [])
      .map((entry) => (entry as ChatMessageTargetContext).object)
      .filter((object): object is GameCharacter => object instanceof GameCharacter);

    const targets = targeted.length > 0 ? targeted : this.castService.candidateTargets();
    return targets.slice(0, preset.targetLimit);
  }

  /** 喋ったコマを撃ち手にする。選択中のコマではなく、その行の発言者が撃つ。 */
  private casterOf(message: ChatMessage): GameCharacter | null {
    const character = this.objectStore.get<GameCharacter>(message.sendFrom);
    return character instanceof GameCharacter ? character : null;
  }
}
