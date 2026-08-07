import { Network } from '@axe/core/network/network';
import { isNetworkIsolated, setNetworkIsolated } from '@axe/core/network/network-isolation';
import { networkMessage$, networkSend } from '@axe/core/network/network-messaging';

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

  it('隔離中でも自分の手元には届くこと', () => {
    vi.spyOn(Network.instance, 'send').mockImplementation(() => undefined);
    const seen: string[] = [];
    const stop = networkMessage$.subscribe((message) => seen.push(message.eventName));

    setNetworkIsolated(true);
    networkSend('SOUND_EFFECT', 'se-1');
    networkSend('UPDATE_GAME_OBJECT', { identifier: 'c1' });

    expect(seen).toEqual(['SOUND_EFFECT', 'UPDATE_GAME_OBJECT']);
    stop();
  });

  it('隔離中に他人宛てのものは手元にも残さないこと', () => {
    vi.spyOn(Network.instance, 'send').mockImplementation(() => undefined);
    const seen: string[] = [];
    const stop = networkMessage$.subscribe((message) => seen.push(message.eventName));

    setNetworkIsolated(true);
    networkSend('WRITING_A_MESSAGE', 'tab-1', 'someone-else');

    expect(seen).toEqual([]);
    stop();
  });
});
