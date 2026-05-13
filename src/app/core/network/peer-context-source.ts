import { Network } from '@axe/core/network/network';
import { IPeerContext } from '@axe/core/network/peer-context';

/**
 * 現在ピア情報のプロバイダ抽象。domain モデルが「自分は誰か / 他のピアは誰か」を
 * 判定するために参照する唯一のエントリポイント。
 *
 * - 既定: `Network` シングルトンに委譲（実運用）。
 * - テスト: `setPeerContextProvider()` で差し替え可能。`Network` の static accessor を
 *   `vi.spyOn` する必要がなくなり、テストフィクスチャがクリーンになる。
 */
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

/** テスト等で peer 情報をスタブに差し替える。 */
export function setPeerContextProvider(provider: PeerContextProvider): void {
  currentProvider = provider;
}

/** テスト終了時にデフォルト（Network 委譲）へ戻す。 */
export function resetPeerContextProvider(): void {
  currentProvider = defaultProvider;
}

/** 自分の現在 peer 情報。userId / peerId 等の参照に使う。 */
export function getPeerContext(): IPeerContext {
  return currentProvider.peerContext;
}

/** 自分を含む全 peer 情報（オンラインピア）。 */
export function getPeerContexts(): IPeerContext[] {
  return currentProvider.peerContexts;
}

/** 接続中の peerId 一覧。 */
export function getPeerIds(): string[] {
  return currentProvider.peerIds;
}

/** 自分の peerId。`getPeerContext().peerId` のショートカット。 */
export function getMyPeerId(): string {
  return currentProvider.peerId;
}
