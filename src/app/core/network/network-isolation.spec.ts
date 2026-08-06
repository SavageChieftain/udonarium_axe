import { Network } from '@axe/core/network/network';
import { isNetworkIsolated, setNetworkIsolated } from '@axe/core/network/network-isolation';
import { networkSend } from '@axe/core/network/network-messaging';

describe('network isolation', () => {
  afterEach(() => {
    setNetworkIsolated(false);
    vi.restoreAllMocks();
  });

  it('既定では隔離していないこと', () => {
    expect(isNetworkIsolated()).toBe(false);
  });

  it('隔離中は送信しないこと', () => {
    const send = vi.spyOn(Network.instance, 'send').mockImplementation(() => undefined);

    networkSend('UPDATE_GAME_OBJECT', { identifier: 'c1' });
    expect(send).toHaveBeenCalledTimes(1);

    setNetworkIsolated(true);
    networkSend('UPDATE_GAME_OBJECT', { identifier: 'c1' });
    expect(send).toHaveBeenCalledTimes(1);

    setNetworkIsolated(false);
    networkSend('UPDATE_GAME_OBJECT', { identifier: 'c1' });
    expect(send).toHaveBeenCalledTimes(2);
  });
});
