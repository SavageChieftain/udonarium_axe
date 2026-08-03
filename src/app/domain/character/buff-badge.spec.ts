import { buffIconOf, parseBuffStrength, toBuffBadges } from '@axe/domain/character/buff-badge';
import { DataElement, DataElementAttribute, DataElementType } from '@axe/domain/data/data-element';

describe('parseBuffStrength()', () => {
  it('効果欄から数値を取り出すこと', () => {
    expect(parseBuffStrength('防+1')).toBe('+1');
    expect(parseBuffStrength('ダメージ2')).toBe('2');
    expect(parseBuffStrength('攻撃力-3')).toBe('-3');
    expect(parseBuffStrength('移動0.5倍')).toBe('0.5');
  });

  it('全角マイナスも符号として扱うこと', () => {
    expect(parseBuffStrength('命中−2')).toBe('-2');
  });

  it('数値が無ければ空を返すこと', () => {
    expect(parseBuffStrength('麻痺')).toBe('');
    expect(parseBuffStrength('')).toBe('');
  });

  it('0 は強度として出さないこと', () => {
    expect(parseBuffStrength('0')).toBe('');
    expect(parseBuffStrength('効果+0')).toBe('');
  });
});

describe('toBuffBadges()', () => {
  const created: DataElement[] = [];

  function buff(name: string, effect: string, rounds: number, icon?: string): DataElement {
    const element = DataElement.create(name, rounds, {
      type: DataElementType.NUMBER_RESOURCE,
      currentValue: effect,
    });
    if (icon) element.setAttribute(DataElementAttribute.BUFF_ICON, icon);
    created.push(element);
    return element;
  }

  afterEach(() => {
    for (const element of created.splice(0)) element.destroy();
  });

  it('アイコン・強度・残ラウンドに畳むこと', () => {
    const root = DataElement.create('buff', '', {});
    created.push(root);
    const container = DataElement.create('バフ', '', {});
    created.push(container);
    root.appendChild(container);
    container.appendChild(buff('毒', 'ダメージ2', 3, '☠️'));
    container.appendChild(buff('加護', '防+1', 1));

    const badges = toBuffBadges(root);

    expect(badges).toHaveLength(2);
    expect(badges[0]).toMatchObject({ icon: '☠️', name: '毒', strength: '2', rounds: 3 });
    expect(badges[1]).toMatchObject({ name: '加護', strength: '+1', rounds: 1 });
  });

  it('アイコン未設定なら既定の印を使うこと', () => {
    const element = buff('加護', '防+1', 1);

    expect(buffIconOf(element)).not.toBe('');
    expect(buffIconOf(element)).toBe(buffIconOf(buff('別のバフ', '', 1)));
  });

  it('未設定なら空を返すこと', () => {
    expect(toBuffBadges(null)).toEqual([]);
  });
});
