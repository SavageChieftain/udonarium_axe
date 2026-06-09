import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { PeerRole } from '@axe/domain/peer/peer-role';
import { buildDisclosureContextMenu } from '@axe/features/disclosure/disclosure-context-menu';

const t = (key: string) => key;

function setMe(userId: string, role: PeerRole) {
  PeerCursor.myCursor = { userId, role, name: userId, isGameMaster: role === PeerRole.GameMaster } as PeerCursor;
}

function obj(owner = '') {
  return { disclosureMode: 'all', disclosureUserIds: [] as string[], owner, update: () => undefined };
}

type Entry = { name?: string; subActions?: { name: string; action: () => void }[]; action?: () => void };

function find(menu: ReturnType<typeof buildDisclosureContextMenu>, fragment: string): Entry | undefined {
  return menu.find((m) => 'name' in m && typeof m.name === 'string' && m.name.includes(fragment)) as Entry | undefined;
}

describe('buildDisclosureContextMenu', () => {
  const original = PeerCursor.myCursor;

  afterEach(() => {
    PeerCursor.myCursor = original;
  });

  it('PL は所有者のいないキャラに所有者メニューを出す（公開範囲メニューは出さない）', () => {
    setMe('p1', PeerRole.Player);
    const menu = buildDisclosureContextMenu(obj(''), t);
    expect(find(menu, 'feature.disclosure.owner')).toBeTruthy();
    expect(find(menu, 'feature.disclosure.label')).toBeFalsy();
  });

  it('PL は他人が所有するキャラには何も出さない', () => {
    setMe('p1', PeerRole.Player);
    expect(buildDisclosureContextMenu(obj('p2'), t)).toEqual([]);
  });

  it('オーナー本人は公開範囲を編集できるが所有者メニューは出ない', () => {
    setMe('p1', PeerRole.Player);
    const menu = buildDisclosureContextMenu(obj('p1'), t);
    expect(find(menu, 'feature.disclosure.label')).toBeTruthy();
    expect(find(menu, 'feature.disclosure.owner')).toBeFalsy();
  });

  it('Guest は未所有でも所有者を設定できない', () => {
    setMe('g1', PeerRole.Guest);
    expect(buildDisclosureContextMenu(obj(''), t)).toEqual([]);
  });

  it('GM は公開範囲と所有者の両方を出す', () => {
    setMe('gm', PeerRole.GameMaster);
    const menu = buildDisclosureContextMenu(obj('p2'), t);
    expect(find(menu, 'feature.disclosure.label')).toBeTruthy();
    expect(find(menu, 'feature.disclosure.owner')).toBeTruthy();
  });

  it('PL が未所有キャラの所有者を自分に設定できる', () => {
    setMe('p1', PeerRole.Player);
    const o = obj('');
    const ownerMenu = find(buildDisclosureContextMenu(o, t), 'feature.disclosure.owner');
    const mine = ownerMenu?.subActions?.find((s) => s.name.includes('p1'));
    expect(mine).toBeTruthy();
    mine!.action();
    expect(o.owner).toBe('p1');
  });
});
