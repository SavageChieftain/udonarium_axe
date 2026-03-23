import { TestBed } from '@angular/core/testing';
import { childrenChanged$, objectChanged$ } from '@axe/class/core/synchronize-object/object-event-extension';
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
});
