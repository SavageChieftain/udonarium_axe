import { AudioFile } from '@axe/core/storage/audio-file';
import { AudioPlayer } from '@axe/core/storage/audio-player';
import { AudioStorage } from '@axe/core/storage/audio-storage';
import { SyncObject } from '@axe/core/sync/decorator';
import { GameObject } from '@axe/core/sync/game-object';
import { ObjectStore } from '@axe/core/sync/object-store';
import { ChatMessage } from '@axe/domain/chat/chat-message';
import { callSoundEffect, sendMessage$, soundEffect$ } from '@axe/domain/domain-events';

export class PresetSound {
  static dicePick: string = '';
  static dicePut: string = '';
  static diceRoll1: string = '';
  static diceRoll2: string = '';
  static cardDraw: string = '';
  static cardPick: string = '';
  static cardPut: string = '';
  static cardShuffle: string = '';
  static piecePick: string = '';
  static piecePut: string = '';
  static blockPick: string = '';
  static blockPut: string = '';
  static lock: string = '';
  static unlock: string = '';
  static sweep: string = '';
  static alarm: string = '';
}

@SyncObject('sound-effect')
export class SoundEffect extends GameObject {
  private cleanups: (() => void)[] = [];

  // GameObject Lifecycle
  override onStoreAdded() {
    super.onStoreAdded();
    this.cleanups.push(
      soundEffect$.subscribe((identifier) => {
        const audio = AudioStorage.instance.get(identifier);
        if (audio) AudioPlayer.play(audio, 0.5);
      })
    );
    this.cleanups.push(
      sendMessage$.subscribe((data) => {
        const chatMessage = ObjectStore.instance.get<ChatMessage>(data.messageIdentifier);
        if (!chatMessage || !chatMessage.isSendFromSelf || !chatMessage.isDicebot) return;
        if (Math.random() < 0.5) {
          SoundEffect.play(PresetSound.diceRoll1);
        } else {
          SoundEffect.play(PresetSound.diceRoll2);
        }
      })
    );
  }

  // GameObject Lifecycle
  override onStoreRemoved() {
    super.onStoreRemoved();
    this.cleanups.forEach((c) => c());
    this.cleanups = [];
  }

  play(arg: string | AudioFile): void {
    SoundEffect.play(arg);
  }

  static play(arg: string | AudioFile): void {
    const identifier = typeof arg === 'string' ? arg : arg.identifier;
    SoundEffect._play(identifier);
  }

  private static _play(identifier: string) {
    callSoundEffect(identifier);
  }
}
