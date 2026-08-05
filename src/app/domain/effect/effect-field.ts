import { SyncObject, SyncVar } from '@axe/core/sync/decorator';
import { ObjectStore } from '@axe/core/sync/object-store';
import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';

/**
 * 盤面に置きっぱなしにする演出。毒沼や炎の壁のように、その場に残り続ける場。
 *
 * 中身は普通のプリセットで、再生位置を尺で折り返して繰り返すだけ。
 * 発動と同じ絵をそのまま使えるので、場のためだけの演出を作らずに済む。
 */
@SyncObject('effect-field')
export class EffectField extends TabletopObject {
  @SyncVar() presetIdentifier: string = '';
  /** コマの大きさと同じ扱いの一辺(マス)。演出の大きさは倍率で決まる。 */
  @SyncVar() size: number = 1;

  static list(): EffectField[] {
    return ObjectStore.instance.getObjects<EffectField>(EffectField);
  }

  /**
   * 繰り返しの位相ずらし(ms)。
   * 同じ演出を並べたときに全部が同じ動きをすると、貼り絵に見える。
   */
  get phaseOffset(): number {
    let hash = 0;
    for (let index = 0; index < this.identifier.length; index++) {
      hash = (hash * 31 + this.identifier.charCodeAt(index)) % 100000;
    }
    return hash;
  }
}
