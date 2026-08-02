import { ImageFile } from '@axe/core/storage/image-file';
import { copyDetailSchema, toDeckCardSources } from '@axe/domain/card/deck-builder';
import { DataElement } from '@axe/domain/data/data-element';

function image(identifier: string, name: string): ImageFile {
  const file = ImageFile.createEmpty(identifier);
  file.context.name = name;
  return file;
}

describe('toDeckCardSources()', () => {
  it('画像 1 枚をカード 1 枚にし、拡張子を落とした名前を付けること', () => {
    const sources = toDeckCardSources([image('a', 'ドラゴン.png'), image('b', '魔法陣.webp')], 'カード');

    expect(sources).toEqual([
      { identifier: 'a', name: 'ドラゴン' },
      { identifier: 'b', name: '魔法陣' },
    ]);
  });

  it('名前が無い画像には既定の名前を使うこと', () => {
    expect(toDeckCardSources([image('a', '')], 'カード')[0].name).toBe('カード');
  });

  it('識別子の無い画像は除くこと', () => {
    expect(toDeckCardSources([image('', 'x.png')], 'カード')).toEqual([]);
  });
});

describe('copyDetailSchema()', () => {
  function detailWith(names: string[]): DataElement {
    const root = DataElement.create('detail', '', {}, `detail_${names.join('-')}_${Math.random()}`);
    for (const name of names) root.appendChild(DataElement.create(name, '', {}, `${name}_${Math.random()}`));
    return root;
  }

  it('見本に無い項目だけを複製すること', () => {
    const from = detailWith(['能力', '効果']);
    const to = detailWith(['能力']);

    const added = copyDetailSchema(from, to);

    expect(added.map((element) => element.name)).toEqual(['効果']);
    expect(to.children.map((child) => (child as DataElement).name)).toEqual(['能力', '効果']);
  });

  it('同じ項目しか無ければ何も足さないこと', () => {
    const from = detailWith(['能力']);
    const to = detailWith(['能力']);

    expect(copyDetailSchema(from, to)).toEqual([]);
  });

  it('見本か対象が無ければ何もしないこと', () => {
    expect(copyDetailSchema(null, detailWith(['能力']))).toEqual([]);
    expect(copyDetailSchema(detailWith(['能力']), null)).toEqual([]);
  });
});
