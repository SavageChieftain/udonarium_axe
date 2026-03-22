vi.mock('@skyway-sdk/core', () => ({
  isRemoteMember: () => false,
  LocalDataStream: class {},
  P2PConnection: class {},
  Publication: class {},
  RemoteDataStream: class {},
  RemoteMember: class {},
  Subscription: class {},
  TransportConnectionState: {},
}));

import { SkyWayDataStream } from './skyway-data-stream';

describe('SkyWayDataStream', () => {
  it('クラスがエクスポートされている', () => {
    expect(SkyWayDataStream).toBeDefined();
  });

  it('EventEmitterを継承している', () => {
    expect(SkyWayDataStream.prototype).toHaveProperty('emit');
    expect(SkyWayDataStream.prototype).toHaveProperty('on');
  });
});
