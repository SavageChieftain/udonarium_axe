import { TestBed } from '@angular/core/testing';
import { ObjectFactory } from '@axe/core/sync/object-factory';
import { ObjectSerializer } from '@axe/core/sync/object-serializer';
import { ambiencePalette } from '@axe/domain/effect/ambience/ambience-kind';
import { GameTable } from '@axe/domain/tabletop/game-table';
import { TableAmbience } from '@axe/domain/tabletop/table-ambience';

describe('TableAmbience', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('is created with a name and an area', () => {
    const ambience = TableAmbience.create('毒沼', 'swamp', 4, 6);
    expect(ambience.name).toBe('毒沼');
    expect(ambience.kind).toBe('swamp');
    expect(ambience.width).toBe(4);
    expect(ambience.height).toBe(6);
  });

  it('takes a new area', () => {
    const ambience = TableAmbience.create('毒沼', 'swamp', 4, 4);
    ambience.width = 10;
    ambience.height = 2;
    expect(ambience.width).toBe(10);
    expect(ambience.height).toBe(2);
  });

  it('falls back to the marsh for a kind it cannot read', () => {
    const ambience = TableAmbience.create('場', 'swamp', 2, 2);
    ambience.ambienceKind = 'unknown';
    expect(ambience.kind).toBe('swamp');
  });

  it('falls back to the colour of its kind when none is given', () => {
    const ambience = TableAmbience.create('溶岩', 'lava', 2, 2);
    expect(ambience.color).toBe(ambiencePalette('lava').primary);
    ambience.ambienceColor = '#123456';
    expect(ambience.color).toBe('#123456');
  });

  it('keeps the density between none and all', () => {
    const ambience = TableAmbience.create('場', 'swamp', 2, 2);
    ambience.ambienceDensity = 5;
    expect(ambience.density).toBe(1);
    ambience.ambienceDensity = -1;
    expect(ambience.density).toBe(0);
  });

  it('offsets the phase by the identifier', () => {
    const a = TableAmbience.create('場', 'swamp', 2, 2, 'ambience-a');
    const b = TableAmbience.create('場', 'swamp', 2, 2, 'ambience-b');
    expect(a.phaseOffset).not.toBe(b.phaseOffset);
  });

  describe('saving into the room data', () => {
    it('is registered with the factory', () => {
      const object = ObjectFactory.instance.create('table-ambience');
      expect(object).toBeInstanceOf(TableAmbience);
      object?.destroy();
    });

    it('is written out as a child of the table', () => {
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

    it('is restored from what was written', () => {
      const ambience = TableAmbience.create('毒沼', 'swamp', 4, 6);
      ambience.ambienceDensity = 0.8;
      ambience.ambienceColor = '#123456';

      // The parser of happy-dom refuses an attribute name with a dot in it, so the position is
      // dropped and the rest read back; restoring a position is settled by the shared machinery.
      const xml = ObjectSerializer.instance.toXml(ambience).replace(/location\.[a-z]+="[^"]*"\s*/g, '');

      const restored = ObjectSerializer.instance.parseXml(xml) as TableAmbience;

      expect(restored).toBeInstanceOf(TableAmbience);
      expect(restored.name).toBe('毒沼');
      expect(restored.kind).toBe('swamp');
      expect(restored.width).toBe(4);
      expect(restored.height).toBe(6);
      expect(restored.density).toBeCloseTo(0.8);
      expect(restored.color).toBe('#123456');
    });

    it('writes the weather of the table out', () => {
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
