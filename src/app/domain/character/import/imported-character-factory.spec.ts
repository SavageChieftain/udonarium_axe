import { ObjectStore } from '@axe/core/sync/object-store';
import { parseImportedCharacterText } from '@axe/domain/character/import/character-import-format';
import { createEmptyImportedCharacter } from '@axe/domain/character/import/imported-character';
import { ImportedCharacterFactory } from '@axe/domain/character/import/imported-character-factory';
import { DataElementFieldType, DataElementRole, DataElementType } from '@axe/domain/data/data-element';

describe('ImportedCharacterFactory', () => {
  let store: ObjectStore;

  beforeEach(() => {
    store = ObjectStore.instance;
  });

  afterEach(() => {
    store.getObjects().forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
  });

  function buildFromCcfolia(data: Record<string, unknown>) {
    const imported = parseImportedCharacterText(JSON.stringify({ kind: 'character', data }))!;
    return ImportedCharacterFactory.create(imported, 'image-id');
  }

  it('名前・サイズ・画像が反映される', () => {
    const character = buildFromCcfolia({ name: '勇者', width: 2, height: 2 });
    expect(character.name).toBe('勇者');
    expect(character.size).toBe(2);
    expect(character.imageDataElement!.getFirstElementByName('imageIdentifier')!.value).toBe('image-id');
  });

  it('名前が空ならフォールバック名になる', () => {
    const character = ImportedCharacterFactory.create(createEmptyImportedCharacter('ccfolia'), '');
    expect(character.name).toBe('インポートキャラクター');
    expect(character.size).toBe(1);
  });

  it('status がリソース要素 (現在/最大) として作られる', () => {
    const character = buildFromCcfolia({ name: 'X', status: [{ label: 'HP', value: 7, max: 12 }] });
    const resource = character.detailDataElement!.getFirstElementByName('リソース');
    expect(resource?.fieldRole).toBe(DataElementRole.SECTION);

    const hp = character.detailDataElement!.getFirstElementByName('HP')!;
    expect(hp.fieldRole).toBe(DataElementRole.FIELD);
    expect(hp.type).toBe(DataElementType.NUMBER_RESOURCE);
    expect(hp.value).toBe(12);
    expect(hp.currentValue).toBe('7');
  });

  it('params が数値/テキストフィールドとして作られる', () => {
    const character = buildFromCcfolia({
      name: 'X',
      params: [
        { label: 'STR', value: '13' },
        { label: '職業', value: '探偵' },
      ],
    });
    const str = character.detailDataElement!.getFirstElementByName('STR')!;
    expect(str.fieldType).toBe(DataElementFieldType.NUMBER);
    expect(str.value).toBe(13);

    const job = character.detailDataElement!.getFirstElementByName('職業')!;
    expect(job.fieldType).toBe(DataElementFieldType.TEXT);
    expect(job.value).toBe('探偵');
  });

  it('memo / externalUrl / initiative が取り込まれる', () => {
    const character = buildFromCcfolia({
      name: 'X',
      memo: '長文メモ',
      externalUrl: 'https://example.com/s',
      initiative: 9,
    });
    const memo = character.detailDataElement!.getFirstElementByName('メモ')!;
    expect(memo.fieldType).toBe(DataElementFieldType.LONG_TEXT);
    expect(memo.value).toBe('長文メモ');

    const ref = character.detailDataElement!.getFirstElementByName('参照元')!;
    expect(ref.value).toBe('https://example.com/s');

    const initiative = character.detailDataElement!.getFirstElementByName('イニシアチブ')!;
    expect(initiative.value).toBe(9);
  });

  it('チャットパレットの commands が反映され {ラベル} 参照が解決できる', () => {
    const character = buildFromCcfolia({
      name: 'X',
      status: [{ label: 'HP', value: 7, max: 12 }],
      params: [{ label: 'STR', value: '13' }],
      commands: '1d100<={STR} 筋力ロール\n:HP-1',
    });
    const palette = character.chatPalette!;
    expect(palette.getPalette().join('\n')).toContain('筋力ロール');
    expect(palette.evaluate('1d100<={STR}', character.detailDataElement!)).toBe('1d100<=13');
    expect(palette.evaluate('{HP}/{HP^}', character.detailDataElement!)).toBe('7/12');
  });

  it('重複ラベルは一意な要素名へ退避される', () => {
    const character = buildFromCcfolia({
      name: 'X',
      status: [{ label: '値', value: 1, max: 1 }],
      params: [{ label: '値', value: '2' }],
    });
    expect(character.detailDataElement!.getFirstElementByName('値')).toBeTruthy();
    expect(character.detailDataElement!.getFirstElementByName('値_2')).toBeTruthy();
  });

  it('色指定があれば chatColorCode の先頭に入る', () => {
    const character = buildFromCcfolia({ name: 'X', color: '#123456' });
    expect(character.chatColorCode[0]).toBe('#123456');
  });

  it('sections（システム固有データ）が section > group > field として detail へ展開される', () => {
    const imported = createEmptyImportedCharacter('appspot');
    imported.name = 'テスト';
    imported.sections = [
      {
        label: 'コンボ',
        groups: [
          {
            label: 'ルートキット',
            fields: [
              { label: 'attack', value: 11, kind: 'number' },
              { label: 'notes', value: '長い説明テキスト'.repeat(5), kind: 'note' },
            ],
          },
        ],
      },
    ];
    const character = ImportedCharacterFactory.create(imported, '');

    const combo = character.detailDataElement!.getFirstElementByName('コンボ')!;
    expect(combo.fieldRole).toBe(DataElementRole.SECTION);
    const group = combo.getFirstElementByName('ルートキット')!;
    expect(group.fieldRole).toBe(DataElementRole.GROUP);
    expect(group.getFirstElementByName('attack')!.fieldType).toBe(DataElementFieldType.NUMBER);
    expect(group.getFirstElementByName('attack')!.value).toBe(11);
    expect(group.getFirstElementByName('notes')!.fieldType).toBe(DataElementFieldType.LONG_TEXT);
  });
});
