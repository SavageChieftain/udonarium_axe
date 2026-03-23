import { TestBed } from '@angular/core/testing';
import { childrenChanged$, objectChanged$ } from '@axe/class/core/synchronize-object/object-event-extension';
import { EventSystem } from '@axe/class/core/system';
import { firstValueFrom } from 'rxjs';

import { ObjectChangeService } from './object-change.service';

describe('ObjectChangeService', () => {
  let service: ObjectChangeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ObjectChangeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should expose objectChanged$ observable', () => {
    expect(service.objectChanged$).toBeTruthy();
  });

  it('should expose childrenChanged$ observable', () => {
    expect(service.childrenChanged$).toBeTruthy();
  });

  it('should expose objectDeleted$ observable', () => {
    expect(service.objectDeleted$).toBeTruthy();
  });

  it('should expose fileSyncList$ observable', () => {
    expect(service.fileSyncList$).toBeTruthy();
  });

  it('should expose fileResourceUpdated$ observable', () => {
    expect(service.fileResourceUpdated$).toBeTruthy();
  });

  it('should expose peerConnect$ observable', () => {
    expect(service.peerConnect$).toBeTruthy();
  });

  it('should expose peerDisconnect$ observable', () => {
    expect(service.peerDisconnect$).toBeTruthy();
  });

  it('should expose networkOpen$ observable', () => {
    expect(service.networkOpen$).toBeTruthy();
  });

  it('should emit on objectChanged$ when objectChanged$ Subject fires', async () => {
    const testData = { identifier: 'test-id', aliasName: 'TestAlias' };
    const promise = firstValueFrom(service.objectChanged$);
    objectChanged$.next(testData);
    const event = await promise;
    expect(event.identifier).toBe('test-id');
    expect(event.aliasName).toBe('TestAlias');
  });

  it('should emit on childrenChanged$ when childrenChanged$ Subject fires', async () => {
    const testData = { identifier: 'child-id' };
    const promise = firstValueFrom(service.childrenChanged$);
    childrenChanged$.next(testData);
    const event = await promise;
    expect(event.identifier).toBe('child-id');
  });

  it('should emit on objectDeleted$ when DELETE_GAME_OBJECT fires', async () => {
    const promise = firstValueFrom(service.objectDeleted$);
    EventSystem.trigger('DELETE_GAME_OBJECT', {
      identifier: 'del-id',
      aliasName: 'GameCharacter',
    });
    const event = await promise;
    expect(event.identifier).toBe('del-id');
    expect(event.aliasName).toBe('GameCharacter');
  });

  it('should emit on peerConnect$ when CONNECT_PEER fires', async () => {
    const promise = firstValueFrom(service.peerConnect$);
    EventSystem.trigger('CONNECT_PEER', { peerId: 'peer-123' });
    const event = await promise;
    expect(event.peerId).toBe('peer-123');
  });

  it('should emit on peerDisconnect$ when DISCONNECT_PEER fires', async () => {
    const promise = firstValueFrom(service.peerDisconnect$);
    EventSystem.trigger('DISCONNECT_PEER', { peerId: 'peer-456' });
    const event = await promise;
    expect(event.peerId).toBe('peer-456');
  });

  it('should emit on networkOpen$ when OPEN_NETWORK fires', async () => {
    const promise = firstValueFrom(service.networkOpen$);
    EventSystem.trigger('OPEN_NETWORK', { peerId: 'my-peer' });
    const event = await promise;
    expect(event.peerId).toBe('my-peer');
  });
});
