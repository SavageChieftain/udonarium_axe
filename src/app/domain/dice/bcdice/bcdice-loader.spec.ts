import BCDiceLoader, { loadBCDiceGameSystems } from '@axe/domain/dice/bcdice/bcdice-loader';

describe('BCDiceLoader', () => {
  it('Loader を継承している', () => {
    const loader = new BCDiceLoader();
    expect(loader).toBeTruthy();
  });

  it('dynamicLoadがメソッドとして存在する', () => {
    const loader = new BCDiceLoader();
    expect(typeof loader.dynamicLoad).toBe('function');
  });
});

describe('loadBCDiceGameSystems', () => {
  // 実際にゲームシステムを読み込むので、他の処理と並んで走ると既定の制限に届きうる。
  it('読み込み後は同期的にゲームシステムクラスを取得できる', { timeout: 20000 }, async () => {
    await loadBCDiceGameSystems();
    const loader = new BCDiceLoader();

    expect(loader.getGameSystemClass('Cthulhu7th')).toBeTruthy();
  });

  it('二度呼んでも同じ読み込みを共有する', async () => {
    const first = loadBCDiceGameSystems();
    const second = loadBCDiceGameSystems();

    expect(first).toBe(second);
    await first;
  });

  it('i18n を使うシステムのヘルプが読み込まれている', async () => {
    await loadBCDiceGameSystems();
    const loader = new BCDiceLoader();

    expect(loader.getGameSystemClass('Amadeus').HELP_MESSAGE.length).toBeGreaterThan(0);
  });
});
