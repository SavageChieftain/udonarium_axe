import {
  parseImportedCharacterJson,
  parseImportedCharacterText,
} from '@axe/domain/character/import/character-import-format';

describe('parseImportedCharacterText', () => {
  it('ココフォリアのコマJSONを正規化モデルへ変換する', () => {
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

  it('status.value 省略時は max を現在値とする', () => {
    const json = JSON.stringify({ kind: 'character', data: { name: 'X', status: [{ label: 'HP', max: 20 }] } });
    const result = parseImportedCharacterText(json)!;
    expect(result.statuses[0]).toEqual({ label: 'HP', value: 20, max: 20 });
  });

  it('不正な色は無視される', () => {
    const json = JSON.stringify({ kind: 'character', data: { name: 'X', color: 'red' } });
    expect(parseImportedCharacterText(json)!.color).toBe('');
  });

  it('キャラクター保管所JSONを名前・色・画像・現在/最大ペアで取り込む', () => {
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

  it('base64Image が data URI の場合はそのまま使う', () => {
    const json = JSON.stringify({ pc_name: 'X', base64Image: 'data:image/jpeg;base64,AAAA' });
    expect(parseImportedCharacterText(json)!.iconUrl).toBe('data:image/jpeg;base64,AAAA');
  });

  it('JSONとして不正なテキストは null', () => {
    expect(parseImportedCharacterText('not json')).toBeNull();
    expect(parseImportedCharacterText('')).toBeNull();
  });

  it('未知の形式のJSONは null', () => {
    expect(parseImportedCharacterJson({ foo: 'bar' })).toBeNull();
  });
});
