import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, signal } from '@angular/core';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { TabletopService } from '@axe/application/tabletop/tabletop.service';
import { ContextMenuService } from '@axe/application/ui/context-menu.service';
import { tryBuildMultiSelectionContextMenu } from '@axe/application/ui/multi-selection-context-menu';
import { PanelOption, PanelService } from '@axe/application/ui/panel.service';
import { SelectionSignalService } from '@axe/application/ui/selection-signal.service';
import { PointerDeviceService } from '@axe/core/input/pointer-device.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import { LightSource } from '@axe/domain/tabletop/light-source';
import { LightSettingsComponent } from '@axe/features/tabletop/light-settings/light-settings.component';
import { buildLightSourceContextMenu } from '@axe/features/tabletop/light-source/light-source-context-menu';
import { MovableDirective, MovableOption } from '@axe/ui/directives/movable.directive';
import { RotableDirective, RotableOption } from '@axe/ui/directives/rotable.directive';
import { SelectableDirective } from '@axe/ui/directives/selectable.directive';
import { TooltipDirective } from '@axe/ui/directives/tooltip.directive';
import { setupMovableRotableForPiece } from '@axe/ui/tabletop/setup-tabletop-piece';
import { translateZCss, Z_OFFSET_RANGE_PX } from '@axe/ui/tabletop/z-offset';

@Component({
  selector: 'light-source',
  templateUrl: './light-source.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MovableDirective, RotableDirective, SelectableDirective, TooltipDirective],
  host: {
    class: 'block',
    '(dragstart)': 'onDragstart($event)',
    '(contextmenu)': 'onContextMenu($event)',
  },
})
export class LightSourceComponent {
  private readonly contextMenuService = inject(ContextMenuService);
  private readonly pointerDeviceService = inject(PointerDeviceService);
  private readonly selectionSignalService = inject(SelectionSignalService);
  private readonly objectStore = inject(ObjectStore);
  private readonly panelService = inject(PanelService);
  private readonly tabletopService = inject(TabletopService);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly translateFn = inject(TRANSLATE_FN);

  readonly lightSource = input.required<LightSource>();
  readonly movableOption = signal<MovableOption>({});
  readonly rotableOption = signal<RotableOption>({});

  constructor() {
    setupMovableRotableForPiece(this, {
      target: this.lightSource,
      transformCssOffset: translateZCss(Z_OFFSET_RANGE_PX),
    });
    this.objectChange.onObjectChangedFor(
      () => {
        const id = this.lightSource().followingCharacterIdentifier;
        return id ? [id] : [];
      },
      () => this.lightSource().following(),
      this.destroyRef
    );
  }

  get gridSize(): number {
    return this.tabletopService.gridSize();
  }

  readonly isLock = computed(() => {
    const light = this.lightSource();
    this.objectChange.versionOf(light.identifier)();
    return light.isLock;
  });

  readonly enabled = computed(() => {
    const light = this.lightSource();
    this.objectChange.versionOf(light.identifier)();
    return light.lightEnabled;
  });

  readonly iconColor = computed(() => {
    const light = this.lightSource();
    this.objectChange.versionOf(light.identifier)();
    return light.lightColor;
  });

  readonly isCone = computed(() => {
    const light = this.lightSource();
    this.objectChange.versionOf(light.identifier)();
    return light.lightAngle < 360;
  });

  readonly altitudeTransform = computed(() => {
    const light = this.lightSource();
    this.objectChange.versionOf(light.identifier)();
    const z = light.altitude * this.gridSize + light.posZ;
    return z !== 0 ? 'translateZ(' + z + 'px)' : '';
  });

  onMove() {
    SoundEffect.play(PresetSound.cardPick);
  }

  onMoved() {
    SoundEffect.play(PresetSound.cardPut);
  }

  onRotated(degree: number) {
    this.lightSource().rotate = degree;
  }

  onDragstart(e: Event) {
    e.preventDefault();
    e.stopPropagation();
  }

  onContextMenu(e: Event) {
    e.stopPropagation();
    e.preventDefault();
    if (!this.pointerDeviceService.isAllowedToOpenContextMenu) return;

    const light = this.lightSource();
    const menuPosition = this.pointerDeviceService.pointers[0];
    const multi = tryBuildMultiSelectionContextMenu({
      self: light,
      selectionSignalService: this.selectionSignalService,
      objectStore: this.objectStore,
      t: this.translateFn,
      gridSize: this.gridSize,
    });
    if (multi) {
      this.contextMenuService.open(menuPosition, multi, this.translateFn('feature.tabletop.selection.title'));
      return;
    }

    const characters = this.objectStore
      .getObjects(GameCharacter)
      .filter((character) => character.isVisibleOnTable)
      .map((character) => ({ identifier: character.identifier, name: character.name }));
    const menu = buildLightSourceContextMenu(
      light,
      this.gridSize,
      characters,
      (target) => this.openSettings(target),
      this.translateFn
    );
    this.contextMenuService.open(menuPosition, menu, light.name);
  }

  private openSettings(light: LightSource) {
    const coordinate = this.pointerDeviceService.pointers[0];
    const option: PanelOption = {
      title: this.translateFn('feature.light.settings.title'),
      left: coordinate.x - 200,
      top: coordinate.y - 150,
      width: 360,
      height: 420,
    };
    const component = this.panelService.open(LightSettingsComponent, option);
    component.target = light;
    component.advanced = true;
  }
}
