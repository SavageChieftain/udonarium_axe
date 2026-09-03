import { parseImportedCharacterText } from '@axe/domain/character/import/character-import-format';
import { createEmptyImportedCharacter } from '@axe/domain/character/import/imported-character';
import { ImportedCharacterFactory } from '@axe/domain/character/import/imported-character-factory';
import { buildCoc6CharasheetCharacter } from '@axe/domain/character/import/system-profiles/coc6-charasheet-profile';
import { buildCoc7CharasheetCharacter } from '@axe/domain/character/import/system-profiles/coc7-charasheet-profile';
import { buildDx3AppspotCharacter } from '@axe/domain/character/import/system-profiles/dx3-appspot-profile';
import { loadLabelMaps } from '@axe/domain/character/import/system-profiles/label-maps';
import { buildShinobigamiAppspotCharacter } from '@axe/domain/character/import/system-profiles/shinobigami-appspot-profile';
import { buildYtsheetSw25Character } from '@axe/domain/character/import/system-profiles/ytsheet-sw25-profile';
import { DataElementFieldType, DataElementRole, DataElementType } from '@axe/domain/data/data-element';

describe('ImportedCharacterFactory', () => {
  beforeAll(() => loadLabelMaps());

  beforeEach(() => {});

  function buildFromCcfolia(data: Record<string, unknown>) {
    const imported = parseImportedCharacterText(JSON.stringify({ kind: 'character', data }))!;
    return ImportedCharacterFactory.create(imported, 'image-id');
  }

  it('takes the name, the size and the picture', () => {
    const character = buildFromCcfolia({ name: '勇者', width: 2, height: 2 });
    expect(character.name).toBe('勇者');
    expect(character.size).toBe(2);
    expect(character.imageDataElement!.getFirstElementByName('imageIdentifier')!.value).toBe('image-id');
  });

  it('falls back to a name when it is given none', () => {
    const character = ImportedCharacterFactory.create(createEmptyImportedCharacter('ccfolia'), '');
    expect(character.name).toBe('インポートキャラクター');
    expect(character.size).toBe(1);
  });

  it('builds each status as a resource with a current value and a maximum', () => {
    const character = buildFromCcfolia({ name: 'X', status: [{ label: 'HP', value: 7, max: 12 }] });
    const resource = character.detailDataElement!.getFirstElementByName('リソース');
    expect(resource?.fieldRole).toBe(DataElementRole.SECTION);

    const hp = character.detailDataElement!.getFirstElementByName('HP')!;
    expect(hp.fieldRole).toBe(DataElementRole.FIELD);
    expect(hp.type).toBe(DataElementType.NUMBER_RESOURCE);
    expect(hp.value).toBe(12);
    expect(hp.currentValue).toBe('7');
  });

  it('builds each parameter as a number or a text field', () => {
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

  it('takes the notes, the address and the initiative', () => {
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

  it('takes the palette commands and resolves the references in them', () => {
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

  it('gives a repeated label an element name of its own', () => {
    const character = buildFromCcfolia({
      name: 'X',
      status: [{ label: '値', value: 1, max: 1 }],
      params: [{ label: '値', value: '2' }],
    });
    expect(character.detailDataElement!.getFirstElementByName('値')).toBeTruthy();
    expect(character.detailDataElement!.getFirstElementByName('値_2')).toBeTruthy();
  });

  it('resolves the dice bot and the references to the abilities, sanity and skills of one system from the archive', () => {
    const imported = buildCoc6CharasheetCharacter({
      pc_name: '探索者',
      game: 'coc',
      NA1: 11,
      NA9: 12,
      NA10: 8,
      SAN_Max: 99,
      SAN_Left: '80',
      TBAD: ['34', '25', '25', '50'],
      TBAP: ['74', '25', '25', '60'],
    })!;
    const character = ImportedCharacterFactory.create(imported, '');
    const palette = character.chatPalette!;
    const detail = character.detailDataElement!;

    expect(palette.dicebot).toBe('Cthulhu');
    expect(palette.evaluate('CCB<={STR}*5', detail)).toBe('CCB<=11*5');
    expect(palette.evaluate('CCB<={正気度}', detail)).toBe('CCB<=80');
    expect(palette.evaluate('CCB<={回避}', detail)).toBe('CCB<=74');
    expect(palette.evaluate('CCB<={こぶし(パンチ)}', detail)).toBe('CCB<=60');
  });

  it('resolves them for its later edition, whose abilities are not multiplied', () => {
    const imported = buildCoc7CharasheetCharacter({
      pc_name: '探索者',
      game: 'coc7',
      NA1: 65,
      NA10: 16,
      NA11: 15,
      SAN_Max: 99,
      SAN_Left: '61',
      Luck_Left: '39',
      Luck_start: '39',
      SKAN: ['目星'],
      SKAP: ['50'],
      SKTP: ['1'],
    })!;
    const character = ImportedCharacterFactory.create(imported, '');
    const palette = character.chatPalette!;
    const detail = character.detailDataElement!;

    expect(palette.dicebot).toBe('Cthulhu7th');
    expect(palette.evaluate('CC<={STR}', detail)).toBe('CC<=65');
    expect(palette.evaluate('CC<={正気度}', detail)).toBe('CC<=61');
    expect(palette.evaluate('CC<={幸運}', detail)).toBe('CC<=39');
    expect(palette.evaluate('CC<={目星}', detail)).toBe('CC<=50');
  });

  it('resolves the dice bot and the ability and skill references of one system from the warehouse', () => {
    const imported = buildDx3AppspotCharacter({
      base: { name: 'DX' },
      baseAbility: { body: { total: '5' }, sense: { total: '2' } },
      subAbility: { hp: { total: '31' }, erotion: { total: '30' } },
      skills: { hak: { A: { lv: '2' } } },
    })!;
    const character = ImportedCharacterFactory.create(imported, '');
    const palette = character.chatPalette!;
    const detail = character.detailDataElement!;

    expect(palette.dicebot).toBe('DoubleCross');
    expect(palette.evaluate('{肉体}DX', detail)).toBe('5DX');
    expect(palette.evaluate('{肉体}DX+2', detail)).toBe('5DX+2');
  });

  it('adds the skill table of one system to the sheet as a table', () => {
    const imported = buildShinobigamiAppspotCharacter({
      base: { name: '忍' },
      ninpou: [{ name: '接近戦攻撃', targetSkill: '掘削術' }],
      learned: [{ id: 'skills.row10.name0' }],
      skills: { a: '1' },
    })!;
    const character = ImportedCharacterFactory.create(imported, '');
    const table = character.detailDataElement!.getFirstElementByName('特技表')!;
    expect(table).toBeTruthy();
    expect(table.fieldRole).toBe(DataElementRole.SECTION);
    const gapRow = table.getFirstElementByName('ギャップ');
    expect(gapRow).toBeTruthy();
  });

  it('resolves the dice bot and the ability bonuses of one system from the sheet service', () => {
    const imported = buildYtsheetSw25Character({
      characterName: 'SW',
      sttStr: 20,
      bonusStr: 6,
      sttDex: 18,
      bonusDex: 5,
      hpTotal: 60,
      mpTotal: 20,
    })!;
    const character = ImportedCharacterFactory.create(imported, '');
    const palette = character.chatPalette!;
    const detail = character.detailDataElement!;

    expect(palette.dicebot).toBe('SwordWorld2.5');
    expect(palette.evaluate('2d6+{筋力B}', detail)).toBe('2d6+6');
    expect(palette.evaluate('2d6+{器用B}', detail)).toBe('2d6+5');
  });

  it('puts a colour, where one is given, at the head of the palette', () => {
    const character = buildFromCcfolia({ name: 'X', color: '#123456' });
    expect(character.chatColorCode[0]).toBe('#123456');
  });

  it('spreads the systems own data into sections, groups and fields on the sheet', () => {
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
