import { inject, Injectable } from '@angular/core';
import { DiceRollService } from '@axe/application/dice/dice-roll.service';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { ContextMenuService } from '@axe/application/ui/context-menu.service';
import { tryBuildMultiSelectionContextMenu } from '@axe/application/ui/multi-selection-context-menu';
import { SelectionSignalService } from '@axe/application/ui/selection-signal.service';
import { PointerCoordinate } from '@axe/core/input/pointer-device.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';

/**
 * Where a right-click on something on the board arrives.
 *
 * A group selection gets the bulk actions; only a single object earns the menu
 * built for that object alone.
 */
@Injectable({ providedIn: 'root' })
export class PieceContextMenuService {
  private readonly contextMenuService = inject(ContextMenuService);
  private readonly selectionSignalService = inject(SelectionSignalService);
  private readonly objectStore = inject(ObjectStore);
  private readonly diceRollService = inject(DiceRollService);
  private readonly t = inject(TRANSLATE_FN);

  /** True when the bulk menu was opened. The caller stops there. */
  openForSelection(self: TabletopObject, gridSize: number, position: PointerCoordinate): boolean {
    const multi = tryBuildMultiSelectionContextMenu({
      self,
      selectionSignalService: this.selectionSignalService,
      objectStore: this.objectStore,
      t: this.t,
      gridSize,
      rollDice: (dice) => this.diceRollService.roll(dice),
    });
    if (!multi) return false;

    this.contextMenuService.open(position, multi, this.t('feature.tabletop.selection.title'));
    return true;
  }
}
