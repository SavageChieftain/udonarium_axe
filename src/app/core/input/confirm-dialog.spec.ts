import { confirmDialog } from '@axe/core/input/confirm-dialog';

describe('confirmDialog', () => {
  const original = window.confirm;

  afterEach(() => {
    window.confirm = original;
  });

  it('window.confirm の戻り値をそのまま返す (true)', () => {
    const calls: string[] = [];
    window.confirm = ((message: string) => {
      calls.push(message);
      return true;
    }) as typeof window.confirm;

    expect(confirmDialog('save?')).toBe(true);
    expect(calls).toEqual(['save?']);
  });

  it('window.confirm の戻り値をそのまま返す (false)', () => {
    window.confirm = (() => false) as typeof window.confirm;
    expect(confirmDialog('cancel?')).toBe(false);
  });
});
