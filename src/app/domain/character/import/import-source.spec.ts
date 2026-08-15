import { detectImportFetchPlan } from '@axe/domain/character/import/import-source';

describe('detectImportFetchPlan', () => {
  it('reads anything that is not an address as json', () => {
    expect(detectImportFetchPlan('{"kind":"character"}')).toEqual({ kind: 'json' });
    expect(detectImportFetchPlan('  not a url  ')).toEqual({ kind: 'json' });
  });

  it('fetches an archive address directly as a script', () => {
    const plan = detectImportFetchPlan('https://charasheet.vampire-blood.net/123456');
    expect(plan).toEqual({
      kind: 'fetch',
      service: 'charasheet',
      url: 'https://charasheet.vampire-blood.net/123456.js',
    });
  });

  it('drops the page extension from it', () => {
    const plan = detectImportFetchPlan('https://charasheet.vampire-blood.net/coc/987.html');
    expect(plan).toEqual({
      kind: 'fetch',
      service: 'charasheet',
      url: 'https://charasheet.vampire-blood.net/987.js',
    });
  });

  it('fetches a warehouse address through a callback', () => {
    const plan = detectImportFetchPlan('https://character-sheets.appspot.com/dx3/edit.html?key=ABC123');
    expect(plan).toEqual({
      kind: 'jsonp',
      service: 'appspot',
      url: 'https://character-sheets.appspot.com/dx3/display?ajax=1&base64Image=1&key=ABC123',
      callbackParam: 'callback',
      system: 'dx3',
    });
  });

  it('takes no warehouse address without a key', () => {
    const plan = detectImportFetchPlan('https://character-sheets.appspot.com/dx3/edit.html');
    expect(plan).toEqual({ kind: 'unsupported', service: 'unknown' });
  });

  it('fetches a sheet-service address directly, asking for json', () => {
    expect(detectImportFetchPlan('https://yutorize.work/ytsheet/sw2.5/?id=YrTkD0')).toEqual({
      kind: 'fetch',
      service: 'ytsheet',
      url: 'https://yutorize.work/ytsheet/sw2.5/?id=YrTkD0&mode=json',
    });
    // normalises a shortened path or another host onto the same address
    expect(detectImportFetchPlan('https://yutorize.2-d.jp/sw2.5/?id=abc123')).toEqual({
      kind: 'fetch',
      service: 'ytsheet',
      url: 'https://yutorize.work/ytsheet/sw2.5/?id=abc123&mode=json',
    });
  });

  it('takes none of them without an identifier', () => {
    expect(detectImportFetchPlan('https://yutorize.work/ytsheet/sw2.5/')).toEqual({
      kind: 'unsupported',
      service: 'unknown',
    });
  });

  it('takes no address from the service it does not support', () => {
    const plan = detectImportFetchPlan('https://charaxiv.app/c/abcdef');
    expect(plan).toEqual({ kind: 'unsupported', service: 'charaxiv' });
  });

  it('takes none from a host it does not know', () => {
    expect(detectImportFetchPlan('https://example.com/foo')).toEqual({ kind: 'unsupported', service: 'unknown' });
  });
});
