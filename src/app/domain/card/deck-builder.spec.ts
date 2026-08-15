import { ImageFile } from '@axe/core/storage/image-file';
import { copyDetailSchema, toDeckCardSources } from '@axe/domain/card/deck-builder';
import { DataElement } from '@axe/domain/data/data-element';

function image(identifier: string, name: string): ImageFile {
  const file = ImageFile.createEmpty(identifier);
  file.context.name = name;
  return file;
}

describe('toDeckCardSources()', () => {
  it('makes one card of each picture, named after it without the extension', () => {
    const sources = toDeckCardSources([image('a', 'ドラゴン.png'), image('b', '魔法陣.webp')], 'カード');

    expect(sources).toEqual([
      { identifier: 'a', name: 'ドラゴン' },
      { identifier: 'b', name: '魔法陣' },
    ]);
  });

  it('falls back to a default name for a picture with none', () => {
    expect(toDeckCardSources([image('a', '')], 'カード')[0].name).toBe('カード');
  });

  it('leaves out a picture with no identifier', () => {
    expect(toDeckCardSources([image('', 'x.png')], 'カード')).toEqual([]);
  });
});

describe('copyDetailSchema()', () => {
  function detailWith(names: string[]): DataElement {
    const root = DataElement.create('detail', '', {}, `detail_${names.join('-')}_${Math.random()}`);
    for (const name of names) root.appendChild(DataElement.create(name, '', {}, `${name}_${Math.random()}`));
    return root;
  }

  it('copies only the fields the card does not already have', () => {
    const from = detailWith(['能力', '効果']);
    const to = detailWith(['能力']);

    const added = copyDetailSchema(from, to);

    expect(added.map((element) => element.name)).toEqual(['効果']);
    expect(to.children.map((child) => (child as DataElement).name)).toEqual(['能力', '効果']);
  });

  it('adds nothing when it has them all', () => {
    const from = detailWith(['能力']);
    const to = detailWith(['能力']);

    expect(copyDetailSchema(from, to)).toEqual([]);
  });

  it('does nothing without a sample or a card', () => {
    expect(copyDetailSchema(null, detailWith(['能力']))).toEqual([]);
    expect(copyDetailSchema(detailWith(['能力']), null)).toEqual([]);
  });
});
