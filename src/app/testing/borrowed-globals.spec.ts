import { BorrowedGlobals } from '@axe/testing/borrowed-globals';

describe('BorrowedGlobals', () => {
  const globals = globalThis as unknown as Record<string, unknown>;

  it('gives back a name the environment already had', () => {
    globals['alreadyHere'] = 'the real one';
    const borrowed = new BorrowedGlobals();

    borrowed.lend('alreadyHere', 'a stand-in');
    expect(globals['alreadyHere']).toBe('a stand-in');

    borrowed.giveBack();
    expect(globals['alreadyHere']).toBe('the real one');
    delete globals['alreadyHere'];
  });

  it('takes away a name the environment never had, rather than leaving it undefined', () => {
    const borrowed = new BorrowedGlobals();

    borrowed.lend('neverHere', 'a stand-in');
    borrowed.giveBack();

    expect('neverHere' in globals).toBe(false);
  });

  it('gives back a name that was there but held nothing', () => {
    globals['heldNothing'] = undefined;
    const borrowed = new BorrowedGlobals();

    borrowed.lend('heldNothing', 'a stand-in');
    borrowed.giveBack();

    expect('heldNothing' in globals).toBe(true);
    expect(globals['heldNothing']).toBeUndefined();
    delete globals['heldNothing'];
  });

  it('remembers what was first there, however many times it is lent over', () => {
    globals['lentTwice'] = 'the real one';
    const borrowed = new BorrowedGlobals();

    borrowed.lend('lentTwice', 'first');
    borrowed.lend('lentTwice', 'second');
    borrowed.giveBack();

    expect(globals['lentTwice']).toBe('the real one');
    delete globals['lentTwice'];
  });

  it('gives back what it borrowed from a prototype', () => {
    const borrowed = new BorrowedGlobals();
    const real = HTMLCanvasElement.prototype.getContext;

    borrowed.lendOn(HTMLCanvasElement.prototype, 'getContext', () => ({}));
    expect(HTMLCanvasElement.prototype.getContext).not.toBe(real);

    borrowed.giveBack();
    expect(HTMLCanvasElement.prototype.getContext).toBe(real);
  });

  it('has nothing to give back twice over', () => {
    const borrowed = new BorrowedGlobals();
    borrowed.lend('once', 1);
    borrowed.giveBack();
    globals['once'] = 'set again afterwards';

    borrowed.giveBack();

    expect(globals['once']).toBe('set again afterwards');
    delete globals['once'];
  });
});
