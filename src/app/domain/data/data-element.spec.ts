import { TestBed } from '@angular/core/testing';
import { ObjectStore } from '@axe/core/sync/object-store';
import { DataElement, DataElementType } from '@axe/domain/data/data-element';

describe('DataElement', () => {
  let store: ObjectStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = ObjectStore.instance;
    // Clear any existing objects from previous tests
    const allObjects = store.getObjects();
    allObjects.forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
  });

  afterEach(() => {
    // Cleanup after each test
    const allObjects = store.getObjects();
    allObjects.forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create a DataElement instance', () => {
      const element = new DataElement();
      expect(element).toBeTruthy();
      expect(element).toBeInstanceOf(DataElement);
    });

    it('should accept an identifier parameter', () => {
      const element = new DataElement('test-identifier');
      expect(element.identifier).toBe('test-identifier');
    });
  });

  describe('create()', () => {
    it('should create a DataElement with name and value', () => {
      const element = DataElement.create('testName', 'testValue');

      expect(element.name).toBe('testName');
      expect(element.value).toBe('testValue');
    });

    it('should create with default empty value', () => {
      const element = DataElement.create('testName');

      expect(element.name).toBe('testName');
      expect(element.value).toBe('');
    });

    it('should create with numeric value', () => {
      const element = DataElement.create('hp', 100);

      expect(element.name).toBe('hp');
      expect(element.value).toBe(100);
    });

    it('should create with custom attributes', () => {
      const attributes = { type: DataElementType.NOTE, max: '10' };
      const element = DataElement.create('memo', 'text', attributes);

      expect(element.name).toBe('memo');
      expect(element.value).toBe('text');
      expect(element.getAttribute('type')).toBe('note');
      expect(element.getAttribute('max')).toBe('10');
    });

    it('should create with specific identifier when provided', () => {
      const element = DataElement.create('test', 'value', {}, 'custom-id');

      expect(element.identifier).toBe('custom-id');
    });

    it('should add element to ObjectStore', () => {
      const element = DataElement.create('test', 'value');

      expect(store.get(element.identifier)).toBe(element);
    });
  });

  describe('type getters', () => {
    it('should identify numberResource type', () => {
      const element = new DataElement();
      element.type = DataElementType.NUMBER_RESOURCE;

      expect(element.isNumberResource).toBe(true);
      expect(element.isNote).toBe(false);
    });

    it('should identify note type', () => {
      const element = new DataElement();
      element.type = DataElementType.NOTE;

      expect(element.isNote).toBe(true);
      expect(element.isNumberResource).toBe(false);
    });

    it('should return false when type is not set', () => {
      const element = new DataElement();

      expect(element.isNumberResource).toBe(false);
      expect(element.isNote).toBe(false);
    });

    it('should return false for unknown type', () => {
      const element = new DataElement();
      element.type = 'unknown';

      expect(element.isNumberResource).toBe(false);
      expect(element.isNote).toBe(false);
    });
  });

  describe('getElementsByName()', () => {
    it('should find direct children by name', () => {
      const parent = DataElement.create('parent', '');
      const child1 = DataElement.create('target', 'value1');
      const child2 = DataElement.create('other', 'value2');

      parent.appendChild(child1);
      parent.appendChild(child2);

      const results = parent.getElementsByName('target');

      expect(results.length).toBe(1);
      expect(results[0]).toBe(child1);
    });

    it('should find nested children by name', () => {
      const parent = DataElement.create('parent', '');
      const child = DataElement.create('child', '');
      const grandchild = DataElement.create('target', 'value');

      parent.appendChild(child);
      child.appendChild(grandchild);

      const results = parent.getElementsByName('target');

      expect(results.length).toBe(1);
      expect(results[0]).toBe(grandchild);
    });

    it('should find multiple elements with same name', () => {
      const parent = DataElement.create('parent', '');
      const child1 = DataElement.create('target', 'value1');
      const child2 = DataElement.create('target', 'value2');

      parent.appendChild(child1);
      parent.appendChild(child2);

      const results = parent.getElementsByName('target');

      expect(results.length).toBe(2);
      expect(results).toContain(child1);
      expect(results).toContain(child2);
    });

    it('should return empty array when name not found', () => {
      const parent = DataElement.create('parent', '');
      const child = DataElement.create('child', 'value');

      parent.appendChild(child);

      const results = parent.getElementsByName('nonexistent');

      expect(results).toEqual([]);
    });

    it('should return empty array when no children exist', () => {
      const element = DataElement.create('element', '');

      const results = element.getElementsByName('anything');

      expect(results).toEqual([]);
    });
  });

  describe('getElementsByType()', () => {
    it('should find direct children by type', () => {
      const parent = DataElement.create('parent', '');
      const child1 = DataElement.create('child1', '', { type: DataElementType.NOTE });
      const child2 = DataElement.create('child2', '', { type: DataElementType.NUMBER_RESOURCE });

      parent.appendChild(child1);
      parent.appendChild(child2);

      const results = parent.getElementsByType(DataElementType.NOTE);

      expect(results.length).toBe(1);
      expect(results[0]).toBe(child1);
    });

    it('should find nested children by type', () => {
      const parent = DataElement.create('parent', '');
      const child = DataElement.create('child', '');
      const grandchild = DataElement.create('grandchild', '', { type: DataElementType.NOTE });

      parent.appendChild(child);
      child.appendChild(grandchild);

      const results = parent.getElementsByType(DataElementType.NOTE);

      expect(results.length).toBe(1);
      expect(results[0]).toBe(grandchild);
    });

    it('should find multiple elements with same type', () => {
      const parent = DataElement.create('parent', '');
      const child1 = DataElement.create('child1', '', { type: DataElementType.NOTE });
      const child2 = DataElement.create('child2', '', { type: DataElementType.NOTE });

      parent.appendChild(child1);
      parent.appendChild(child2);

      const results = parent.getElementsByType(DataElementType.NOTE);

      expect(results.length).toBe(2);
      expect(results).toContain(child1);
      expect(results).toContain(child2);
    });

    it('should return empty array when type not found', () => {
      const parent = DataElement.create('parent', '');
      const child = DataElement.create('child', '', { type: DataElementType.NOTE });

      parent.appendChild(child);

      const results = parent.getElementsByType(DataElementType.NUMBER_RESOURCE);

      expect(results).toEqual([]);
    });
  });

  describe('getFirstElementByName()', () => {
    it('should return first direct child by name', () => {
      const parent = DataElement.create('parent', '');
      const child1 = DataElement.create('target', 'first');
      const child2 = DataElement.create('target', 'second');

      parent.appendChild(child1);
      parent.appendChild(child2);

      const result = parent.getFirstElementByName('target');

      expect(result).toBe(child1);
    });

    it('should return first nested child by name', () => {
      const parent = DataElement.create('parent', '');
      const child = DataElement.create('child', '');
      const grandchild = DataElement.create('target', 'value');

      parent.appendChild(child);
      child.appendChild(grandchild);

      const result = parent.getFirstElementByName('target');

      expect(result).toBe(grandchild);
    });

    it('should return null when name not found', () => {
      const parent = DataElement.create('parent', '');
      const child = DataElement.create('child', 'value');

      parent.appendChild(child);

      const result = parent.getFirstElementByName('nonexistent');

      expect(result).toBeNull();
    });

    it('should return null when no children exist', () => {
      const element = DataElement.create('element', '');

      const result = element.getFirstElementByName('anything');

      expect(result).toBeNull();
    });
  });

  describe('myIdentifer', () => {
    it('should return the identifier of the element', () => {
      const element = new DataElement('test-id-123');

      expect(element.myIdentifer).toBe('test-id-123');
    });

    it('should return auto-generated identifier', () => {
      const element = new DataElement();
      const identifier = element.identifier;

      expect(element.myIdentifer).toBe(identifier);
      expect(element.myIdentifer).toBeTruthy();
    });
  });

  describe('nowValueColor', () => {
    it('should return red color for SAN below 80%', () => {
      const element = DataElement.create('SAN', 10, { type: DataElementType.NUMBER_RESOURCE });
      element.currentValue = 6; // 6/10 = 60% < 80%

      const color = element.nowValueColor;

      expect(color).toBe('#D22');
    });

    it('should return red color for san (lowercase) below 80%', () => {
      const element = DataElement.create('san', 10, { type: DataElementType.NUMBER_RESOURCE });
      element.currentValue = 7; // 7/10 = 70% < 80%

      const color = element.nowValueColor;

      expect(color).toBe('#D22');
    });

    it('should return red color for 正気度 below 80%', () => {
      const element = DataElement.create('正気度', 100, { type: DataElementType.NUMBER_RESOURCE });
      element.currentValue = 70; // 70/100 = 70% < 80%

      const color = element.nowValueColor;

      expect(color).toBe('#D22');
    });

    it('should return red color for SAN at exactly 80%', () => {
      const element = DataElement.create('SAN', 10, { type: DataElementType.NUMBER_RESOURCE });
      element.currentValue = 8; // 8/10 = 80%, condition is <=

      const color = element.nowValueColor;

      expect(color).toBe('#D22');
    });

    it('should return default color for SAN above 80%', () => {
      const element = DataElement.create('SAN', 10, { type: DataElementType.NUMBER_RESOURCE });
      element.currentValue = 9; // 9/10 = 90% > 80%

      const color = element.nowValueColor;

      expect(color).toBe('#444');
    });

    it('should return default color for non-SAN numberResource', () => {
      const element = DataElement.create('HP', 10, { type: DataElementType.NUMBER_RESOURCE });
      element.currentValue = 5;

      const color = element.nowValueColor;

      expect(color).toBe('#444');
    });

    it('should return default color for non-numberResource type', () => {
      const element = DataElement.create('SAN', 10, { type: DataElementType.NOTE });
      element.currentValue = 5;

      const color = element.nowValueColor;

      expect(color).toBe('#444');
    });

    it('should return default color when type is not set', () => {
      const element = DataElement.create('SAN', 10);
      element.currentValue = 5;

      const color = element.nowValueColor;

      expect(color).toBe('#444');
    });

    it('should handle string values correctly', () => {
      const element = DataElement.create('SAN', 'max', { type: DataElementType.NUMBER_RESOURCE });
      element.currentValue = 'current';

      const color = element.nowValueColor;

      expect(color).toBe('#444');
    });
  });

  describe('SyncVar properties', () => {
    it('should have name property synchronized', () => {
      const element = new DataElement();
      element.name = 'testName';

      expect(element.name).toBe('testName');
    });

    it('should have type property synchronized', () => {
      const element = new DataElement();
      element.type = DataElementType.NUMBER_RESOURCE;

      expect(element.type).toBe('numberResource');
    });

    it('should have currentValue property synchronized', () => {
      const element = new DataElement();
      element.currentValue = 42;

      expect(element.currentValue).toBe(42);
    });

    it('should accept string currentValue', () => {
      const element = new DataElement();
      element.currentValue = 'text value';

      expect(element.currentValue).toBe('text value');
    });
  });
});
