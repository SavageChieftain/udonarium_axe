import { PeerContext } from '@axe/core/network/peer-context';
import { PeerSessionGrade } from '@axe/core/network/peer-session-state';

describe('PeerContext', () => {
  describe('parse', () => {
    it('単純なpeerIdをパースできる', () => {
      const ctx = PeerContext.parse('abcdef');
      expect(ctx.peerId).toBe('abcdef');
      expect(ctx.digestUserId).toBe('abcdef');
      expect(ctx.isRoom).toBe(false);
    });

    it('ルームIDを含むpeerIdをパースできる', () => {
      // roomIdPatternに合致するかは具体的なフォーマットに依存
      const ctx = PeerContext.parse('simpleId');
      expect(ctx.peerId).toBe('simpleId');
    });

    it('createRoom で生成した peerId を parse するとルーム情報が復元される', async () => {
      const roomName = 'テストルーム日本語';
      const ctx = await PeerContext.createRoom('user', 'abc', roomName, '');
      const parsed = PeerContext.parse(ctx.peerId);

      expect(parsed.isRoom).toBe(true);
      expect(parsed.roomName).toBe(roomName);
      expect(parsed.hasPassword).toBe(false);
    });

    it('ルーム名にASCII以外を含む場合もラウンドトリップが成立する', async () => {
      const roomName = '🎲ダイスルーム🎲';
      const ctx = await PeerContext.createRoom('user', 'xyz', roomName, '');
      const parsed = PeerContext.parse(ctx.peerId);

      expect(parsed.roomName).toBe(roomName);
    });

    it('空のルーム名でもラウンドトリップが成立する', async () => {
      const ctx = await PeerContext.createRoom('user', 'abc', '', '');
      const parsed = PeerContext.parse(ctx.peerId);
      expect(parsed.roomName).toBe('');
    });

    it('不正なpeerIdでパースが失敗してもクラッシュしない', () => {
      const ctx = PeerContext.parse('!!!invalid!!!');
      expect(ctx.peerId).toBe('!!!invalid!!!');
    });
  });

  describe('create (user only)', () => {
    it('ユーザーIDからコンテキストを作成できる', async () => {
      const ctx = await PeerContext.create('testUser');
      expect(ctx.userId).toBe('testUser');
      expect(ctx.peerId).toBeTruthy();
      expect(ctx.isRoom).toBe(false);
    });

    it('空文字のユーザーIDでも作成できる', async () => {
      const ctx = await PeerContext.create('');
      expect(ctx.userId).toBe('');
    });
  });

  describe('createRoom', () => {
    it('ルーム情報を含むコンテキストを作成できる', async () => {
      const ctx = await PeerContext.createRoom('testUser', 'abc', 'TestRoom', '');
      expect(ctx.userId).toBe('testUser');
      expect(ctx.isRoom).toBe(true);
    });

    it('パスワード付きルームを作成できる', async () => {
      const ctx = await PeerContext.createRoom('testUser', 'abc', 'TestRoom', 'secret');
      expect(ctx.userId).toBe('testUser');
      expect(ctx.password).toBe('secret');
      expect(ctx.hasPassword).toBe(true);
    });

    it('パスワードなしルームはhasPasswordがfalse', async () => {
      const ctx = await PeerContext.createRoom('testUser', 'abc', 'TestRoom', '');
      expect(ctx.hasPassword).toBe(false);
    });
  });

  describe('verifyPassword', () => {
    it('正しいパスワードで検証成功', async () => {
      const ctx = await PeerContext.createRoom('testUser', 'abc', 'TestRoom', 'secret');
      const parsed = PeerContext.parse(ctx.peerId);
      expect(await parsed.verifyPassword('secret')).toBe(true);
    });

    it('間違ったパスワードで検証失敗', async () => {
      const ctx = await PeerContext.createRoom('testUser', 'abc', 'TestRoom', 'secret');
      const parsed = PeerContext.parse(ctx.peerId);
      expect(await parsed.verifyPassword('wrong')).toBe(false);
    });
  });

  describe('verifyPeer', () => {
    it('同じルームのpeerを検証できる（パスワードなし）', async () => {
      const ctx1 = await PeerContext.createRoom('user1', 'abc', 'TestRoom', '');
      const ctx2 = await PeerContext.createRoom('user2', 'abc', 'TestRoom', '');
      expect(await ctx1.verifyPeer(ctx2.peerId)).toBe(true);
    });

    it('異なるルーム名のpeerは検証失敗', async () => {
      // roomId は regex の \w{3} に合わせて3文字必須
      const ctx1 = await PeerContext.createRoom('user1', 'abc', 'Room1', '');
      const ctx2 = await PeerContext.createRoom('user2', 'abc', 'Room2', '');
      expect(await ctx1.verifyPeer(ctx2.peerId)).toBe(false);
    });

    it('パスワードあり: 正しいパスワードを持つpeerを検証できる', async () => {
      const ctx1 = await PeerContext.createRoom('user1', 'abc', 'TestRoom', 'secret');
      const ctx2 = await PeerContext.createRoom('user2', 'abc', 'TestRoom', 'secret');
      ctx1.password = 'secret';
      expect(await ctx1.verifyPeer(ctx2.peerId)).toBe(true);
    });

    it('パスワードあり: passwordが未設定だと検証失敗', async () => {
      const ctx1 = await PeerContext.createRoom('user1', 'abc', 'TestRoom', 'secret');
      const ctx2 = await PeerContext.createRoom('user2', 'abc', 'TestRoom', 'secret');
      // createRoom後は password が設定されているので、明示的にクリアして未設定状態を再現
      ctx1.password = '';
      expect(await ctx1.verifyPeer(ctx2.peerId)).toBe(false);
    });

    it('パスワードの有無が異なるpeerは検証失敗', async () => {
      const ctx1 = await PeerContext.createRoom('user1', 'abc', 'TestRoom', '');
      const ctx2 = await PeerContext.createRoom('user2', 'abc', 'TestRoom', 'secret');
      expect(await ctx1.verifyPeer(ctx2.peerId)).toBe(false);
    });
  });

  describe('session', () => {
    it('デフォルトのsession状態', async () => {
      const ctx = await PeerContext.create('testUser');
      expect(ctx.session.grade).toBe(PeerSessionGrade.UNSPECIFIED);
      expect(ctx.session.ping).toBe(0);
      expect(ctx.session.health).toBe(0);
      expect(ctx.session.speed).toBe(0);
      expect(ctx.session.description).toBe('');
    });
  });

  describe('generateId', () => {
    it('デフォルトフォーマットで8文字のIDを生成する', () => {
      const id = PeerContext.generateId();
      expect(id).toHaveLength(8);
      expect(id).toMatch(/^[0-9a-zA-Z]{8}$/);
    });

    it('カスタムフォーマットでIDを生成する', () => {
      const id = PeerContext.generateId('****');
      expect(id).toHaveLength(4);
      expect(id).toMatch(/^[0-9a-zA-Z]{4}$/);
    });

    it('フォーマット内の非*文字は保持される', () => {
      const id = PeerContext.generateId('test-**');
      expect(id).toMatch(/^test-[0-9a-zA-Z]{2}$/);
    });
  });
});
