import { DestroyRef, inject, Injectable } from '@angular/core';
import { ChatPreferencesService } from '@axe/application/chat/chat-preferences.service';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { AudioPlayer } from '@axe/core/storage/audio-player';
import { AudioStorage } from '@axe/core/storage/audio-storage';
import { ObjectStore } from '@axe/core/sync/object-store';
import { ChatMessage } from '@axe/domain/chat/chat-message';
import { chatSoundOf, ChatSoundType } from '@axe/domain/chat/chat-sound';
import { ChatTab } from '@axe/domain/chat/chat-tab';

/**
 * Sounds a note when somebody speaks.
 *
 * Only what other people say is heard: a reader knows their own line has gone. What the room
 * says of itself - a roll, a notice - is left to the sounds those already carry.
 */
@Injectable({ providedIn: 'root' })
export class ChatSoundEventHandlerService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly objectStore = inject(ObjectStore);
  private readonly audioStorage = inject(AudioStorage);
  private readonly preferences = inject(ChatPreferencesService);

  constructor() {
    this.objectChange.messageAdded$.subscribe((event) => {
      const message = this.objectStore.get<ChatMessage>(event.messageIdentifier);
      if (!message || message.isSendFromSelf || message.isSystem) return;

      const tab = this.objectStore.get<ChatTab>(event.tabIdentifier);
      const setting = this.preferences.soundOfTab(tab?.name ?? '');
      if (!setting.enabled) return;

      this.play(chatSoundOf(setting.type, message.text), setting.volume);
    }, this.destroyRef);
  }

  /** Plays what a type sounds like, for someone setting it up. */
  preview(type: ChatSoundType, volume: number): void {
    this.play(chatSoundOf(type, ''), volume);
  }

  private play(identifier: string, volume: number): void {
    if (identifier.length < 1 || volume <= 0) return;
    const audio = this.audioStorage.get(identifier);
    if (audio) AudioPlayer.play(audio, volume);
  }
}
