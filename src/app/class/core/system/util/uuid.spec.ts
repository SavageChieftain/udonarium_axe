import { describe, it, expect, vi } from 'vitest';
import { UUID } from './uuid';

describe('UUID', () => {
  describe('generateUuid()', () => {
    it('should generate a valid UUID', () => {
      const uuid = UUID.generateUuid();

      expect(uuid).toBeTruthy();
      expect(typeof uuid).toBe('string');
    });

    it('should generate UUID in correct format (8-4-4-4-12)', () => {
      const uuid = UUID.generateUuid();
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

      expect(uuid).toMatch(uuidPattern);
    });

    it('should generate unique UUIDs', () => {
      const uuid1 = UUID.generateUuid();
      const uuid2 = UUID.generateUuid();
      const uuid3 = UUID.generateUuid();

      expect(uuid1).not.toBe(uuid2);
      expect(uuid2).not.toBe(uuid3);
      expect(uuid1).not.toBe(uuid3);
    });

    it('should generate UUIDs with correct length', () => {
      const uuid = UUID.generateUuid();

      // Format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (36 characters)
      expect(uuid.length).toBe(36);
    });

    it('should generate UUID with version 4 marker', () => {
      const uuid = UUID.generateUuid();
      const parts = uuid.split('-');

      // Version 4 UUID has '4' in the third group's first character
      expect(parts[2][0]).toBe('4');
    });

    it('should generate UUID with variant marker', () => {
      const uuid = UUID.generateUuid();
      const parts = uuid.split('-');

      // Variant marker should be 8, 9, a, or b in the fourth group's first character
      const variantChar = parts[3][0];
      expect(['8', '9', 'a', 'b']).toContain(variantChar);
    });

    it('should use lowercase hexadecimal characters', () => {
      const uuid = UUID.generateUuid();

      expect(uuid).toMatch(/^[0-9a-f-]+$/);
    });

    it('should generate many unique UUIDs', () => {
      const uuids = new Set<string>();
      const count = 1000;

      for (let i = 0; i < count; i++) {
        uuids.add(UUID.generateUuid());
      }

      // All should be unique
      expect(uuids.size).toBe(count);
    });

    it('should use crypto.getRandomValues', () => {
      const mockGetRandomValues = vi.spyOn(window.crypto, 'getRandomValues');

      UUID.generateUuid();

      expect(mockGetRandomValues).toHaveBeenCalled();

      mockGetRandomValues.mockRestore();
    });

    it('should handle edge case with all zeros from random values', () => {
      const mockGetRandomValues = vi.spyOn(window.crypto, 'getRandomValues');
      mockGetRandomValues.mockImplementation((array: any) => {
        for (let i = 0; i < array.length; i++) {
          array[i] = 0;
        }
        return array;
      });

      const uuid = UUID.generateUuid();

      // Should still produce valid format with version and variant bits set
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);

      mockGetRandomValues.mockRestore();
    });

    it('should handle edge case with all ones from random values', () => {
      const mockGetRandomValues = vi.spyOn(window.crypto, 'getRandomValues');
      mockGetRandomValues.mockImplementation((array: any) => {
        for (let i = 0; i < array.length; i++) {
          array[i] = 0xffffffff;
        }
        return array;
      });

      const uuid = UUID.generateUuid();

      // Should still produce valid format with version and variant bits set
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);

      mockGetRandomValues.mockRestore();
    });

    it('should have correct number of hyphens', () => {
      const uuid = UUID.generateUuid();
      const hyphens = uuid.split('-').length - 1;

      expect(hyphens).toBe(4);
    });

    it('should have correct segment lengths', () => {
      const uuid = UUID.generateUuid();
      const segments = uuid.split('-');

      expect(segments[0].length).toBe(8);
      expect(segments[1].length).toBe(4);
      expect(segments[2].length).toBe(4);
      expect(segments[3].length).toBe(4);
      expect(segments[4].length).toBe(12);
    });

    it('should be fast enough to generate many UUIDs', () => {
      const startTime = performance.now();

      for (let i = 0; i < 10000; i++) {
        UUID.generateUuid();
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should generate 10000 UUIDs in reasonable time (< 1 second)
      expect(duration).toBeLessThan(1000);
    });
  });
});
