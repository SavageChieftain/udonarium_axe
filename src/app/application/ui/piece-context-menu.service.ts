import { inject, Injectable } from '@angular/core';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { ContextMenuService } from '@axe/application/ui/context-menu.service';
import { tryBuildMultiSelectionContextMenu } from '@axe/application/ui/multi-selection-context-menu';
import { SelectionSignalService } from '@axe/application/ui/selection-signal.service';
import { PointerCoordinate } from '@axe/core/input/pointer-device.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';

/**
 * 盤上の物を右クリックしたときの入り口。
 *
 * まとめて選んでいるなら、その場で出すのは一括の操作。1 つだけを指しているときに
 * 初めて、その物ならではの操作を組む。
 */
@Injectable({ providedIn: 'root' })
export class PieceContextMenuService {
  private readonly contextMenuService = inject(ContextMenuService);
  private readonly selectionSignalService = inject(SelectionSignalService);
  private readonly objectStore = inject(ObjectStore);
  private readonly t = inject(TRANSLATE_FN);

  /** 一括の操作を出したなら true。呼び出し側はそこで止める。 */
  openForSelection(self: TabletopObject, gridSize: number, position: PointerCoordinate): boolean {
    const multi = tryBuildMultiSelectionContextMenu({
      self,
      selectionSignalService: this.selectionSignalService,
      objectStore: this.objectStore,
      t: this.t,
      gridSize,
    });
    if (!multi) return false;

    this.contextMenuService.open(position, multi, this.t('feature.tabletop.selection.title'));
    return true;
  }
}
