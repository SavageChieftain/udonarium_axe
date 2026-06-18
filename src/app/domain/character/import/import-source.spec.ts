import { detectImportFetchPlan } from '@axe/domain/character/import/import-source';

describe('detectImportFetchPlan', () => {
  it('URLでないテキストはJSONとして扱う', () => {
    expect(detectImportFetchPlan('{"kind":"character"}')).toEqual({ kind: 'json' });
    expect(detectImportFetchPlan('  not a url  ')).toEqual({ kind: 'json' });
  });

  it('キャラクター保管所のURLは {id}.js の直fetchプランになる', () => {
    const plan = detectImportFetchPlan('https://charasheet.vampire-blood.net/123456');
    expect(plan).toEqual({
      kind: 'fetch',
      service: 'charasheet',
      url: 'https://charasheet.vampire-blood.net/123456.js',
    });
  });

  it('保管所URLの .html 拡張子は除去される', () => {
    const plan = detectImportFetchPlan('https://charasheet.vampire-blood.net/coc/987.html');
    expect(plan).toEqual({
      kind: 'fetch',
      service: 'charasheet',
      url: 'https://charasheet.vampire-blood.net/987.js',
    });
  });

  it('キャラクターシート倉庫のURLはJSONPプランになる', () => {
    const plan = detectImportFetchPlan('https://character-sheets.appspot.com/dx3/edit.html?key=ABC123');
    expect(plan).toEqual({
      kind: 'jsonp',
      service: 'appspot',
      url: 'https://character-sheets.appspot.com/dx3/display?ajax=1&base64Image=1&key=ABC123',
      callbackParam: 'callback',
      system: 'dx3',
    });
  });

  it('倉庫URLにkeyが無ければ未対応', () => {
    const plan = detectImportFetchPlan('https://character-sheets.appspot.com/dx3/edit.html');
    expect(plan).toEqual({ kind: 'unsupported', service: 'unknown' });
  });

  it('CharaXivのURLはCharaXivとして未対応', () => {
    const plan = detectImportFetchPlan('https://charaxiv.app/c/abcdef');
    expect(plan).toEqual({ kind: 'unsupported', service: 'charaxiv' });
  });

  it('未知ドメインのURLは未対応', () => {
    expect(detectImportFetchPlan('https://example.com/foo')).toEqual({ kind: 'unsupported', service: 'unknown' });
  });
});
