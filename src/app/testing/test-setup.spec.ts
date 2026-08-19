import { SyncObject } from '@axe/core/sync/decorator';
import { GameObject } from '@axe/core/sync/game-object';
import { ObjectStore } from '@axe/core/sync/object-store';

@SyncObject('test-setup-leftover')
class Leftover extends GameObject {}

describe('the shared test setup', () => {
  it('hands each test an empty object store', () => {
    expect(ObjectStore.instance.getObjects()).toHaveLength(0);

    const leftover = new Leftover('test-setup-leftover-identifier');
    leftover.initialize();

    expect(ObjectStore.instance.getObjects()).toHaveLength(1);
  });

  it('does not carry what the last test made into this one', () => {
    expect(ObjectStore.instance.getObjects()).toHaveLength(0);
  });

  it('frees a fixed identifier again, so registering it twice still takes', () => {
    const first = new Leftover('test-setup-fixed-identifier');
    first.initialize();

    expect(ObjectStore.instance.get('test-setup-fixed-identifier')).toBe(first);
  });

  it('registers the same fixed identifier in the next test', () => {
    const second = new Leftover('test-setup-fixed-identifier');
    second.initialize();

    expect(ObjectStore.instance.get('test-setup-fixed-identifier')).toBe(second);
  });
});
