import { AudioFile } from '@axe/core/storage/audio-file';
import { AudioStorage } from '@axe/core/storage/audio-storage';
import { SyncObject, SyncVar } from '@axe/core/sync/decorator';
import { ObjectNode } from '@axe/core/sync/object-node';
import { ObjectStore } from '@axe/core/sync/object-store';

@SyncObject('audio-tag')
export class AudioTag extends ObjectNode {
  @SyncVar() audioIdentifier: string = '';
  @SyncVar() tag: string = '';

  containsWords(words: string[]): boolean {
    return words.every((word) => this.tag.includes(word));
  }

  static searchAudios(searchWords: string[]): AudioFile[] {
    return ObjectStore.instance
      .getObjects<AudioTag>(AudioTag)
      .filter((tag) => tag.containsWords(searchWords))
      .map((tag) => AudioStorage.instance.get(tag.audioIdentifier))
      .filter((audio): audio is AudioFile => audio !== null);
  }

  static get(audioIdentifier: string): AudioTag {
    return ObjectStore.instance.get<AudioTag>(`audiotag_${audioIdentifier}`)!;
  }

  static create(audioIdentifier: string) {
    const object: AudioTag = new AudioTag(`audiotag_${audioIdentifier}`);

    object.audioIdentifier = audioIdentifier;

    object.initialize();
    return object;
  }

  override parseInnerXml(_element: Element) {
    let audioTag = AudioTag.get(this.audioIdentifier);
    if (!audioTag) audioTag = AudioTag.create(this.audioIdentifier);
    const context = audioTag.toContext();
    context.syncData = this.toContext().syncData;
    audioTag.apply(context);
    audioTag.update();
    this.destroy();
  }
}
