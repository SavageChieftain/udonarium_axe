import { EventSystem, Network, Event, Listener } from './index';

describe('system/index re-exports', () => {
  it('EventSystemシングルトンがエクスポートされている', () => {
    expect(EventSystem).toBeDefined();
    expect(typeof EventSystem.register).toBe('function');
    expect(typeof EventSystem.trigger).toBe('function');
  });

  it('Networkシングルトンがエクスポートされている', () => {
    expect(Network).toBeDefined();
  });

  it('Eventクラスがエクスポートされている', () => {
    expect(Event).toBeDefined();
  });

  it('Listenerクラスがエクスポートされている', () => {
    expect(Listener).toBeDefined();
  });
});
