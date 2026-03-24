import { EventSystem } from '@axe/core/index';
import { AudioFile } from '@axe/core/storage/audio-file';
import { AudioPlayer } from '@axe/core/storage/audio-player';
import { AudioStorage } from '@axe/core/storage/audio-storage';
import { SyncObject } from '@axe/core/sync/decorator';
import { GameObject } from '@axe/core/sync/game-object';
import { ObjectStore } from '@axe/core/sync/object-store';
import { ChatMessage } from '@axe/domain/chat/chat-message';

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
  // GameObject Lifecycle
  onStoreAdded() {
    super.onStoreAdded();
    EventSystem.register(this)
      .on<string>('SOUND_EFFECT', (event) => {
        AudioPlayer.play(AudioStorage.instance.get(event.data), 0.5);
      })
      .on('SEND_MESSAGE', (event) => {
        const chatMessage = ObjectStore.instance.get<ChatMessage>(event.data.messageIdentifier);
        if (!chatMessage || !chatMessage.isSendFromSelf || !chatMessage.isDicebot) return;
        if (Math.random() < 0.5) {
          SoundEffect.play(PresetSound.diceRoll1);
        } else {
          SoundEffect.play(PresetSound.diceRoll2);
        }
      });
  }

  // GameObject Lifecycle
  onStoreRemoved() {
    super.onStoreRemoved();
    EventSystem.unregister(this);
  }

  play(identifier: string): void;
  play(audio: AudioFile): void;
  play(arg: string | AudioFile): void {
    if (typeof arg === 'string') {
      SoundEffect.play(arg);
    } else {
      SoundEffect.play(arg);
    }
  }

  static play(identifier: string): void;
  static play(audio: AudioFile): void;
  static play(arg: string | AudioFile): void {
    let identifier: string;
    if (typeof arg === 'string') {
      identifier = arg;
    } else {
      identifier = arg.identifier;
    }
    SoundEffect._play(identifier);
  }

  private static _play(identifier: string) {
    EventSystem.call('SOUND_EFFECT', identifier);
  }
}
