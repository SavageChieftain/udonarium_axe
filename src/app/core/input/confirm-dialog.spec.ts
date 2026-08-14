import { confirmDialog } from '@axe/core/input/confirm-dialog';

describe('confirmDialog', () => {
  const original = window.confirm;

  afterEach(() => {
    window.confirm = original;
  });

  it('passes a confirmation through', () => {
    const calls: string[] = [];
    window.confirm = ((message: string) => {
      calls.push(message);
      return true;
    }) as typeof window.confirm;

    expect(confirmDialog('save?')).toBe(true);
    expect(calls).toEqual(['save?']);
  });

  it('passes a refusal through', () => {
    window.confirm = (() => false) as typeof window.confirm;
    expect(confirmDialog('cancel?')).toBe(false);
  });
});
