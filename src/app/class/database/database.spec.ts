import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock indexedDB before importing Database
const mockObjectStore = {
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  getAll: vi.fn(),
  getAllKeys: vi.fn(),
};
const mockTransaction = {
  objectStore: vi.fn().mockReturnValue(mockObjectStore),
  oncomplete: null as any,
  onerror: null as any,
  onabort: null as any,
};
const mockDB = {
  objectStoreNames: { contains: vi.fn().mockReturnValue(false) },
  createObjectStore: vi.fn(),
  deleteObjectStore: vi.fn(),
  transaction: vi.fn().mockReturnValue(mockTransaction),
  close: vi.fn(),
  onversionchange: null as any,
  onabort: null as any,
  onerror: null as any,
};

if (typeof globalThis.indexedDB === 'undefined') {
  (globalThis as any).IDBTransaction = class {};
  (globalThis as any).IDBRequest = class {};
  (globalThis as any).indexedDB = {
    open: vi.fn().mockImplementation(() => {
      const request: any = {
        result: mockDB,
        error: null,
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
        onblocked: null,
      };
      setTimeout(() => {
        if (request.onsuccess) request.onsuccess({ target: request });
      }, 0);
      return request;
    }),
    deleteDatabase: vi.fn().mockImplementation(() => {
      const request: any = { result: undefined, error: null, onsuccess: null, onerror: null };
      setTimeout(() => {
        if (request.onsuccess) request.onsuccess({ target: request });
      }, 0);
      return request;
    }),
  };
}

import { Database } from './database';

describe('Database', () => {
  describe('constructor', () => {
    it('databaseNameとstoreNameが設定される', () => {
      const db = new Database('test');
      expect(db.databaseName).toBe('Udonarium-IDB-test');
      expect(db.storeName).toBe('ObjectStore');
      expect(db.version).toBe(1);
    });
  });

  describe('open', () => {
    it('openがPromiseを返す', async () => {
      const db = new Database('test-open');
      const result = db.open();
      expect(result).toBeInstanceOf(Promise);
      await result;
    });
  });

  describe('close', () => {
    it('closeがエラーにならない', async () => {
      const db = new Database('test-close');
      await db.open();
      await db.close();
    });
  });
});
