import {
  buildInviteLink,
  decodeInvitePassword,
  encodeInvitePassword,
  parseInviteLink,
} from '@axe/domain/peer/invite-link';
import { PeerRole } from '@axe/domain/peer/peer-role';

const BASE_URL = 'https://example.test/axe/';

describe('buildInviteLink', () => {
  it('部屋 ID と部屋名を載せる', () => {
    const link = buildInviteLink(BASE_URL, { roomId: 'a1b', roomName: '深海の街', password: '', role: null });
    expect(link).toBe(`${BASE_URL}#join?r=a1b&n=${encodeURIComponent('深海の街')}`);
  });

  it('合言葉は平文で載せない', () => {
    const link = buildInviteLink(BASE_URL, { roomId: 'a1b', roomName: 'room', password: 'himitsu', role: null });

    expect(link).not.toContain('himitsu');
    expect(link).toContain('p=');
  });

  it('ロールを指定すれば載せる', () => {
    const link = buildInviteLink(BASE_URL, { roomId: 'a1b', roomName: 'room', password: '', role: PeerRole.Guest });
    expect(link).toBe(`${BASE_URL}#join?r=a1b&n=room&role=guest`);
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

  it('日本語や記号の合言葉も往復できる', () => {
    const params = { roomId: 'xyz', roomName: 'room', password: '合言葉＆記号<>"', role: null };
    const link = buildInviteLink(BASE_URL, params);
    expect(parseInviteLink(link.slice(link.indexOf('#')))?.password).toBe(params.password);
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

  it('壊れた合言葉は空として扱う', () => {
    expect(parseInviteLink('#join?r=a1b&n=room&p=!!!not-base64!!!')?.password).toBe('');
  });
});

describe('encodeInvitePassword / decodeInvitePassword', () => {
  it('元の文字列を残さない', () => {
    expect(encodeInvitePassword('himitsu', 'a1broom')).not.toContain('himitsu');
  });

  it('同じ salt でのみ元に戻る', () => {
    const encoded = encodeInvitePassword('himitsu', 'a1broom');

    expect(decodeInvitePassword(encoded, 'a1broom')).toBe('himitsu');
    expect(decodeInvitePassword(encoded, 'other')).not.toBe('himitsu');
  });

  it('部屋が違えば同じ合言葉でも別の文字列になる', () => {
    expect(encodeInvitePassword('himitsu', 'a1broom')).not.toBe(encodeInvitePassword('himitsu', 'xyzroom'));
  });

  it('URL に入れても壊れない文字だけを使う', () => {
    const encoded = encodeInvitePassword('合言葉＆記号 <>"/+=', 'a1broom');

    expect(encoded).toMatch(/^[A-Za-z0-9\-_]*$/);
    expect(encodeURIComponent(encoded)).toBe(encoded);
  });

  it('復元できない値は空を返す', () => {
    expect(decodeInvitePassword('!!!', 'a1broom')).toBe('');
    expect(decodeInvitePassword('', 'a1broom')).toBe('');
  });
});
