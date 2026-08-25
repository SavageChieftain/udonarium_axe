import { ChangeDetectionStrategy, Component, computed, inject, signal, ViewContainerRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { RolePermissionService } from '@axe/application/permission/role-permission.service';
import { DungeonBuildService, DungeonMaterial } from '@axe/application/tabletop/dungeon-build.service';
import { PanelService } from '@axe/application/ui/panel.service';
import { emitSelectGameTable } from '@axe/core/event/domain-events';
import { ObjectStore } from '@axe/core/sync/object-store';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import {
  TEXTURE_ASSET_URLS,
  TEXTURE_IDS,
  WALL_TEXTURE_ASSET_URLS,
  WALL_TEXTURE_IDS,
} from '@axe/domain/media/texture-catalog';
import {
  atmosphereById,
  DUNGEON_ATMOSPHERE_IDS,
  DungeonAtmosphereId,
} from '@axe/domain/tabletop/dungeon/dungeon-atmosphere';
import {
  DUNGEON_HEAVY_TERRAINS,
  DUNGEON_MAX_TERRAINS,
  syncObjectCount,
} from '@axe/domain/tabletop/dungeon/dungeon-blocks';
import { MAX_ROOM_COUNT, MIN_ROOM_COUNT, planDungeon } from '@axe/domain/tabletop/dungeon/dungeon-generator';
import { GameTable } from '@axe/domain/tabletop/game-table';
import { DungeonMaterialPickerComponent } from '@axe/features/tabletop/dungeon-generator/dungeon-material-picker.component';
import { buildDungeonPreview, previewColors } from '@axe/features/tabletop/dungeon-generator/dungeon-preview';
import { TranslocoModule } from '@jsverse/transloco';

const SEED_LIMIT = 2 ** 31;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'dungeon-generator',
  templateUrl: './dungeon-generator.component.html',
  imports: [FormsModule, TranslocoModule, DungeonMaterialPickerComponent],
})
export class DungeonGeneratorComponent {
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly panelService = inject(PanelService);
  private readonly rolePermission = inject(RolePermissionService);
  private readonly dungeonBuild = inject(DungeonBuildService);
  private readonly objectStore = inject(ObjectStore);
  private readonly t = inject(TRANSLATE_FN);

  protected readonly atmosphereIds = DUNGEON_ATMOSPHERE_IDS;
  protected readonly wallIds = WALL_TEXTURE_IDS;
  protected readonly floorIds = TEXTURE_IDS;
  protected readonly wallUrls = WALL_TEXTURE_ASSET_URLS;
  protected readonly floorUrls = TEXTURE_ASSET_URLS;
  protected readonly minRooms = MIN_ROOM_COUNT;
  protected readonly maxRooms = MAX_ROOM_COUNT;
  protected readonly heavyLimit = DUNGEON_HEAVY_TERRAINS;
  protected readonly maxTerrains = DUNGEON_MAX_TERRAINS;

  protected readonly atmosphere = signal<DungeonAtmosphereId>('stoneDungeon');
  protected readonly roomCount = signal(8);
  protected readonly seed = signal(Math.floor(Math.random() * SEED_LIMIT));
  protected readonly tableName = signal('');
  protected readonly placeDoors = signal(true);
  protected readonly placeStairs = signal(true);
  protected readonly placeRoomNotes = signal(true);
  protected readonly placeScratchMask = signal(true);

  private readonly wallOverride = signal<DungeonMaterial | null>(null);
  private readonly floorOverride = signal<DungeonMaterial | null>(null);

  protected readonly busy = signal(false);
  protected readonly progress = signal(0);
  protected readonly builtTable = signal<GameTable | null>(null);
  private builtNotes: string[] = [];

  constructor() {
    queueMicrotask(() => (this.panelService.title = this.t('feature.tabletop.dungeonGenerator.title')));
  }

  protected get canEdit(): boolean {
    return this.rolePermission.canEditTabletop;
  }

