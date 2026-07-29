import { Card } from '@axe/domain/card/card';
import { buildCardContextMenu } from '@axe/features/card/card/card-context-menu';
import { createSyncTranslate } from '@axe/testing/transloco-testing';

const t = createSyncTranslate('ja');

interface MutableCard {
  isLock: boolean;
  dispLockMark: boolean;
  isVisible: boolean;
  isPeeking: boolean;
  faceUp: ReturnType<typeof vi.fn>;
  faceDown: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
  clone: ReturnType<typeof vi.fn>;
}

function makeCard(overrides: Partial<MutableCard> = {}): MutableCard {
  return {
    isLock: false,
    dispLockMark: true,
    isVisible: true,
    isPeeking: false,
    faceUp: vi.fn(),
    faceDown: vi.fn(),
    destroy: vi.fn(),
    clone: vi.fn(() => ({ location: { x: 0, y: 0 }, toTopmost: vi.fn() })),
    ...overrides,
  };
}

const names = (a: { name: string }[]) => a.map((x) => x.name);
const defaultCallbacks = () => ({ onCreateStack: vi.fn(), onShowDetail: vi.fn() });

describe('buildCardContextMenu()', () => {
  it('isLock=false なら「固定する」「固定マーク」関連は出ない', () => {
    const card = makeCard({ isLock: false });
    const menu = buildCardContextMenu(card as unknown as Card, 50, defaultCallbacks(), t);
    expect(names(menu)).toContain('固定する');
    expect(names(menu)).not.toContain('固定マーク消去');
    expect(names(menu)).not.toContain('固定マーク表示');
  });

  it('isLock=true で dispLockMark=true なら「固定マーク消去」が出る', () => {
    const card = makeCard({ isLock: true, dispLockMark: true });
    const menu = buildCardContextMenu(card as unknown as Card, 50, defaultCallbacks(), t);
    expect(names(menu)).toContain('固定解除');
    expect(names(menu)).toContain('固定マーク消去');
  });

  it('isLock=true で dispLockMark=false なら「固定マーク表示」が出る', () => {
    const card = makeCard({ isLock: true, dispLockMark: false });
    const menu = buildCardContextMenu(card as unknown as Card, 50, defaultCallbacks(), t);
    expect(names(menu)).toContain('固定マーク表示');
  });

  it('isVisible=true && !isPeeking で「裏にする」、isVisible=false で「表にする」が出る', () => {
    const visible = buildCardContextMenu(
      makeCard({ isVisible: true, isPeeking: false }) as unknown as Card,
      50,
      defaultCallbacks(),
      t
    );
    expect(names(visible)).toContain('裏にする');

    const hidden = buildCardContextMenu(
      makeCard({ isVisible: false, isPeeking: false }) as unknown as Card,
      50,
      defaultCallbacks(),
      t
    );
    expect(names(hidden)).toContain('表にする');
  });

  it('isPeeking=true なら「自分だけ見る」ではなく「裏にする」が出る', () => {
    const card = makeCard({ isPeeking: true });
    const menu = buildCardContextMenu(card as unknown as Card, 50, defaultCallbacks(), t);
    expect(names(menu).filter((n) => n === '裏にする').length).toBeGreaterThan(0);
    expect(names(menu)).not.toContain('自分だけ見る');
  });

  it('「重なったカードで山札を作る」が onCreateStack を呼ぶ', () => {
    const onCreateStack = vi.fn();
    const menu = buildCardContextMenu(makeCard() as unknown as Card, 50, { onCreateStack, onShowDetail: vi.fn() }, t);
    menu.find((m) => m.name === '重なったカードで山札を作る')!.action!();
    expect(onCreateStack).toHaveBeenCalled();
  });

  it('「削除する」が card.destroy() を呼ぶ', () => {
    const card = makeCard();
    const menu = buildCardContextMenu(card as unknown as Card, 50, defaultCallbacks(), t);
    menu.find((m) => m.name === '削除する')!.action!();
    expect(card.destroy).toHaveBeenCalled();
  });
});
