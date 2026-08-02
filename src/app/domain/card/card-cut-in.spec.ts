import { Card } from '@axe/domain/card/card';
import { resolveFlipCutIn } from '@axe/domain/card/card-cut-in';
import { CutIn } from '@axe/domain/media/cut-in';

describe('resolveFlipCutIn()', () => {
  const created: { destroy(): void }[] = [];

  function card(name: string, cutInIdentifier = ''): Card {
    const object = Card.create(name, 'front.png', 'back.png');
    object.cutInIdentifier = cutInIdentifier;
    created.push(object);
    return object;
  }

  function cutIn(name: string): CutIn {
    const object = new CutIn();
    object.name = name;
    object.initialize();
    created.push(object);
    return object;
  }

  afterEach(() => {
    for (const object of created.splice(0)) object.destroy();
  });

  it('明示的に紐づけたカットインを返すこと', () => {
    const assigned = cutIn('別の演出');
    const other = cutIn('ドラゴン');

    expect(resolveFlipCutIn(card('ドラゴン', assigned.identifier), [other, assigned])).toBe(assigned);
  });

  it('紐づけが無ければカード名と同名のカットインを返すこと', () => {
    const dragon = cutIn('ドラゴン');

    expect(resolveFlipCutIn(card('ドラゴン'), [cutIn('魔道士'), dragon])).toBe(dragon);
  });

  it('紐づけ先が消えていたら名前で代用せず null を返すこと', () => {
    expect(resolveFlipCutIn(card('ドラゴン', 'missing'), [cutIn('ドラゴン')])).toBeNull();
  });

  it('同名のカットインが無ければ null を返すこと', () => {
    expect(resolveFlipCutIn(card('ドラゴン'), [cutIn('魔道士')])).toBeNull();
  });

  it('名前が空のカードでは何も返さないこと', () => {
    expect(resolveFlipCutIn(card('  '), [cutIn('  ')])).toBeNull();
  });
});
