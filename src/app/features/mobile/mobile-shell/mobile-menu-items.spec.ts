import {
  gameMasterMobileMenuItems,
  MOBILE_MENU_ITEMS,
  sharedMobileMenuItems,
  visibleMobileMenuItems,
} from '@axe/features/mobile/mobile-shell/mobile-menu-items';

describe('mobileMenuItems', () => {
  it('アクションが重複しない', () => {
    const actions = MOBILE_MENU_ITEMS.map((item) => item.action);
    expect(new Set(actions).size).toBe(actions.length);
  });

  it('共有項目にゲームマスター専用が混ざらない', () => {
    expect(sharedMobileMenuItems().every((item) => !item.gameMasterOnly)).toBe(true);
  });

  it('ゲームマスター項目は専用のものだけになる', () => {
    expect(gameMasterMobileMenuItems().every((item) => item.gameMasterOnly === true)).toBe(true);
  });

  it('共有とゲームマスターの合計が表示項目と一致する', () => {
    const merged = [...sharedMobileMenuItems(), ...gameMasterMobileMenuItems()].map((item) => item.action).sort();
    const visible = visibleMobileMenuItems(true)
      .map((item) => item.action)
      .sort();
    expect(merged).toEqual(visible);
  });

  it('プレイヤーにはゲームマスター項目を出さない', () => {
    expect(visibleMobileMenuItems(false)).toEqual(sharedMobileMenuItems());
  });

  it('ルームの読み込みを共有項目に持つ', () => {
    expect(sharedMobileMenuItems().map((item) => item.action)).toContain('zipLoad');
  });
});
