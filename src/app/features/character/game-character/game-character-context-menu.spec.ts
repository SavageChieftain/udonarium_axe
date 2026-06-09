import { GameObjectInventoryService } from '@axe/application/inventory/game-object-inventory.service';
import { ContextMenuType } from '@axe/application/ui/context-menu.service';
import { GameCharacter } from '@axe/domain/character/game-character';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { buildGameCharacterContextMenu } from '@axe/features/character/game-character/game-character-context-menu';
import { createSyncTranslate } from '@axe/testing/transloco-testing';

const t = createSyncTranslate('ja');

interface MutableChar {
  altitude: number;
  isAltitudeIndicate: boolean;
  isDropShadow: boolean;
  hideInventory: boolean;
  nonTalkFlag: boolean;
  hideName: boolean;
  hideBuff: boolean;
  isLock: boolean;
  setLocation: ReturnType<typeof vi.fn>;
  clone: ReturnType<typeof vi.fn>;
}

function makeService(): GameObjectInventoryService {
  return { notifyInventoryUpdate: vi.fn() } as unknown as GameObjectInventoryService;
}

function makeChar(overrides: Partial<MutableChar> = {}): MutableChar {
  return {
    altitude: 0,
    isAltitudeIndicate: false,
    isDropShadow: false,
    hideInventory: false,
    nonTalkFlag: false,
    hideName: false,
    hideBuff: false,
    isLock: false,
    setLocation: vi.fn(),
    clone: vi.fn(() => ({ location: { x: 0, y: 0 }, update: vi.fn() })),
    ...overrides,
  };
}

const names = (a: { name: string }[]) => a.map((x) => x.name);
const callbacks = () => ({
  onShowDetail: vi.fn(),
  onShowChatPalette: vi.fn(),
  onShowRemoteController: vi.fn(),
  onShowBuffEdit: vi.fn(),
  onShowLightSettings: vi.fn(),
});

