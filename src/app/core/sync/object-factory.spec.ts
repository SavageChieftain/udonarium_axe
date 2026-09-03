import { TestBed } from '@angular/core/testing';
import { GameObject } from '@axe/core/sync/game-object';
import { ObjectFactory } from '@axe/core/sync/object-factory';

describe('ObjectFactory', () => {
  let factory: ObjectFactory;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    factory = ObjectFactory.instance;
  });

  afterEach(() => {
    // cleaning up the object store
    vi.clearAllMocks();
  });

  describe('instance', () => {
    it('returns the one instance', () => {
      const instance1 = ObjectFactory.instance;
      const instance2 = ObjectFactory.instance;
      expect(instance1).toBe(instance2);
    });

    it('is an object factory', () => {
      expect(factory).toBeInstanceOf(ObjectFactory);
    });
  });

  describe('register()', () => {
    it('reads the alias of a registered class', () => {
      // the base class registers itself on load
      // check that a decorated class can be looked up by alias
      const alias = factory.getAlias(GameObject);
      expect(typeof alias).toBe('string');
    });
  });

  describe('create()', () => {
    it('builds an instance from a registered alias', () => {
      // the data element registers itself as data
      const obj = factory.create('data');
      expect(obj).toBeTruthy();
      expect(obj).toBeInstanceOf(GameObject);
    });

    it('builds an instance with a given identifier', () => {
      const obj = factory.create('data', 'test-id');
      expect(obj).toBeTruthy();
      expect(obj!.identifier).toBe('test-id');
    });

    it('returns nothing for an alias it does not know', () => {
      const obj = factory.create('nonexistent-alias');
      expect(obj).toBeNull();
    });
  });

  describe('getAlias()', () => {
    it('returns nothing for a class it does not know', () => {
      class UnregisteredClass extends GameObject {}
      const alias = factory.getAlias(UnregisteredClass);
      expect(alias).toBe('');
    });
  });
});
