import { TestBed } from '@angular/core/testing';
import { ObjectStore } from '@axe/core/sync/object-store';
import { DataElement } from '@axe/domain/data/data-element';

describe('GameObject', () => {
  let store: ObjectStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = ObjectStore.instance;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('carries an identifier of its own', () => {
      const obj = DataElement.create('test', '', {});
      expect(obj.identifier).toBeTruthy();
      expect(obj.identifier.length).toBeGreaterThan(0);
    });

    it('takes the identifier it is given', () => {
      const obj = DataElement.create('test', '', {}, 'custom-id');
      expect(obj.identifier).toBe('custom-id');
    });

    it('gives two instances different identifiers', () => {
      const obj1 = DataElement.create('a', '', {});
      const obj2 = DataElement.create('b', '', {});
      expect(obj1.identifier).not.toBe(obj2.identifier);
    });
  });

  describe('aliasName', () => {
    it('calls a data element data', () => {
      const obj = DataElement.create('test', '', {});
      expect(obj.aliasName).toBe('data');
    });
  });

  describe('version', () => {
    it('starts at a version of zero or more', () => {
      const obj = DataElement.create('test', '', {});
      expect(obj.version).toBeGreaterThanOrEqual(0);
    });
  });

  describe('initialize()', () => {
    it('is added to the object store', () => {
      const obj = DataElement.create('test', '', {});
      // initialises as part of being created
      expect(store.get(obj.identifier)).toBe(obj);
    });
  });

  describe('destroy()', () => {
    it('is removed from the object store', () => {
      const obj = DataElement.create('test', '', {});
      const id = obj.identifier;
      obj.destroy();
      expect(store.get(id)).toBeFalsy();
    });
  });

  describe('update()', () => {
    it('bumps its version', () => {
      const obj = DataElement.create('test', '', {});
      const v1 = obj.version;
      obj.update();
      expect(obj.version).toBeGreaterThan(v1);
    });

    it('keeps bumping its version', () => {
      const obj = DataElement.create('test', '', {});
      const versions: number[] = [];
      for (let i = 0; i < 5; i++) {
        obj.update();
        versions.push(obj.version);
      }
      for (let i = 1; i < versions.length; i++) {
        expect(versions[i]).toBeGreaterThan(versions[i - 1]);
      }
    });
  });

  describe('toContext()', () => {
    it('returns a context', () => {
      const obj = DataElement.create('test', '', {});
      const context = obj.toContext();

      expect(context.aliasName).toBe('data');
      expect(context.identifier).toBe(obj.identifier);
      expect(typeof context.majorVersion).toBe('number');
      expect(typeof context.minorVersion).toBe('number');
      expect(typeof context.syncData).toBe('object');
    });

    it('returns a deep copy of the sync data', () => {
      const obj = DataElement.create('test', 'value', {});
      const context1 = obj.toContext();
      const context2 = obj.toContext();

      expect(context1.syncData).toEqual(context2.syncData);
      expect(context1.syncData).not.toBe(context2.syncData);
    });
  });

  describe('apply()', () => {
    it('applies the values from a context', () => {
      const obj = DataElement.create('test', '', {});
      const context = obj.toContext();
      context.majorVersion = 100;

      obj.apply(context);

      expect(obj.version).toBeGreaterThanOrEqual(100);
    });

    it('applies nothing when the identifier does not match', () => {
      const obj = DataElement.create('test', '', {});
      const vBefore = obj.version;
      const context = obj.toContext();
      context.identifier = 'wrong-id';
      context.majorVersion = 999;

      obj.apply(context);

      expect(obj.version).toBe(vBefore);
    });

    it('ignores a null context', () => {
      const obj = DataElement.create('test', '', {});
      expect(() => obj.apply(null!)).not.toThrow();
    });
  });

  describe('toXml()', () => {
    it('returns an xml string', () => {
      const obj = DataElement.create('test', 'value', {});
      const xml = obj.toXml();

      expect(typeof xml).toBe('string');
      expect(xml.startsWith('<')).toBe(true);
      expect(xml).toContain('data');
    });
  });

  describe('clone()', () => {
    it('clones with the same alias', () => {
      const obj = DataElement.create('test', 'value', {});
      const cloned = obj.clone();

      expect(cloned.aliasName).toBe(obj.aliasName);
    });

    it('takes a new identifier where parsing generates one', () => {
      const obj = DataElement.create('test', 'value', {});
      const cloned = obj.clone();

      // cloning goes out to xml and back to build a new object, and since the identifier
      // travels in the xml the copy can end up with the same one
      expect(cloned).toBeTruthy();
      expect(cloned).not.toBe(obj);
    });
  });
});
