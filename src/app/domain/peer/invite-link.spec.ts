import { buildInviteLink, parseInviteLink } from '@axe/domain/peer/invite-link';
import { PeerRole } from '@axe/domain/peer/peer-role';

const BASE_URL = 'https://example.test/axe/';

describe('buildInviteLink', () => {
  it('部屋 ID と部屋名を載せる', () => {
    const link = buildInviteLink(BASE_URL, { roomId: 'a1b', roomName: '深海の街', password: '', role: null });
    expect(link).toBe(`${BASE_URL}#join?r=a1b&n=${encodeURIComponent('深海の街')}`);
  });

  it('パスワードとロールを指定すれば載せる', () => {
    const link = buildInviteLink(BASE_URL, {
      roomId: 'a1b',
      roomName: 'room',
      password: 'pw',
      role: PeerRole.Guest,
    });
    expect(link).toBe(`${BASE_URL}#join?r=a1b&n=room&p=pw&role=guest`);
  });

  it('空のパスワードは載せない', () => {
    const link = buildInviteLink(BASE_URL, { roomId: 'a1b', roomName: 'room', password: '', role: PeerRole.Player });
    expect(link).toBe(`${BASE_URL}#join?r=a1b&n=room&role=pl`);
  });
});

describe('parseInviteLink', () => {
  it('生成したリンクを往復できる', () => {
    const params = { roomId: 'a1b', roomName: '深海の街 #2', password: 'p a s s', role: PeerRole.Player };
    const link = buildInviteLink(BASE_URL, params);
    expect(parseInviteLink(link.slice(link.indexOf('#')))).toEqual(params);
  });

  it('パスワードとロールが無ければ既定値になる', () => {
    expect(parseInviteLink('#join?r=a1b&n=room')).toEqual({
      roomId: 'a1b',
      roomName: 'room',
      password: '',
      role: null,
    });
  });

  it('未知のロールは無視する', () => {
    expect(parseInviteLink('#join?r=a1b&n=room&role=admin')?.role).toBeNull();
  });

  it('招待リンク以外のハッシュは受け付けない', () => {
    expect(parseInviteLink('')).toBeNull();
    expect(parseInviteLink('#')).toBeNull();
    expect(parseInviteLink('#other?r=a1b&n=room')).toBeNull();
  });

  it('部屋 ID か部屋名が欠けていれば受け付けない', () => {
    expect(parseInviteLink('#join?n=room')).toBeNull();
    expect(parseInviteLink('#join?r=a1b')).toBeNull();
    expect(parseInviteLink('#join?r=&n=room')).toBeNull();
  });
});