  protected readonly wall = computed<DungeonMaterial>(
    () => this.wallOverride() ?? { kind: 'texture', id: atmosphereById(this.atmosphere()).defaultWall }
  );
  protected readonly floor = computed<DungeonMaterial>(
    () => this.floorOverride() ?? { kind: 'texture', id: atmosphereById(this.atmosphere()).defaultFloor }
  );
  protected readonly usingDefaults = computed(() => this.wallOverride() === null && this.floorOverride() === null);

  /** Materials do not change the shape, so a new swatch must not roll the dungeon again. */
  protected readonly plan = computed(() =>
    planDungeon(
      { atmosphere: this.atmosphere(), roomCount: this.roomCount(), seed: this.seed() },
      { placeDoors: this.placeDoors(), placeStairs: this.placeStairs() }
    )
  );

  protected readonly terrainCount = computed(() => this.plan().blocks.blocks.length);
  protected readonly syncCount = computed(() => syncObjectCount(this.plan().blocks.blocks));
  protected readonly tooMany = computed(() => this.terrainCount() > DUNGEON_MAX_TERRAINS);
  protected readonly heavy = computed(() => this.terrainCount() > DUNGEON_HEAVY_TERRAINS && !this.tooMany());

  protected readonly preview = computed(() => {
    const plan = this.plan();
    const wall = this.wall();
    const floor = this.floor();
    const colors = previewColors(
      wall.kind === 'texture' ? wall.id : '',
      floor.kind === 'texture' ? floor.id : '',
      plan.atmosphere.cave?.hazardFloor ?? ''
    );
    return buildDungeonPreview(plan.layout, plan.blocks.blocks, colors);
  });

  protected readonly roomsFound = computed(() => this.plan().layout.rooms.length);
  protected readonly roomsDiffer = computed(() => this.roomsFound() !== this.roomCount());
  protected readonly boardSize = computed(() => `${this.plan().layout.width} x ${this.plan().layout.height}`);

  protected chooseAtmosphere(id: DungeonAtmosphereId): void {
    this.atmosphere.set(id);
  }

  protected setWall(material: DungeonMaterial): void {
    this.wallOverride.set(material);
  }

  protected setFloor(material: DungeonMaterial): void {
    this.floorOverride.set(material);
  }

  protected resetMaterials(): void {
    this.wallOverride.set(null);
    this.floorOverride.set(null);
  }

  protected reroll(): void {
    this.seed.set(Math.floor(Math.random() * SEED_LIMIT));
  }

  protected nameFor(): string {
    const typed = this.tableName().trim();
    if (typed.length > 0) return typed;
    return this.t(`feature.tabletop.dungeonGenerator.atmosphere.${this.atmosphere()}`);
  }

  protected async generate(): Promise<void> {
    if (!this.canEdit || this.busy() || this.tooMany()) return;
    this.busy.set(true);
    this.progress.set(0);
    try {
      // Rolling again throws the last one away, so a shelf of rejected tables never builds up.
      this.discardPrevious();
      const plan = this.plan();
      const result = await this.dungeonBuild.build(
        plan.layout,
        plan.atmosphere,
        plan.blocks,
        {
          name: this.nameFor(),
          wall: this.wall(),
          floor: this.floor(),
          placeRoomNotes: this.placeRoomNotes(),
          placeSummary: true,
          placeScratchMask: this.placeScratchMask(),
        },
        (done, total) => this.progress.set(Math.round((done / total) * 100))
      );
      this.builtTable.set(result.table);
      this.builtNotes = result.noteIdentifiers;
      SoundEffect.play(PresetSound.blockPut);
    } finally {
      this.busy.set(false);
    }
  }

  protected goToTable(): void {
    const table = this.builtTable();
    if (table) emitSelectGameTable({ identifier: table.identifier });
  }

  protected discardPrevious(): void {
    const table = this.builtTable();
    // A shared memo is not a child of its table, so it has to be cleared by hand.
    for (const identifier of this.builtNotes) this.objectStore.get(identifier)?.destroy();
    this.builtNotes = [];
    if (table) table.destroy();
    this.builtTable.set(null);
  }

  protected close(): void {
    this.panelService.close();
  }

  protected get parentViewContainerRef(): ViewContainerRef {
    return this.viewContainerRef;
  }
}
