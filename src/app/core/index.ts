import { Network as _Network } from '@axe/core/network/network';

export type { EventContext, NetworkMessage } from '@axe/core/network/network-messaging';
export {
  initializeNetworkMessaging,
  localDispatch,
  networkMessage$,
  networkSend,
} from '@axe/core/network/network-messaging';

export const Network = _Network.instance;
