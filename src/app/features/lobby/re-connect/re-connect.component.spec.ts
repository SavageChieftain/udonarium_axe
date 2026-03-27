import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Network } from '@axe/core/index';
import { PeerContext } from '@axe/core/network/peer-context';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

import {
  createExpectedPeerIdSet,
  isReconnectCompleted,
  ReConnectComponent,
  resolveReconnectUserId,
} from './re-connect.component';

describe('ReConnectComponent', () => {
  let component: ReConnectComponent;
  let fixture: ComponentFixture<ReConnectComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [ReConnectComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ReConnectComponent);
    component = fixture.componentInstance;
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  it('再接続時は保持済みuserIdを優先すること', () => {
    expect(resolveReconnectUserId('persisted-user', 'current-user')).toBe('persisted-user');
  });

  it('保持済みがない場合は現在のuserIdを使うこと', () => {
    expect(resolveReconnectUserId('', 'current-user')).toBe('current-user');
  });

  it('期待ピア一覧から自分自身を除外すること', () => {
    const peerContexts = [PeerContext.parse('self-peer'), PeerContext.parse('peer-a'), PeerContext.parse('peer-b')];

    const expected = createExpectedPeerIdSet(peerContexts, 'self-peer');

    expect(expected.has('self-peer')).toBe(false);
    expect(expected.has('peer-a')).toBe(true);
    expect(expected.has('peer-b')).toBe(true);
  });

  it('期待ピアが全て観測されたときのみ再接続完了と判定すること', () => {
    const expected = new Set(['peer-a', 'peer-b']);

    expect(isReconnectCompleted(expected, new Set())).toBe(false);
    expect(isReconnectCompleted(expected, new Set(['peer-a']))).toBe(false);
    expect(isReconnectCompleted(expected, new Set(['peer-a', 'peer-b']))).toBe(true);
  });

  it('forceCleanup 無効時は deleteObject を実行しないこと', () => {
    component.networkService = {
      peerContext: { userId: 'current-user' },
    } as unknown as typeof Network;
    component.roomId = 'room-id';
    component.roomName = 'room-name';
    component.rooms = [{ alias: 'room-idroom-name', roomName: 'room-name', peerContexts: [] }];
    component.forceCleanup = false;

    const disconnectSpy = vi.spyOn(component, 'disConnect').mockImplementation(() => undefined);
    const deleteSpy = vi.spyOn(component, 'deleteObject').mockImplementation(() => undefined);
    const connectSpy = vi.spyOn(component, 'connect').mockResolvedValue(undefined);

    component.reConnect();

    expect(disconnectSpy).toHaveBeenCalledOnce();
    expect(deleteSpy).not.toHaveBeenCalled();
    expect(connectSpy).toHaveBeenCalledOnce();
  });

  it('forceCleanup 有効時は deleteObject を実行すること', () => {
    component.networkService = {
      peerContext: { userId: 'current-user' },
    } as unknown as typeof Network;
    component.roomId = 'room-id';
    component.roomName = 'room-name';
    component.rooms = [{ alias: 'room-idroom-name', roomName: 'room-name', peerContexts: [] }];
    component.forceCleanup = true;

    vi.spyOn(component, 'disConnect').mockImplementation(() => undefined);
    const deleteSpy = vi.spyOn(component, 'deleteObject').mockImplementation(() => undefined);
    vi.spyOn(component, 'connect').mockResolvedValue(undefined);

    component.reConnect();

    expect(deleteSpy).toHaveBeenCalledOnce();
  });
});
