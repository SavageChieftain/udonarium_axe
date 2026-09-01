import { TestBed } from '@angular/core/testing';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { GameTable } from '@axe/domain/tabletop/game-table';
import { VisionShape } from '@axe/domain/tabletop/vision-shape';
import { TableVisionVolumeOverlayComponent } from '@axe/features/tabletop/vision-volume/table-vision-volume-overlay.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('TableVisionVolumeOverlayComponent', () => {
  beforeEach(async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null as never);
    await TestBed.configureTestingModule({
      imports: [TableVisionVolumeOverlayComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  afterEach(() => {
    for (const object of ObjectStore.instance.getObjects()) ObjectStore.instance.remove(object);
    vi.restoreAllMocks();
  });

  function darkTable(): GameTable {
    const table = new GameTable();
    table.width = 20;
    table.height = 20;
    table.gridSize = 50;
    table.darknessEnabled = true;
    table.initialize();
    return table;
  }

  it('draws nothing for a piece that was not asked to show its sight', () => {
    darkTable();
    const character = GameCharacter.create('見張り', 1, '');
    character.lightEnabled = true;
    character.lightDimRadius = 6;

    const fixture = TestBed.createComponent(TableVisionVolumeOverlayComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.volumes()).toHaveLength(0);
  });

  it('draws a wire shape for a piece that was', () => {
    darkTable();
    const character = GameCharacter.create('見張り', 1, '');
    character.lightEnabled = true;
    character.lightDimRadius = 6;
    character.showVisionRange = true;
    character.visionShape = VisionShape.CONE;

    const fixture = TestBed.createComponent(TableVisionVolumeOverlayComponent);
    fixture.detectChanges();

    const volumes = fixture.componentInstance.volumes();
    expect(volumes).toHaveLength(1);
    expect(volumes[0].rings.length).toBeGreaterThan(0);
    expect(volumes[0].ribs.length).toBeGreaterThan(0);
    expect(volumes[0].rings[0].clipPath).not.toBeNull();
  });
});
