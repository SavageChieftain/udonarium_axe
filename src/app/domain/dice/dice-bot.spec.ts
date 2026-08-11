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

  describe('インスタンス', () => {
    it('DiceBotを作成できる', () => {
      const bot = new DiceBot();
      bot.initialize();
      expect(bot).toBeTruthy();
    });

    it('aliasNameがdice-bot', () => {
      const bot = new DiceBot();
      bot.initialize();
      expect(bot.aliasName).toBe('dice-bot');
    });
  });

  describe('static メンバー', () => {
    it('diceBotInfosが配列', () => {
      expect(Array.isArray(DiceBot.diceBotInfos)).toBe(true);
    });
  });

  describe('振った中身を捨てないこと', () => {
    /** bcdice の戻り値の形だけを真似た偽物。実物の読み込みは重いので使わない。 */
    function fakeSystem(result: unknown) {
      return { ID: 'FakeSystem', eval: () => result } as unknown as Parameters<typeof DiceBot.diceRollAsync>[1];
    }

    it('出目と成否を結果に添えること', async () => {
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

      // 文章に整形したあとでは読み直せないので、ここで拾えていないと後から数えられない。
      expect(rolled.detail?.faces.map((face) => face.value)).toEqual([5, 1]);
      expect(rolled.detail?.outcome).toBe('success');
      expect(rolled.detail?.system).toBe('FakeSystem');
    });

    it('振れなかったときは中身なしにすること', async () => {
      const rolled = await DiceBot.diceRollAsync('2D6', fakeSystem(null));

      expect(rolled.result).toBe('');
      expect(rolled.detail).toBeNull();
    });
  });
});
