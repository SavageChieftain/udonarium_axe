import { Network } from '@axe/core/network/network';
import { IPeerContext } from '@axe/core/network/peer-context';

export interface PeerContextProvider {
  readonly peerContext: IPeerContext;
  readonly peerContexts: IPeerContext[];
  readonly peerIds: string[];
  readonly peerId: string;
}

const defaultProvider: PeerContextProvider = {
  get peerContext() {
    return Network.peerContext;
  },
  get peerContexts() {
    return Network.peerContexts;
  },
  get peerIds() {
    return Network.peerIds;
  },
  get peerId() {
    return Network.peerId;
  },
};

let currentProvider: PeerContextProvider = defaultProvider;

export function setPeerContextProvider(provider: PeerContextProvider): void {
  currentProvider = provider;
}

export function resetPeerContextProvider(): void {
  currentProvider = defaultProvider;
}

export function getPeerContext(): IPeerContext {
  return currentProvider.peerContext;
}

export function getPeerContexts(): IPeerContext[] {
  return currentProvider.peerContexts;
}

export function getPeerIds(): string[] {
  return currentProvider.peerIds;
}

export function getMyPeerId(): string {
  return currentProvider.peerId;
}
