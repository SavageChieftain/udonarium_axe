import {
  capabilityOf,
  IMPORT_CAPABILITIES,
  IMPORT_DATA_TYPES,
  IMPORT_SOURCES,
  SUPPORT_LEVEL_LABEL_KEYS,
} from '@axe/domain/character/import/import-capability';
import { detectImportFetchPlan } from '@axe/domain/character/import/import-source';

describe('import-capability registry', () => {
  it('covers every source against every kind of data exactly once', () => {
    expect(IMPORT_CAPABILITIES).toHaveLength(IMPORT_SOURCES.length * IMPORT_DATA_TYPES.length);
    const seen = new Set<string>();
    for (const cap of IMPORT_CAPABILITIES) {
      const key = `${cap.source}/${cap.dataType}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
      expect(cap.level).toBe(capabilityOf(cap.source, cap.dataType));
    }
    for (const source of IMPORT_SOURCES) {
      for (const dataType of IMPORT_DATA_TYPES) {
        expect(seen.has(`${source.id}/${dataType.id}`)).toBe(true);
      }
    }
  });

  it('gives every label a key', () => {
    for (const source of IMPORT_SOURCES) {
      expect(source.labelKey.length).toBeGreaterThan(0);
      expect(source.systemsCoverageKey.length).toBeGreaterThan(0);
    }
    for (const dataType of IMPORT_DATA_TYPES) {
      expect(dataType.labelKey.length).toBeGreaterThan(0);
    }
    for (const key of Object.values(SUPPORT_LEVEL_LABEL_KEYS)) {
      expect(key.length).toBeGreaterThan(0);
    }
  });

  it('gives every source systems of its own, each named once', () => {
    for (const source of IMPORT_SOURCES) {
      expect(source.systems.length).toBeGreaterThan(0);
      for (const system of source.systems) {
        expect(system.name.length).toBeGreaterThan(0);
      }
      const ids = source.systems.map((system) => system.id).filter((id): id is string => id != null);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('lists the system it names as representative', () => {
    const appspot = IMPORT_SOURCES.find((source) => source.id === 'appspot')!;
    const appspotIds = appspot.systems.map((system) => system.id);
    expect(appspotIds).toContain('dx3');
    expect(appspotIds).toContain('shinobigami');

    const charasheet = IMPORT_SOURCES.find((source) => source.id === 'charasheet')!;
    const charasheetIds = charasheet.systems.map((system) => system.id);
    expect(charasheetIds).toContain('coc7');
    expect(charasheetIds).toContain('dx3');
  });

  it('agrees with how the source is recognised on how it is fetched', () => {
    const url: Record<string, string> = {
      charasheet: 'https://charasheet.vampire-blood.net/123456',
      appspot: 'https://character-sheets.appspot.com/dx3/edit.html?key=ABC',
      ytsheet: 'https://yutorize.work/ytsheet/sw2.5/?id=abc',
    };
    for (const source of IMPORT_SOURCES) {
      if (source.fetch === 'none') continue;
      const plan = detectImportFetchPlan(url[source.id]);
      expect(plan.kind).toBe(source.fetch);
      if (plan.kind !== 'json' && plan.kind !== 'unsupported') {
        expect(plan.service).toBe(source.id);
      }
    }
  });

  it('takes no address from one service, and points at the other format instead', () => {
    expect(detectImportFetchPlan('https://charaxiv.app/c/abc')).toEqual({ kind: 'unsupported', service: 'charaxiv' });
    const charaxiv = IMPORT_SOURCES.find((source) => source.id === 'charaxiv')!;
    expect(charaxiv.levels.name).toBe('viaCcfolia');
  });
});
