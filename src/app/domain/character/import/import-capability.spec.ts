import {
  capabilityOf,
  IMPORT_CAPABILITIES,
  IMPORT_DATA_TYPES,
  IMPORT_SOURCES,
  SUPPORT_LEVEL_LABEL_KEYS,
} from '@axe/domain/character/import/import-capability';
import { detectImportFetchPlan } from '@axe/domain/character/import/import-source';

describe('import-capability registry', () => {
  it('全 ソース×データ種別 がちょうど 1 件ずつ収録される（網羅・重複なし）', () => {
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

  it('全ラベルキーが非空文字列', () => {
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

  it('各ソースの対応システム一覧は非空で、id は重複しない', () => {
    for (const source of IMPORT_SOURCES) {
      expect(source.systems.length).toBeGreaterThan(0);
      for (const system of source.systems) {
        expect(system.name.length).toBeGreaterThan(0);
      }
      const ids = source.systems.map((system) => system.id).filter((id): id is string => id != null);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('代表システムが一覧に含まれる', () => {
    const appspot = IMPORT_SOURCES.find((source) => source.id === 'appspot')!;
    const appspotIds = appspot.systems.map((system) => system.id);
    expect(appspotIds).toContain('dx3');
    expect(appspotIds).toContain('shinobigami');

    const charasheet = IMPORT_SOURCES.find((source) => source.id === 'charasheet')!;
    const charasheetIds = charasheet.systems.map((system) => system.id);
    expect(charasheetIds).toContain('coc7');
    expect(charasheetIds).toContain('dx3');
  });

  it('入力経路（fetch 種別）が import-source の検出と整合する', () => {
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

  it('CharaXiv の URL は未対応（ccfolia 形式へ誘導）', () => {
    expect(detectImportFetchPlan('https://charaxiv.app/c/abc')).toEqual({ kind: 'unsupported', service: 'charaxiv' });
    const charaxiv = IMPORT_SOURCES.find((source) => source.id === 'charaxiv')!;
    expect(charaxiv.levels.name).toBe('viaCcfolia');
  });
});
