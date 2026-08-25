import { SyncObject, SyncVar } from '@axe/core/sync/decorator';
import { ObjectContext } from '@axe/core/sync/game-object';
import { ObjectNode } from '@axe/core/sync/object-node';
import { InnerXml } from '@axe/core/sync/object-serializer';
import { ObjectStore } from '@axe/core/sync/object-store';
import { Jukebox } from '@axe/domain/media/jukebox';

@SyncObject('config')
export class Config extends ObjectNode implements InnerXml {
  @SyncVar('_defaultDiceBot') private _defaultDiceBot: string = 'DiceBot';
  @SyncVar('_roomVolume') private _roomVolume: number = 1.0;
  @SyncVar('_systemAvatarIdentifier') private _systemAvatarIdentifier: string = '';
  @SyncVar('_systemDiceAvatarIdentifier') private _systemDiceAvatarIdentifier: string = '';
  @SyncVar('_hideSystemAvatar') private _hideSystemAvatar: string = '';
  @SyncVar('_showSpeakerAvatar') private _showSpeakerAvatar: string = '';

  get defaultDiceBot(): string {
    if (this._defaultDiceBot == '') {
      return 'DiceBot';
    }
    return this._defaultDiceBot;
  }
  set defaultDiceBot(dice: string) {
    this._defaultDiceBot = dice;
  }

  get roomVolume(): number {
    return this._roomVolume;
  }
  set roomVolume(volume: number) {
    this._roomVolume = volume;
  }

  get systemAvatarIdentifier(): string {
    return this._systemAvatarIdentifier;
  }
  set systemAvatarIdentifier(identifier: string) {
    this._systemAvatarIdentifier = identifier;
  }

  get systemDiceAvatarIdentifier(): string {
    return this._systemDiceAvatarIdentifier;
  }
  set systemDiceAvatarIdentifier(identifier: string) {
    this._systemDiceAvatarIdentifier = identifier;
  }

  get isSystemAvatarVisible(): boolean {
    return this._hideSystemAvatar !== '1';
  }
  set isSystemAvatarVisible(visible: boolean) {
    this._hideSystemAvatar = visible ? '' : '1';
  }

  get isSpeakerAvatarVisible(): boolean {
    return this._showSpeakerAvatar === '1';
  }
  set isSpeakerAvatarVisible(visible: boolean) {
    this._showSpeakerAvatar = visible ? '1' : '';
  }

  // The jukebox keeps the settings of the person listening.
  // The master volume lives here because the shared settings are saved together.
  get jukebox(): Jukebox {
    return ObjectStore.instance.get<Jukebox>('Jukebox')!;
  }

  private static _instance: Config;
  static get instance(): Config {
    const stored = ObjectStore.instance.get<Config>('Config');
    if (stored) return (Config._instance = stored);
    if (!Config._instance) Config._instance = new Config('Config');
    Config._instance.initialize();
    return Config._instance;
  }

  override parseInnerXml(element: Element) {
    const context = Config.instance.toContext();
    context.syncData = this.toContext().syncData;
    Config.instance.apply(context);
    Config.instance.update();

    super.parseInnerXml.apply(Config.instance, [element]);
    this.destroy();
  }

  override apply(context: ObjectContext) {
    const _roomVolume = this._roomVolume;
    const _defaultDiceBot = this._defaultDiceBot;
    super.apply(context);
    if (_roomVolume !== this._roomVolume) {
      this.jukebox.setNewVolume();
    }
  }
}
