import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Event } from './event';
import { Network } from '@axe/core/system/network/network';

describe('Event', () => {
  describe('constructor', () => {
    it('eventNameが設定される', () => {
      const event = new Event('TEST_EVENT', { value: 1 });
      expect(event.eventName).toBe('TEST_EVENT');
    });

    it('dataが設定される', () => {
      const data = { key: 'value' };
      const event = new Event('TEST_EVENT', data);
      expect(event.data).toBe(data);
    });

    it('sendFromのデフォルトはNetwork.instance.peerId', () => {
      const event = new Event('TEST_EVENT', null);
      expect(event.sendFrom).toBe(Network.instance.peerId);
    });

    it('sendFromを指定できる', () => {
      const event = new Event('TEST_EVENT', null, 'custom-peer');
      expect(event.sendFrom).toBe('custom-peer');
    });

    it('自分からの送信はisSendFromSelf=true', () => {
      const event = new Event('TEST_EVENT', null, Network.instance.peerId);
      expect(event.isSendFromSelf).toBe(true);
    });

    it('他者からの送信はisSendFromSelf=false', () => {
      const event = new Event('TEST_EVENT', null, 'other-peer');
      expect(event.isSendFromSelf).toBe(false);
    });
  });

  describe('toContext', () => {
    it('EventContextを返す', () => {
      const event = new Event('MY_EVENT', { foo: 'bar' }, 'sender');
      const ctx = event.toContext();
      expect(ctx.eventName).toBe('MY_EVENT');
      expect(ctx.data).toEqual({ foo: 'bar' });
      expect(ctx.sendFrom).toBe('sender');
    });
  });
});
