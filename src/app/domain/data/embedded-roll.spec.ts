import { findEmbeddedRolls, replaceEmbeddedRolls } from '@axe/domain/data/embedded-roll';

describe('embedded-roll', () => {
  describe('findEmbeddedRolls', () => {
    it('finds nothing where no brackets are written', () => {
      expect(findEmbeddedRolls('-(2d6+5-3)+(1d1-1)')).toEqual([]);
    });

    it('takes the command out of a bracketed run', () => {
      expect(findEmbeddedRolls('-([k10]+5-3)+(1d1-1)')).toEqual([{ command: 'k10', start: 2, end: 7 }]);
    });

    it('takes each of several in the order they were written', () => {
      const sites = findEmbeddedRolls('[k10]+[k5]');

      expect(sites.map((site) => site.command)).toEqual(['k10', 'k5']);
    });

    it('keeps a nested bracket with the command it belongs to', () => {
      expect(findEmbeddedRolls('[choice[a,b]]').map((site) => site.command)).toEqual(['choice[a,b]']);
    });

    it('passes over a bracket that is never closed', () => {
      expect(findEmbeddedRolls('[k10+5')).toEqual([]);
    });

    it('passes over an empty pair, which is a checkbox rather than a command', () => {
      expect(findEmbeddedRolls('-[]+(1d1-1)')).toEqual([]);
    });
  });

  describe('replaceEmbeddedRolls', () => {
    it('puts the answer where its command stood', () => {
      expect(replaceEmbeddedRolls('-([k10]+5-3)+(1d1-1)', [2])).toBe('-(2+5-3)+(1d1-1)');
    });

    it('answers each command in turn', () => {
      expect(replaceEmbeddedRolls('[k10]+[k5]', [7, 3])).toBe('7+3');
    });

    it('wraps a negative answer so it does not run into the sign before it', () => {
      expect(replaceEmbeddedRolls('5-[2d6-10]', [-4])).toBe('5-(-4)');
    });

    it('leaves a command as it was when nothing answered it', () => {
      expect(replaceEmbeddedRolls('[k10]+[k5]', [7])).toBe('7+[k5]');
    });
  });
});
