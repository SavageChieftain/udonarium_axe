import KariDice from './KariDice';

describe('KariDice', () => {
  describe('static プロパティ', () => {
    it('IDが"KariDice"', () => {
      expect(KariDice.ID).toBe('KariDice');
    });

    it('NAMEが"仮ダイス"', () => {
      expect(KariDice.NAME).toBe('仮ダイス');
    });

    it('SORT_KEYが"かりたいす"', () => {
      expect(KariDice.SORT_KEY).toBe('かりたいす');
    });

    it('COMMAND_PATTERNがRegExp', () => {
      expect(KariDice.COMMAND_PATTERN).toBeInstanceOf(RegExp);
    });

    it('HELP_MESSAGEが文字列', () => {
      expect(typeof KariDice.HELP_MESSAGE).toBe('string');
      expect(KariDice.HELP_MESSAGE.length).toBeGreaterThan(0);
    });
  });

  describe('COMMAND_PATTERN', () => {
    it('KDコマンドにマッチする', () => {
      expect(KariDice.COMMAND_PATTERN.test('KD')).toBe(true);
    });

    it('通常のダイスコマンドにマッチする', () => {
      expect(KariDice.COMMAND_PATTERN.test('2D6')).toBe(true);
    });
  });
});
