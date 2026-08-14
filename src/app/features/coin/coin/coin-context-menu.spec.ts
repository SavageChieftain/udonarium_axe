import { Coin } from '@axe/domain/coin/coin';
import { buildCoinContextMenu } from '@axe/features/coin/coin/coin-context-menu';
import { createSyncTranslate } from '@axe/testing/transloco-testing';

describe('buildCoinContextMenu()', () => {
  const t = createSyncTranslate('ja');
  const created: Coin[] = [];

  function makeCoin(): Coin {
    const coin = Coin.create('コイン');
    coin.location.name = 'table';
    created.push(coin);
    return coin;
  }

  const names = (actions: { name: string }[]) => actions.map((action) => action.name);

  afterEach(() => {
    for (const coin of created.splice(0)) coin.destroy();
  });

  it('flips the coin from the menu', () => {
    const onFlip = vi.fn();
    const menu = buildCoinContextMenu(makeCoin(), 50, { onFlip, onShowDetail: vi.fn() }, t);

    menu.find((action) => action.name === 'コインを投げる')!.action!();

    expect(onFlip).toHaveBeenCalled();
  });

  it('offers to turn a coin onto whichever side is down', () => {
    const coin = makeCoin();
    const callbacks = { onFlip: vi.fn(), onShowDetail: vi.fn() };

    const front = buildCoinContextMenu(coin, 50, callbacks, t);
    expect(names(front)).toContain('裏にする');
    front.find((action) => action.name === '裏にする')!.action!();
    expect(coin.face).toBe('back');

    const back = buildCoinContextMenu(coin, 50, callbacks, t);
    expect(names(back)).toContain('表にする');
    back.find((action) => action.name === '表にする')!.action!();
    expect(coin.face).toBe('front');
  });

  it('offers to lock what is unlocked and to unlock what is not', () => {
    const coin = makeCoin();
    const callbacks = { onFlip: vi.fn(), onShowDetail: vi.fn() };

    buildCoinContextMenu(coin, 50, callbacks, t).find((action) => action.name === '固定する')!.action!();
    expect(coin.isLock).toBe(true);

    buildCoinContextMenu(coin, 50, callbacks, t).find((action) => action.name === '固定解除')!.action!();
    expect(coin.isLock).toBe(false);
  });

  it('copies it a cell away', () => {
    const clone = { location: { x: 100, y: 200 }, toTopmost: vi.fn() };
    const coin = { isFront: true, isLock: false, clone: vi.fn(() => clone) } as unknown as Coin;

    buildCoinContextMenu(coin, 50, { onFlip: vi.fn(), onShowDetail: vi.fn() }, t).find(
      (action) => action.name === 'コピーを作る'
    )!.action!();

    expect(clone.location).toEqual({ x: 150, y: 250 });
    expect(clone.toTopmost).toHaveBeenCalled();
  });

  it('destroys it', () => {
    const coin = { isFront: true, isLock: false, destroy: vi.fn() } as unknown as Coin;

    buildCoinContextMenu(coin, 50, { onFlip: vi.fn(), onShowDetail: vi.fn() }, t).find(
      (action) => action.name === '削除する'
    )!.action!();

    expect(coin.destroy).toHaveBeenCalled();
  });

  it('opens it for editing', () => {
    const onShowDetail = vi.fn();
    const menu = buildCoinContextMenu(makeCoin(), 50, { onFlip: vi.fn(), onShowDetail }, t);

    menu.find((action) => action.name === 'コインを編集')!.action!();

    expect(onShowDetail).toHaveBeenCalled();
  });
});
