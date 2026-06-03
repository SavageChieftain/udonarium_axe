import { DiceSymbol } from '@axe/domain/dice/dice-symbol';
import { buildDiceSymbolContextMenu } from '@axe/features/dice/dice-symbol/dice-symbol-context-menu';
import { createSyncTranslate } from '@axe/testing/transloco-testing';

const t = createSyncTranslate('ja');

interface MutableDice {
  isVisible: boolean;
  isMine: boolean;
  hasOwner: boolean;
  isLock: boolean;
  hideName: boolean;
  owner: string;
  face: string;
  faces: string[];
  clone: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
}

function makeDice(overrides: Partial<MutableDice> = {}): MutableDice {
  return {
    isVisible: true,
    isMine: false,
    hasOwner: false,
    isLock: false,
    hideName: false,
    owner: '',
    face: '1',
    faces: ['1', '2', '3'],
    clone: vi.fn(() => ({ location: { x: 0, y: 0 }, update: vi.fn() })),
    destroy: vi.fn(),
    update: vi.fn(),
    ...overrides,
  };
}

const names = (a: { name: string }[]) => a.map((x) => x.name);
const cb = () => ({ onDiceRoll: vi.fn(), onShowDetail: vi.fn() });

describe('buildDiceSymbolContextMenu()', () => {
  it('isVisible=true なら「ダイスを振る」と「ダイス目を設定」が出る', () => {
    const dice = makeDice({ isVisible: true });
    const menu = buildDiceSymbolContextMenu(dice as unknown as DiceSymbol, 50, cb(), t);
    expect(names(menu)).toContain('ダイスを振る');
    expect(names(menu)).toContain('ダイス目を設定');
  });

  it('isVisible=false なら「ダイスを振る」「ダイス目を設定」が出ない', () => {
    const dice = makeDice({ isVisible: false });
    const menu = buildDiceSymbolContextMenu(dice as unknown as DiceSymbol, 50, cb(), t);
    expect(names(menu)).not.toContain('ダイスを振る');
    expect(names(menu)).not.toContain('ダイス目を設定');
  });

  it('isMine か hasOwner なら「ダイスを公開」が出て owner を空にする', () => {
    const dice = makeDice({ isMine: true, owner: 'me' });
    const menu = buildDiceSymbolContextMenu(dice as unknown as DiceSymbol, 50, cb(), t);
    const reveal = menu.find((m) => m.name === 'ダイスを公開');
    expect(reveal).toBeDefined();
    reveal!.action!();
    expect(dice.owner).toBe('');
  });

  it('isMine=false なら「自分だけ見る」が出る', () => {
    const dice = makeDice({ isMine: false });
    const menu = buildDiceSymbolContextMenu(dice as unknown as DiceSymbol, 50, cb(), t);
    expect(names(menu)).toContain('自分だけ見る');
  });

  it('「ダイス目を設定」のサブメニューは faces の数だけ並ぶ', () => {
    const dice = makeDice({ isVisible: true, faces: ['1', '2', '3', '4', '5', '6'] });
    const menu = buildDiceSymbolContextMenu(dice as unknown as DiceSymbol, 50, cb(), t);
    const face = menu.find((m) => m.name === 'ダイス目を設定');
    expect(face?.subActions).toHaveLength(6);
  });

  it('サブメニューの 1 つを実行すると face が更新される', () => {
    const dice = makeDice({ face: '1' });
    const menu = buildDiceSymbolContextMenu(dice as unknown as DiceSymbol, 50, cb(), t);
    const subs = menu.find((m) => m.name === 'ダイス目を設定')?.subActions;
    subs?.find((s) => s.name === '3')!.action!();
    expect(dice.face).toBe('3');
  });

  it('hideName でチェックマーク表示が切り替わり、アクションでフラグが反転する', () => {
    const shown = makeDice({ hideName: false });
    const shownMenu = buildDiceSymbolContextMenu(shown as unknown as DiceSymbol, 50, cb(), t);
    expect(names(shownMenu)).toContain('☐ 名前を隠す');
    shownMenu.find((m) => m.name === '☐ 名前を隠す')!.action!();
    expect(shown.hideName).toBe(true);

    const hidden = makeDice({ hideName: true });
    const hiddenMenu = buildDiceSymbolContextMenu(hidden as unknown as DiceSymbol, 50, cb(), t);
    expect(names(hiddenMenu)).toContain('☑ 名前を隠す');
  });

  it('「削除する」が dice.destroy() を呼ぶ', () => {
    const dice = makeDice();
    const menu = buildDiceSymbolContextMenu(dice as unknown as DiceSymbol, 50, cb(), t);
    menu.find((m) => m.name === '削除する')!.action!();
    expect(dice.destroy).toHaveBeenCalled();
  });
});
