import BCDiceLoader, { loadBCDiceGameSystems } from '@axe/domain/dice/bcdice/bcdice-loader';

describe('BCDiceLoader', () => {
  it('extends the loader', () => {
    const loader = new BCDiceLoader();
    expect(loader).toBeTruthy();
  });

  it('offers a method that loads on demand', () => {
    const loader = new BCDiceLoader();
    expect(typeof loader.dynamicLoad).toBe('function');
  });
});

describe('loadBCDiceGameSystems', () => {
  // It loads a real system, and run alongside other work it can reach the usual limit.
  it('hands the system class back at once after the load', { timeout: 20000 }, async () => {
    await loadBCDiceGameSystems();
    const loader = new BCDiceLoader();

    expect(loader.getGameSystemClass('Cthulhu7th')).toBeTruthy();
  });

  it('shares one load between two calls', async () => {
    const first = loadBCDiceGameSystems();
    const second = loadBCDiceGameSystems();

    expect(first).toBe(second);
    await first;
  });

  it('loads the help of a system that uses translations', async () => {
    await loadBCDiceGameSystems();
    const loader = new BCDiceLoader();

    expect(loader.getGameSystemClass('Amadeus').HELP_MESSAGE.length).toBeGreaterThan(0);
  });
});
