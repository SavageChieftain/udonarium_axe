import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Listener } from './listener';
import { EventSystem } from './event-system';
import { Event } from './event';

describe('Listener', () => {
  let key: object;

  beforeEach(() => {
    key = {};
  });

  afterEach(() => {
    EventSystem.instance.unregister(key);
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('subject/keyが設定される', () => {
      const listener = new Listener(EventSystem.instance, key);
      expect(listener.subject).toBe(EventSystem.instance);
      expect(listener.key).toBe(key);
    });

    it('初期状態でisRegistered=false', () => {
      const listener = new Listener(EventSystem.instance, key);
      expect(listener.isRegistered).toBe(false);
    });
  });

  describe('on', () => {
    it('イベントを登録してコールバックが呼ばれる', () => {
      const callback = vi.fn();
      const listener = new Listener(EventSystem.instance, key);
      listener.on('TEST_LISTENER_EVENT', callback);
      expect(listener.isRegistered).toBe(true);

      EventSystem.instance.trigger('TEST_LISTENER_EVENT', { value: 42 });
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('優先度付きで登録できる', () => {
      const callback = vi.fn();
      const listener = new Listener(EventSystem.instance, key);
      listener.on('TEST_PRIORITY', 10, callback);
      expect(listener.isRegistered).toBe(true);
      expect(listener.priority).toBe(10);
    });
  });

  describe('once', () => {
    it('一度だけコールバックが呼ばれる', () => {
      const callback = vi.fn();
      const listener = new Listener(EventSystem.instance, key);
      listener.once('TEST_ONCE_EVENT', callback);

      EventSystem.instance.trigger('TEST_ONCE_EVENT', {});
      EventSystem.instance.trigger('TEST_ONCE_EVENT', {});
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('unregister', () => {
    it('登録を解除する', () => {
      const callback = vi.fn();
      const listener = new Listener(EventSystem.instance, key);
      listener.on('TEST_UNREG', callback);
      listener.unregister();
      expect(listener.isRegistered).toBe(false);

      EventSystem.instance.trigger('TEST_UNREG', {});
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('trigger', () => {
    it('コールバックにイベントを渡す', () => {
      const callback = vi.fn();
      const listener = new Listener(EventSystem.instance, key);
      listener.on('TEST_TRIGGER', callback);

      const event = new Event('TEST_TRIGGER', { data: 'test' });
      listener.trigger(event);
      expect(callback).toHaveBeenCalled();
      expect(callback.mock.calls[0][0].data).toEqual({ data: 'test' });
    });
  });

  describe('isEqual', () => {
    it('同一key/eventName/callbackでtrue', () => {
      const callback = vi.fn();
      const listener = new Listener(EventSystem.instance, key);
      listener.on('TEST_EQUAL', callback);
      expect(listener.isEqual(key, 'TEST_EQUAL', callback)).toBe(true);
    });

    it('keyがnullでワイルドカードマッチ', () => {
      const callback = vi.fn();
      const listener = new Listener(EventSystem.instance, key);
      listener.on('TEST_EQUAL2', callback);
      expect(listener.isEqual(null, 'TEST_EQUAL2', callback)).toBe(true);
    });

    it('不一致でfalse', () => {
      const callback = vi.fn();
      const listener = new Listener(EventSystem.instance, key);
      listener.on('TEST_EQUAL3', callback);
      const otherKey = {};
      expect(listener.isEqual(otherKey, 'TEST_EQUAL3', callback)).toBe(false);
    });
  });
});
