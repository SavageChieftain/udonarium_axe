import {
  parseImportedCharacterJson,
  parseImportedCharacterText,
} from '@axe/domain/character/import/character-import-format';
import { loadLabelMaps } from '@axe/domain/character/import/system-profiles/label-maps';

describe('parseImportedCharacterText', () => {
  beforeAll(() => loadLabelMaps());

  it('turns a piece from the other tool into the model used here', () => {
    const json = JSON.stringify({
      kind: 'character',
      data: {
        name: '探索者A',
        memo: '一言メモ',
        initiative: 12,
        externalUrl: 'https://charasheet.example/1',
        color: '#1a2b3c',
        commands: 'CCB<={SAN} 正気度ロール',
        iconUrl: 'https://example.com/icon.png',
        width: 2,
        height: 3,
        status: [
          { label: 'HP', value: 8, max: 12 },
          { label: 'MP', value: 5, max: 10 },
        ],
        params: [
          { label: 'STR', value: '13' },
          { label: 'APP', value: '11' },
        ],
      },
    });

    const result = parseImportedCharacterText(json)!;
    expect(result.sourceFormat).toBe('ccfolia');
    expect(result.name).toBe('探索者A');
    expect(result.memo).toBe('一言メモ');
    expect(result.initiative).toBe(12);
    expect(result.externalUrl).toBe('https://charasheet.example/1');
    expect(result.color).toBe('#1a2b3c');
    expect(result.commands).toContain('正気度ロール');
    expect(result.iconUrl).toBe('https://example.com/icon.png');
    expect(result.size).toBe(3);
    expect(result.statuses).toEqual([
      { label: 'HP', value: 8, max: 12 },
      { label: 'MP', value: 5, max: 10 },
    ]);
    expect(result.params).toEqual([
      { label: 'STR', value: '13' },
      { label: 'APP', value: '11' },
    ]);
  });

  it('reads a missing current value as the maximum', () => {
    const json = JSON.stringify({ kind: 'character', data: { name: 'X', status: [{ label: 'HP', max: 20 }] } });
    const result = parseImportedCharacterText(json)!;
    expect(result.statuses[0]).toEqual({ label: 'HP', value: 20, max: 20 });
  });

  it('ignores a colour it cannot read', () => {
    const json = JSON.stringify({ kind: 'character', data: { name: 'X', color: 'red' } });
    expect(parseImportedCharacterText(json)!.color).toBe('');
  });

  it('takes the name, the colour, the picture and the current and maximum pairs from the sheet archive', () => {
    const json = JSON.stringify({
      pc_name: '保管所太郎',
      color: '#abcdef',
      base64Image: 'iVBORw0KGgo=',
      pc_making_environ: '作成メモ',
      NHP: 9,
      MHP: 13,
      NMP: 4,
      MMP: 8,
      NSAN: 55,
    });

    const result = parseImportedCharacterText(json)!;
    expect(result.sourceFormat).toBe('charasheet');
    expect(result.name).toBe('保管所太郎');
    expect(result.color).toBe('#abcdef');
    expect(result.iconUrl).toBe('data:image/png;base64,iVBORw0KGgo=');
    expect(result.memo).toBe('作成メモ');
    expect(result.statuses).toEqual([
      { label: 'HP', value: 9, max: 13 },
      { label: 'MP', value: 4, max: 8 },
    ]);
  });

  it('takes an inline picture as it is', () => {
    const json = JSON.stringify({ pc_name: 'X', base64Image: 'data:image/jpeg;base64,AAAA' });
    expect(parseImportedCharacterText(json)!.iconUrl).toBe('data:image/jpeg;base64,AAAA');
  });

  it('returns nothing for text it cannot read as json', () => {
    expect(parseImportedCharacterText('not json')).toBeNull();
    expect(parseImportedCharacterText('')).toBeNull();
  });

  it('returns nothing for a shape it does not know', () => {
    expect(parseImportedCharacterJson({ foo: 'bar' })).toBeNull();
  });
});
