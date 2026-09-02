import { ImageFile } from '@axe/core/storage/image-file';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { buffIconOf, buffIconUrlOf, parseBuffStrength, toBuffBadges } from '@axe/domain/character/buff-badge';
import { DataElement, DataElementAttribute, DataElementType } from '@axe/domain/data/data-element';

describe('parseBuffStrength()', () => {
  it('takes the number out of an effect', () => {
    expect(parseBuffStrength('防+1')).toBe('+1');
    expect(parseBuffStrength('ダメージ2')).toBe('2');
    expect(parseBuffStrength('攻撃力-3')).toBe('-3');
    expect(parseBuffStrength('移動0.5倍')).toBe('0.5');
  });

  it('reads a full-width minus as a sign', () => {
    expect(parseBuffStrength('命中−2')).toBe('-2');
  });

  it('returns nothing when there is no number', () => {
    expect(parseBuffStrength('麻痺')).toBe('');
    expect(parseBuffStrength('')).toBe('');
  });

  it('shows no strength for a zero', () => {
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

  it('folds a buff into its icon, its strength and the rounds left', () => {
    const root = DataElement.create('buff', '', {});
    created.push(root);
    const container = DataElement.create('バフ', '', {});
    created.push(container);
    root.appendChild(container);
    container.appendChild(buff('毒', 'ダメージ2', 3, '☠️'));
    container.appendChild(buff('加護', '防+1', 1));

    const badges = toBuffBadges(root);

    expect(badges).toHaveLength(2);
    expect(badges[0]).toMatchObject({ icon: '☠️', name: '毒', strength: '2', rounds: 3, iconUrl: '' });
    expect(badges[1]).toMatchObject({ name: '加護', strength: '+1', rounds: 1 });
  });

  it('marks the one that waits to be taken away as counting nothing down', () => {
    const root = DataElement.create('buff', '', {});
    created.push(root);
    const container = DataElement.create('バフ', '', {});
    created.push(container);
    root.appendChild(container);
    const held = buff('毒', '', 0);
    held.setAttribute(DataElementAttribute.BUFF_TIMING, 'none');
    container.appendChild(held);
    container.appendChild(buff('加護', '', 2));

    const badges = toBuffBadges(root);

    expect(badges.map((badge) => badge.expires)).toEqual([false, true]);
  });

  it('falls back to the default mark without an icon', () => {
    const element = buff('加護', '防+1', 1);

    expect(buffIconOf(element)).not.toBe('');
    expect(buffIconOf(element)).toBe(buffIconOf(buff('別のバフ', '', 1)));
  });

  it('returns nothing when it is unset', () => {
    expect(toBuffBadges(null)).toEqual([]);
  });
});

describe('buffIconUrlOf()', () => {
  afterEach(() => vi.restoreAllMocks());

  it('finds the picture an icon names', () => {
    vi.spyOn(ImageStorage.instance, 'get').mockImplementation((identifier: string) =>
      identifier === 'image-1' ? ({ identifier, url: 'blob:poison' } as ImageFile) : null
    );

    expect(buffIconUrlOf('image-1')).toBe('blob:poison');
  });

  it('leaves a mark as a mark, since no picture goes by that name', () => {
    vi.spyOn(ImageStorage.instance, 'get').mockReturnValue(null);

    expect(buffIconUrlOf('☠️')).toBe('');
    expect(buffIconUrlOf('')).toBe('');
  });
});
