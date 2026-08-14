import { initializeNetworkMessaging, localDispatch, Network, networkMessage$, networkSend } from '@axe/core/index';

describe('system/index re-exports', () => {
  it('exports the network singleton', () => {
    expect(Network).toBeDefined();
  });

  it('exports the messaging functions', () => {
    expect(typeof networkSend).toBe('function');
    expect(typeof localDispatch).toBe('function');
    expect(typeof initializeNetworkMessaging).toBe('function');
    expect(networkMessage$).toBeDefined();
  });
});
