import { Event } from './event';
import { EventSystem } from './event-system';

describe('EventSystem', () => {
  let key: object;

  beforeEach(() => {
    key = {};
  });

  afterEach(() => {
    EventSystem.instance.unregister(key);
    vi.restoreAllMocks();
  });

  describe('instance (singleton)', () => {
    it('シングルトンインスタンスを返す', () => {
      expect(EventSystem.instance).toBe(EventSystem.instance);
    });
  });

  describe('register / unregister', () => {
    it('keyでListenerを登録できる', () => {
      const observer = EventSystem.instance.register(key);
      expect(observer).toBeTruthy();
    });

    it('Listenerをunregisterで解除できる', () => {
      const callback = vi.fn();
      const observer = EventSystem.instance.register(key);
      observer.on('ES_UNREG_TEST', callback);
      // observer自体がregisterされたListenerなのでunregisterできる
      observer.unregister();
      EventSystem.instance.trigger('ES_UNREG_TEST', {});
      expect(callback).not.toHaveBeenCalled();
    });

    it('特定Listenerのみ解除できる', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const observer1 = EventSystem.instance.register(key);
      observer1.on('ES_UNREG_A', callback1);
      EventSystem.instance.register(key).on('ES_UNREG_B', callback2);
      observer1.unregister();
      EventSystem.instance.trigger('ES_UNREG_A', {});
      EventSystem.instance.trigger('ES_UNREG_B', {});
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledTimes(1);
    });
  });

  describe('trigger', () => {
    it('文字列+データでイベントを発火できる', () => {
      const callback = vi.fn();
      EventSystem.instance.register(key).on('ES_TRIGGER_STR', callback);
      const event = EventSystem.instance.trigger('ES_TRIGGER_STR', { value: 1 });
      expect(event).toBeInstanceOf(Event);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('Eventオブジェクトでイベントを発火できる', () => {
      const callback = vi.fn();
      EventSystem.instance.register(key).on('ES_TRIGGER_OBJ', callback);
      const event = new Event('ES_TRIGGER_OBJ', { value: 2 });
      EventSystem.instance.trigger(event);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('EventContextでイベントを発火できる', () => {
      const callback = vi.fn();
      EventSystem.instance.register(key).on('ES_TRIGGER_CTX', callback);
      EventSystem.instance.trigger({ eventName: 'ES_TRIGGER_CTX', data: {}, sendFrom: 'peer' });
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('ワイルドカード * で全イベントを受信できる', () => {
      const callback = vi.fn();
      EventSystem.instance.register(key).on('*', callback);
      EventSystem.instance.trigger('ES_ANY_EVENT_1', {});
      EventSystem.instance.trigger('ES_ANY_EVENT_2', {});
      expect(callback).toHaveBeenCalledTimes(2);
    });
  });

  describe('priority', () => {
    it('優先度の高いリスナーが先に実行される', () => {
      const order: number[] = [];
      EventSystem.instance.register(key).on('ES_PRIO', 1, () => order.push(1));
      EventSystem.instance.register(key).on('ES_PRIO', 10, () => order.push(10));
      EventSystem.instance.register(key).on('ES_PRIO', 5, () => order.push(5));
      EventSystem.instance.trigger('ES_PRIO', {});
      expect(order).toEqual([10, 5, 1]);
    });
  });
});
