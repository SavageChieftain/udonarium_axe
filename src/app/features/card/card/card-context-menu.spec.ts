import { Card } from '@axe/domain/card/card';
import { buildCardContextMenu } from '@axe/features/card/card/card-context-menu';
import { createSyncTranslate } from '@axe/testing/transloco-testing';

const t = createSyncTranslate('ja');

interface MutableCard {
  isLock: boolean;
  dispLockMark: boolean;
  isVisible: boolean;
  isPeeking: boolean;
  cutInIdentifier: string;
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
    cutInIdentifier: '',
    faceUp: vi.fn(),
    faceDown: vi.fn(),
    destroy: vi.fn(),
    clone: vi.fn(() => ({ location: { x: 0, y: 0 }, toTopmost: vi.fn() })),
    ...overrides,
  };
}

const names = (a: { name: string }[]) => a.map((x) => x.name);
const defaultCallbacks = () => ({
  onCreateStack: vi.fn(),
  onOverlappingToHand: vi.fn(),
  onShowDetail: vi.fn(),
  onFlipToFront: vi.fn(),
  onAssignCutIn: vi.fn(),
});
const noCutIns: { identifier: string; name: string }[] = [];

describe('buildCardContextMenu()', () => {
  it('isLock=false なら「固定する」「固定マーク」関連は出ない', () => {
    const card = makeCard({ isLock: false });
    const menu = buildCardContextMenu(card as unknown as Card, 50, defaultCallbacks(), noCutIns, t);
    expect(names(menu)).toContain('固定する');
    expect(names(menu)).not.toContain('固定マーク消去');
    expect(names(menu)).not.toContain('固定マーク表示');
  });

  it('isLock=true で dispLockMark=true なら「固定マーク消去」が出る', () => {
    const card = makeCard({ isLock: true, dispLockMark: true });
    const menu = buildCardContextMenu(card as unknown as Card, 50, defaultCallbacks(), noCutIns, t);
    expect(names(menu)).toContain('固定解除');
    expect(names(menu)).toContain('固定マーク消去');
  });

  it('isLock=true で dispLockMark=false なら「固定マーク表示」が出る', () => {
    const card = makeCard({ isLock: true, dispLockMark: false });
    const menu = buildCardContextMenu(card as unknown as Card, 50, defaultCallbacks(), noCutIns, t);
    expect(names(menu)).toContain('固定マーク表示');
  });

  it('isVisible=true && !isPeeking で「裏にする」、isVisible=false で「表にする」が出る', () => {
    const visible = buildCardContextMenu(
      makeCard({ isVisible: true, isPeeking: false }) as unknown as Card,
      50,
      defaultCallbacks(),
      noCutIns,
      t
    );
    expect(names(visible)).toContain('裏にする');

    const hidden = buildCardContextMenu(
      makeCard({ isVisible: false, isPeeking: false }) as unknown as Card,
      50,
      defaultCallbacks(),
      noCutIns,
      t
    );
    expect(names(hidden)).toContain('表にする');
  });

  it('isPeeking=true なら「自分だけ見る」ではなく「裏にする」が出る', () => {
    const card = makeCard({ isPeeking: true });
    const menu = buildCardContextMenu(card as unknown as Card, 50, defaultCallbacks(), noCutIns, t);
    expect(names(menu).filter((n) => n === '裏にする').length).toBeGreaterThan(0);
    expect(names(menu)).not.toContain('自分だけ見る');
  });

  it('めくったときのカットインを選ぶと紐づけが更新されること', () => {
    const onAssignCutIn = vi.fn();
    const menu = buildCardContextMenu(
      makeCard({ cutInIdentifier: 'cut-1' }) as unknown as Card,
      50,
      { ...defaultCallbacks(), onAssignCutIn },
      [
        { identifier: 'cut-1', name: '召喚' },
        { identifier: 'cut-2', name: '撃破' },
      ],
      t
    );

    const entry = menu.find((m) => m.name === 'めくったときのカットイン');
    expect(names(entry!.subActions!)).toEqual(['（なし）', '✔ 召喚', '撃破']);

    entry!.subActions!.find((m) => m.name === '撃破')!.action!();
    expect(onAssignCutIn).toHaveBeenCalledWith('cut-2');

    entry!.subActions!.find((m) => m.name === '（なし）')!.action!();
    expect(onAssignCutIn).toHaveBeenCalledWith('');
  });

  it('「表にする」がカットインの再生を呼ぶこと', () => {
    const onFlipToFront = vi.fn();
    const menu = buildCardContextMenu(
      makeCard({ isVisible: false, isPeeking: false }) as unknown as Card,
      50,
      { ...defaultCallbacks(), onFlipToFront },
      noCutIns,
      t
    );

    menu.find((m) => m.name === '表にする')!.action!();
    expect(onFlipToFront).toHaveBeenCalled();
  });

  it('「重なったカードで山札を作る」が onCreateStack を呼ぶ', () => {
    const onCreateStack = vi.fn();
    const menu = buildCardContextMenu(
      makeCard() as unknown as Card,
      50,
      { ...defaultCallbacks(), onCreateStack },
      noCutIns,
      t
    );
    menu.find((m) => m.name === '重なったカードで山札を作る')!.action!();
    expect(onCreateStack).toHaveBeenCalled();
  });

  it('「削除する」が card.destroy() を呼ぶ', () => {
    const card = makeCard();
    const menu = buildCardContextMenu(card as unknown as Card, 50, defaultCallbacks(), noCutIns, t);
    menu.find((m) => m.name === '削除する')!.action!();
    expect(card.destroy).toHaveBeenCalled();
  });

  it('重なったカードを手札に加える項目が山札作成の直後に出る', () => {
    const card = makeCard({});
    const callbacks = defaultCallbacks();
    const menu = buildCardContextMenu(card as unknown as Card, 50, callbacks, noCutIns, t);
    const stackIndex = names(menu).indexOf('重なったカードで山札を作る');

    expect(stackIndex).toBeGreaterThanOrEqual(0);
    expect(names(menu)[stackIndex + 1]).toBe('重なったカードを手札に加える');

    menu[stackIndex + 1].action?.();
    expect(callbacks.onOverlappingToHand).toHaveBeenCalledOnce();
  });
});
