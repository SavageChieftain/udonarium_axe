import { TestBed } from '@angular/core/testing';
import { ObjectFactory } from '@axe/core/sync/object-factory';
import { ObjectSerializer } from '@axe/core/sync/object-serializer';
import { ObjectStore } from '@axe/core/sync/object-store';
import { ambiencePalette } from '@axe/domain/effect/ambience/ambience-kind';
import { GameTable } from '@axe/domain/tabletop/game-table';
import { TableAmbience } from '@axe/domain/tabletop/table-ambience';

describe('TableAmbience', () => {
  let store: ObjectStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = ObjectStore.instance;
    for (const object of store.getObjects()) store.delete(object, false);
    store.clearDeleteHistory();
  });

  afterEach(() => {
    for (const object of store.getObjects()) store.delete(object, false);
    store.clearDeleteHistory();
  });

  it('create() で名前と広さを持つこと', () => {
    const ambience = TableAmbience.create('毒沼', 'swamp', 4, 6);
    expect(ambience.name).toBe('毒沼');
    expect(ambience.kind).toBe('swamp');
    expect(ambience.width).toBe(4);
    expect(ambience.height).toBe(6);
  });

  it('広さを書き換えられること', () => {
    const ambience = TableAmbience.create('毒沼', 'swamp', 4, 4);
    ambience.width = 10;
    ambience.height = 2;
    expect(ambience.width).toBe(10);
    expect(ambience.height).toBe(2);
  });

  it('壊れた種類は毒沼へ倒すこと', () => {
    const ambience = TableAmbience.create('場', 'swamp', 2, 2);
    ambience.ambienceKind = 'unknown';
    expect(ambience.kind).toBe('swamp');
  });

  it('色を指定しなければ種類ごとの既定色を使うこと', () => {
    const ambience = TableAmbience.create('溶岩', 'lava', 2, 2);
    expect(ambience.color).toBe(ambiencePalette('lava').primary);
    ambience.ambienceColor = '#123456';
    expect(ambience.color).toBe('#123456');
  });

  it('濃さを 0〜1 に収めること', () => {
    const ambience = TableAmbience.create('場', 'swamp', 2, 2);
    ambience.ambienceDensity = 5;
    expect(ambience.density).toBe(1);
    ambience.ambienceDensity = -1;
    expect(ambience.density).toBe(0);
  });

  it('identifier ごとに位相がずれること', () => {
    const a = TableAmbience.create('場', 'swamp', 2, 2, 'ambience-a');
    const b = TableAmbience.create('場', 'swamp', 2, 2, 'ambience-b');
    expect(a.phaseOffset).not.toBe(b.phaseOffset);
  });

  describe('部屋データへの保存', () => {
    it('ObjectFactory に table-ambience が登録されていること', () => {
      const object = ObjectFactory.instance.create('table-ambience');
      expect(object).toBeInstanceOf(TableAmbience);
      object?.destroy();
    });

    it('テーブルの子として書き出されること', () => {
      const table = new GameTable();
      table.initialize();
      const ambience = TableAmbience.create('毒沼', 'swamp', 4, 6);
      ambience.ambienceDensity = 0.8;
      ambience.ambienceColor = '#123456';
      table.appendChild(ambience);

      const xml = ObjectSerializer.instance.toXml(table);

      expect(xml).toContain('<table-ambience');
      expect(xml).toContain('ambienceKind="swamp"');
      expect(xml).toContain('ambienceColor="#123456"');
      expect(xml).toContain('ambienceDensity="0.8"');
      expect(xml).toContain('>毒沼</data>');
    });

    it('書き出した内容から復元できること', () => {
      const ambience = TableAmbience.create('毒沼', 'swamp', 4, 6);
      ambience.ambienceDensity = 0.8;
      ambience.ambienceColor = '#123456';

      // happy-dom の XML パーサは location.x のようなドット付き属性を受け付けないため、
      // 座標だけ落として読み直す。座標の復元は共通の仕組み側で担保されている。
      const xml = ObjectSerializer.instance.toXml(ambience).replace(/location\.[a-z]+="[^"]*"\s*/g, '');
      for (const object of store.getObjects()) store.delete(object, false);
      store.clearDeleteHistory();

      const restored = ObjectSerializer.instance.parseXml(xml) as TableAmbience;

      expect(restored).toBeInstanceOf(TableAmbience);
      expect(restored.name).toBe('毒沼');
      expect(restored.kind).toBe('swamp');
      expect(restored.width).toBe(4);
      expect(restored.height).toBe(6);
      expect(restored.density).toBeCloseTo(0.8);
      expect(restored.color).toBe('#123456');
    });

    it('テーブルの天候が書き出されること', () => {
      const table = new GameTable();
      table.initialize();
      table.weatherKind = 'rain';
      table.weatherDensity = 0.4;

      const xml = ObjectSerializer.instance.toXml(table);

      expect(xml).toContain('weatherKind="rain"');
      expect(xml).toContain('weatherDensity="0.4"');
    });
  });
});