describe('buildGameCharacterContextMenu()', () => {
  beforeEach(() => {
    PeerCursor.myCursor = null!;
  });

  it('先頭は「詳細を表示」（開く/確認グループが最上段）', () => {
    const char = makeChar();
    const menu = buildGameCharacterContextMenu(char as unknown as GameCharacter, 50, makeService(), callbacks(), t);
    expect(menu[0].name).toBe('詳細を表示');
  });

  it('「高度設定」サブメニュー（高度=0, 高度表示, 影の表示）が表示設定グループに含まれる', () => {
    const char = makeChar();
    const menu = buildGameCharacterContextMenu(char as unknown as GameCharacter, 50, makeService(), callbacks(), t);
    const altitude = menu.find((m) => m.name === '高度設定');
    expect(altitude).toBeDefined();
    expect(altitude!.subActions?.length).toBe(3);
  });

  it('「詳細を表示」「チャットパレット」「リモコン」「バフ編集」がコールバックを呼ぶ', () => {
    const cb = callbacks();
    const menu = buildGameCharacterContextMenu(makeChar() as unknown as GameCharacter, 50, makeService(), cb, t);
    menu.find((m) => m.name === '詳細を表示')!.action!();
    menu.find((m) => m.name === 'チャットパレットを表示')!.action!();
    menu.find((m) => m.name === 'リモコンを表示')!.action!();
    menu.find((m) => m.name === 'バフ編集')!.action!();
    expect(cb.onShowDetail).toHaveBeenCalled();
    expect(cb.onShowChatPalette).toHaveBeenCalled();
    expect(cb.onShowRemoteController).toHaveBeenCalled();
    expect(cb.onShowBuffEdit).toHaveBeenCalled();
  });

  it('hideInventory フラグでチェックマーク表示が切り替わる', () => {
    const visibleMenu = buildGameCharacterContextMenu(
      makeChar({ hideInventory: false }) as unknown as GameCharacter,
      50,
      makeService(),
      callbacks(),
      t
    );
    expect(names(visibleMenu)).toContain('☐ インベントリ非表示');

    const hiddenMenu = buildGameCharacterContextMenu(
      makeChar({ hideInventory: true }) as unknown as GameCharacter,
      50,
      makeService(),
      callbacks(),
      t
    );
    expect(names(hiddenMenu)).toContain('☑ インベントリ非表示');
  });

  it('nonTalkFlag でチェックマーク表示が切り替わる', () => {
    const talking = buildGameCharacterContextMenu(
      makeChar({ nonTalkFlag: false }) as unknown as GameCharacter,
      50,
      makeService(),
      callbacks(),
      t
    );
    expect(names(talking)).toContain('☐ 発言しない');

    const silent = buildGameCharacterContextMenu(
      makeChar({ nonTalkFlag: true }) as unknown as GameCharacter,
      50,
      makeService(),
      callbacks(),
      t
    );
    expect(names(silent)).toContain('☑ 発言しない');
  });

  it('「表示」サブメニューで名前/バフ非表示のチェックが切り替わる', () => {
    const def = buildGameCharacterContextMenu(
      makeChar() as unknown as GameCharacter,
      50,
      makeService(),
      callbacks(),
      t
    );
    const display = def.find((m) => m.name === '表示');
    expect(names(display!.subActions!)).toEqual(['☐ 名前を隠す', '☐ バフを隠す']);

    const hidden = buildGameCharacterContextMenu(
      makeChar({ hideName: true, hideBuff: true }) as unknown as GameCharacter,
      50,
      makeService(),
      callbacks(),
      t
    );
    const display2 = hidden.find((m) => m.name === '表示');
    expect(names(display2!.subActions!)).toEqual(['☑ 名前を隠す', '☑ バフを隠す']);
  });

  it('「名前を隠す」「バフを隠す」アクションでフラグが反転する', () => {
    const char = makeChar();
    const menu = buildGameCharacterContextMenu(char as unknown as GameCharacter, 50, makeService(), callbacks(), t);
    const display = menu.find((m) => m.name === '表示')!;
    display.subActions!.find((s) => s.name === '☐ 名前を隠す')!.action!();
    display.subActions!.find((s) => s.name === '☐ バフを隠す')!.action!();
    expect(char.hideName).toBe(true);
    expect(char.hideBuff).toBe(true);
  });

  it('移動先 3 つ（共有 / 個人 / 墓場）が常に出る、それぞれ setLocation を呼ぶ', () => {
    const char = makeChar();
    const menu = buildGameCharacterContextMenu(char as unknown as GameCharacter, 50, makeService(), callbacks(), t);
    menu.find((m) => m.name === '共有イベントリに移動')!.action!();
    expect(char.setLocation).toHaveBeenLastCalledWith('common');
    menu.find((m) => m.name === '墓場に移動')!.action!();
    expect(char.setLocation).toHaveBeenLastCalledWith('graveyard');
  });

  it('isLock=true で「固定解除」、isLock=false で「固定する」', () => {
    const locked = buildGameCharacterContextMenu(
      makeChar({ isLock: true }) as unknown as GameCharacter,
      50,
      makeService(),
      callbacks(),
      t
    );
    expect(names(locked)).toContain('固定解除');

    const unlocked = buildGameCharacterContextMenu(
      makeChar({ isLock: false }) as unknown as GameCharacter,
      50,
      makeService(),
      callbacks(),
      t
    );
    expect(names(unlocked)).toContain('固定する');
  });

  it('権限なし時の separator は 3 つ（開く後 / 移動前 / 操作前）', () => {
    const menu = buildGameCharacterContextMenu(
      makeChar() as unknown as GameCharacter,
      50,
      makeService(),
      callbacks(),
      t
    );
    expect(menu.filter((m) => m.type === ContextMenuType.SEPARATOR)).toHaveLength(3);
  });
});
