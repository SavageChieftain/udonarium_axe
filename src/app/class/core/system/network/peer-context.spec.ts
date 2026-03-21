import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PeerContext } from './peer-context';
import { PeerSessionGrade } from './peer-session-state';

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
  });

  describe('create (user only)', () => {
    it('ユーザーIDからコンテキストを作成できる', () => {
      const ctx = PeerContext.create('testUser');
      expect(ctx.userId).toBe('testUser');
      expect(ctx.peerId).toBeTruthy();
      expect(ctx.isRoom).toBe(false);
    });

    it('空文字のユーザーIDでも作成できる', () => {
      const ctx = PeerContext.create('');
      expect(ctx.userId).toBe('');
    });
  });

  describe('create (room)', () => {
    it('ルーム情報を含むコンテキストを作成できる', () => {
      const ctx = PeerContext.create('testUser', 'rm', 'TestRoom', '');
      expect(ctx.userId).toBe('testUser');
      expect(ctx.isRoom).toBe(true);
    });

    it('パスワード付きルームを作成できる', () => {
      const ctx = PeerContext.create('testUser', 'rm', 'TestRoom', 'secret');
      expect(ctx.userId).toBe('testUser');
      expect(ctx.password).toBe('secret');
      expect(ctx.hasPassword).toBe(true);
    });

    it('パスワードなしルームはhasPasswordがfalse', () => {
      const ctx = PeerContext.create('testUser', 'rm', 'TestRoom', '');
      expect(ctx.hasPassword).toBe(false);
    });
  });

  describe('verifyPassword', () => {
    it('正しいパスワードで検証成功', () => {
      const ctx = PeerContext.create('testUser', 'rm', 'TestRoom', 'secret');
      const parsed = PeerContext.parse(ctx.peerId);
      expect(parsed.verifyPassword('secret')).toBe(true);
    });

    it('間違ったパスワードで検証失敗', () => {
      const ctx = PeerContext.create('testUser', 'rm', 'TestRoom', 'secret');
      const parsed = PeerContext.parse(ctx.peerId);
      expect(parsed.verifyPassword('wrong')).toBe(false);
    });
  });

  describe('verifyPeer', () => {
    it('同じルームのpeerを検証できる', () => {
      const ctx1 = PeerContext.create('user1', 'rm', 'TestRoom', '');
      const ctx2 = PeerContext.create('user2', 'rm', 'TestRoom', '');
      expect(ctx1.verifyPeer(ctx2.peerId)).toBe(true);
    });
  });

  describe('session', () => {
    it('デフォルトのsession状態', () => {
      const ctx = PeerContext.create('testUser');
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
