import { SyncObject, SyncVar } from '@axe/core/sync/decorator';
import { ObjectContext } from '@axe/core/sync/game-object';
import { ObjectNode } from '@axe/core/sync/object-node';
import { InnerXml } from '@axe/core/sync/object-serializer';
import { ObjectStore } from '@axe/core/sync/object-store';
import { Jukebox } from '@axe/domain/media/Jukebox';

@SyncObject('config')
export class Config extends ObjectNode implements InnerXml {
  @SyncVar() _defaultDiceBot: string = 'DiceBot';
  @SyncVar() _roomVolume: number = 1.0;
  @SyncVar() _roomGridDispAlways: boolean = false;

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
  // ジュークボックスの個人用設定はjukebox側
  // 共通設定保存の都合でのため全体ボリュームはこちらにある
  get jukebox(): Jukebox {
    return ObjectStore.instance.get<Jukebox>('Jukebox')!;
  }

  get roomGridDispAlways(): boolean {
    return this._roomGridDispAlways;
  }
  set roomGridDispAlways(roomGridDispAlways: boolean) {
    this._roomGridDispAlways = roomGridDispAlways;
  }

  private static _instance: Config;
  static get instance(): Config {
    if (!Config._instance) {
      Config._instance = new Config('Config');
      Config._instance.initialize();
    }
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
