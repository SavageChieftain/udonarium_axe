import { PeerContext } from '@axe/core/network/peer-context';
import { PeerSessionGrade } from '@axe/core/network/peer-session-state';

describe('PeerContext', () => {
  describe('parse', () => {
    it('reads a plain peer id', () => {
      const ctx = PeerContext.parse('abcdef');
      expect(ctx.peerId).toBe('abcdef');
      expect(ctx.digestUserId).toBe('abcdef');
      expect(ctx.isRoom).toBe(false);
    });

    it('reads a peer id carrying a room', () => {
      // whether it matches depends on the exact format
      const ctx = PeerContext.parse('simpleId');
      expect(ctx.peerId).toBe('simpleId');
    });

    it('reads the room back out of a peer id it made', async () => {
      const roomName = 'テストルーム日本語';
      const ctx = await PeerContext.createRoom('user', 'abc', roomName, '');
      const parsed = PeerContext.parse(ctx.peerId);

      expect(parsed.isRoom).toBe(true);
      // the room name is not in the id, so reading cannot recover it
      expect(parsed.roomName).toBe('');
      // the digest of the name matches
      expect(parsed.digestRoomName).toBe(ctx.digestRoomName);
      expect(parsed.hasPassword).toBe(false);
    });

    it('the digest matches for a name carrying non-ascii text', async () => {
      const roomName = '🎲ダイスルーム🎲';
      const ctx = await PeerContext.createRoom('user', 'xyz', roomName, '');
      const parsed = PeerContext.parse(ctx.peerId);

      // the name itself cannot be recovered, but the digest confirms it is the same room
      expect(parsed.digestRoomName).toBe(ctx.digestRoomName);
    });

    it('an empty room name survives the round trip', async () => {
      const ctx = await PeerContext.createRoom('user', 'abc', '', '');
      const parsed = PeerContext.parse(ctx.peerId);
      expect(parsed.roomName).toBe('');
      expect(parsed.digestRoomName).toBe(ctx.digestRoomName);
    });

    it('survives a peer id it cannot read', () => {
      const ctx = PeerContext.parse('!!!invalid!!!');
      expect(ctx.peerId).toBe('!!!invalid!!!');
    });
  });

  describe('create (user only)', () => {
    it('builds a context from a user id', async () => {
      const ctx = await PeerContext.create('testUser');
      expect(ctx.userId).toBe('testUser');
      expect(ctx.peerId).toBeTruthy();
      expect(ctx.isRoom).toBe(false);
    });

    it('builds a context from an empty user id', async () => {
      const ctx = await PeerContext.create('');
      expect(ctx.userId).toBe('');
    });
  });

  describe('createRoom', () => {
    it('builds a context carrying a room', async () => {
      const ctx = await PeerContext.createRoom('testUser', 'abc', 'TestRoom', '');
      expect(ctx.userId).toBe('testUser');
      expect(ctx.isRoom).toBe(true);
    });

    it('builds a room with a password', async () => {
      const ctx = await PeerContext.createRoom('testUser', 'abc', 'TestRoom', 'secret');
      expect(ctx.userId).toBe('testUser');
      expect(ctx.password).toBe('secret');
      expect(ctx.hasPassword).toBe(true);
    });

    it('reports no password for a room without one', async () => {
      const ctx = await PeerContext.createRoom('testUser', 'abc', 'TestRoom', '');
      expect(ctx.hasPassword).toBe(false);
    });
  });

  describe('verifyPassword', () => {
    it('accepts the right password', async () => {
      const ctx = await PeerContext.createRoom('testUser', 'abc', 'TestRoom', 'secret');
      const parsed = PeerContext.parse(ctx.peerId);
      // the name normally arrives through the metadata; here it is set by hand
      parsed.roomName = 'TestRoom';
      expect(await parsed.verifyPassword('secret')).toBe(true);
    });

    it('refuses the wrong password', async () => {
      const ctx = await PeerContext.createRoom('testUser', 'abc', 'TestRoom', 'secret');
      const parsed = PeerContext.parse(ctx.peerId);
      parsed.roomName = 'TestRoom';
      expect(await parsed.verifyPassword('wrong')).toBe(false);
    });
  });

  describe('verifyPeer', () => {
    it('accepts a peer from the same room without a password', async () => {
      const ctx1 = await PeerContext.createRoom('user1', 'abc', 'TestRoom', '');
      const ctx2 = await PeerContext.createRoom('user2', 'abc', 'TestRoom', '');
      expect(await ctx1.verifyPeer(ctx2.peerId)).toBe(true);
    });

    it('refuses a peer from a differently named room', async () => {
      // the room id must be three characters to match the pattern
      const ctx1 = await PeerContext.createRoom('user1', 'abc', 'Room1', '');
      const ctx2 = await PeerContext.createRoom('user2', 'abc', 'Room2', '');
      expect(await ctx1.verifyPeer(ctx2.peerId)).toBe(false);
    });

    it('accepts a peer carrying the right password', async () => {
      const ctx1 = await PeerContext.createRoom('user1', 'abc', 'TestRoom', 'secret');
      const ctx2 = await PeerContext.createRoom('user2', 'abc', 'TestRoom', 'secret');
      ctx1.password = 'secret';
      expect(await ctx1.verifyPeer(ctx2.peerId)).toBe(true);
    });

    it('refuses a peer carrying no password', async () => {
      const ctx1 = await PeerContext.createRoom('user1', 'abc', 'TestRoom', 'secret');
      const ctx2 = await PeerContext.createRoom('user2', 'abc', 'TestRoom', 'secret');
      // creating a room sets the password, so clear it to get back to none
      ctx1.password = '';
      expect(await ctx1.verifyPeer(ctx2.peerId)).toBe(false);
    });

    it('refuses a peer that disagrees about whether there is a password', async () => {
      const ctx1 = await PeerContext.createRoom('user1', 'abc', 'TestRoom', '');
      const ctx2 = await PeerContext.createRoom('user2', 'abc', 'TestRoom', 'secret');
      expect(await ctx1.verifyPeer(ctx2.peerId)).toBe(false);
    });
  });

  describe('session', () => {
    it('the session it starts with', async () => {
      const ctx = await PeerContext.create('testUser');
      expect(ctx.session.grade).toBe(PeerSessionGrade.UNSPECIFIED);
      expect(ctx.session.ping).toBe(0);
      expect(ctx.session.health).toBe(0);
      expect(ctx.session.speed).toBe(0);
      expect(ctx.session.description).toBe('');
    });
  });

  describe('generateId', () => {
    it('generates an eight character id by default', () => {
      const id = PeerContext.generateId();
      expect(id).toHaveLength(8);
      expect(id).toMatch(/^[0-9a-zA-Z]{8}$/);
    });

    it('generates an id in the format it is given', () => {
      const id = PeerContext.generateId('****');
      expect(id).toHaveLength(4);
      expect(id).toMatch(/^[0-9a-zA-Z]{4}$/);
    });

    it('keeps the literal characters in the format', () => {
      const id = PeerContext.generateId('test-**');
      expect(id).toMatch(/^test-[0-9a-zA-Z]{2}$/);
    });
  });
});
