import { TestBed } from '@angular/core/testing';
import { ObjectStore } from '@axe/core/sync/object-store';
import { DiceBot } from '@axe/domain/dice/dice-bot';

describe('DiceBot', () => {
  let store: ObjectStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = ObjectStore.instance;
    const allObjects = store.getObjects();
    allObjects.forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
  });

  afterEach(() => {
    const allObjects = store.getObjects();
    allObjects.forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
    vi.restoreAllMocks();
  });

  describe('an instance', () => {
    it('can be created', () => {
      const bot = new DiceBot();
      bot.initialize();
      expect(bot).toBeTruthy();
    });

    it('names itself the dice bot', () => {
      const bot = new DiceBot();
      bot.initialize();
      expect(bot.aliasName).toBe('dice-bot');
    });
  });

  describe('its static members', () => {
    it('lists the systems it knows', () => {
      expect(Array.isArray(DiceBot.diceBotInfos)).toBe(true);
    });
  });

  describe('does not throw away what was rolled', () => {
    /** A stand-in that only mimics the shape of the library's result; loading the real one is expensive. */
    function fakeSystem(result: unknown) {
      return { ID: 'FakeSystem', eval: () => result } as unknown as Parameters<typeof DiceBot.diceRollAsync>[1];
    }

    // The rolls are served from one queue, and a system loaded by an earlier test sits ahead
    // of it, so waiting for that can reach the usual limit.
    it('puts the roll and whether it succeeded onto the result', { timeout: 20000 }, async () => {
      const rolled = await DiceBot.diceRollAsync(
        '2D6',
        fakeSystem({
          text: '(2D6) ＞ 6[5,1] ＞ 6',
          secret: false,
          detailedRands: [
            { kind: 'normal', sides: 6, value: 5 },
            { kind: 'normal', sides: 6, value: 1 },
          ],
          success: true,
          failure: false,
          critical: false,
          fumble: false,
        })
      );

      // Neither can be read back out of the formatted text, so what is not taken here can never be counted.
      expect(rolled.detail?.faces.map((face) => face.value)).toEqual([5, 1]);
      expect(rolled.detail?.outcome).toBe('success');
      expect(rolled.detail?.system).toBe('FakeSystem');
    });

    it('returns nothing when nothing could be rolled', { timeout: 20000 }, async () => {
      const rolled = await DiceBot.diceRollAsync('2D6', fakeSystem(null));

      expect(rolled.result).toBe('');
      expect(rolled.detail).toBeNull();
    });
  });
});
