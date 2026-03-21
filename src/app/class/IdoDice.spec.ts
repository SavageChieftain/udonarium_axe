import IdoDice from './IdoDice';

describe('IdoDice', () => {
  describe('static プロパティ', () => {
    it('IDが"IdoDice"', () => {
      expect(IdoDice.ID).toBe('IdoDice');
    });

    it('NAMEが"イドの証明"', () => {
      expect(IdoDice.NAME).toBe('イドの証明');
    });

    it('SORT_KEYが"いとのしょうめい"', () => {
      expect(IdoDice.SORT_KEY).toBe('いとのしょうめい');
    });

    it('COMMAND_PATTERNがRegExp', () => {
      expect(IdoDice.COMMAND_PATTERN).toBeInstanceOf(RegExp);
    });

    it('HELP_MESSAGEが文字列で内容がある', () => {
      expect(typeof IdoDice.HELP_MESSAGE).toBe('string');
      expect(IdoDice.HELP_MESSAGE.length).toBeGreaterThan(0);
    });
  });

  describe('COMMAND_PATTERN', () => {
    it('IDコマンドにマッチする', () => {
      expect(IdoDice.COMMAND_PATTERN.test('ID<=200')).toBe(true);
    });

    it('通常のダイスコマンドにマッチする', () => {
      expect(IdoDice.COMMAND_PATTERN.test('1D100')).toBe(true);
    });

    it('RESコマンドにマッチする', () => {
      expect(IdoDice.COMMAND_PATTERN.test('RES(10+20)')).toBe(true);
    });
  });
});
