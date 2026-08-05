import { SyncObject } from '@axe/core/sync/decorator';
import { ObjectNode } from '@axe/core/sync/object-node';
import { InnerXml, ObjectSerializer } from '@axe/core/sync/object-serializer';
import { ObjectStore } from '@axe/core/sync/object-store';
import { EffectPreset } from '@axe/domain/effect/effect-preset';

/**
 * エフェクト集そのものの持ち出し・持ち込み。
 *
 * 部屋データ全体ではなく演出だけを配りたいときに使う入れ物で、
 * `ObjectStore` には残さない（書き出し・読み込みの間だけ存在する）。
 */
@SyncObject('effect-preset-set')
export class EffectPresetSet extends ObjectNode implements InnerXml {
  // GameObject Lifecycle
  override onStoreAdded() {
    super.onStoreAdded();
    ObjectStore.instance.remove(this);
  }

  override innerXml(): string {
    return EffectPreset.list()
      .map((preset) => preset.toXml())
      .join('');
  }

  /** 読み込みは足すだけ。今ある演出は消さず、同じ identifier のものだけ上書きになる。 */
  override parseInnerXml(element: Element) {
    for (const child of Array.from(element.children)) {
      ObjectSerializer.instance.parseXml(child);
    }
  }
}
