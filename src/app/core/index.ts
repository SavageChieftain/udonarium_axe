import { Network as _Network } from './network/network';

export type { EventContext, NetworkMessage } from './network/network-messaging';
export { initializeNetworkMessaging, localDispatch, networkMessage$, networkSend } from './network/network-messaging';

export const Network = _Network.instance;
