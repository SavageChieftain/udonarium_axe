import { initializeNetworkMessaging, localDispatch, Network, networkMessage$, networkSend } from './index';

describe('system/index re-exports', () => {
  it('Networkシングルトンがエクスポートされている', () => {
    expect(Network).toBeDefined();
  });

  it('NetworkMessaging関数がエクスポートされている', () => {
    expect(typeof networkSend).toBe('function');
    expect(typeof localDispatch).toBe('function');
    expect(typeof initializeNetworkMessaging).toBe('function');
    expect(networkMessage$).toBeDefined();
  });
});
