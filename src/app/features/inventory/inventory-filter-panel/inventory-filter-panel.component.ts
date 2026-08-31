import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { RolePermissionService } from '@axe/application/permission/role-permission.service';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { PanelService } from '@axe/application/ui/panel.service';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import {
  INVENTORY_HIDDEN_FILTERS,
  type InventoryHiddenFilter,
} from '@axe/features/inventory/game-object-inventory/inventory-list';
import { InventoryFilterService } from '@axe/features/inventory/inventory-filter.service';
import {
  STATUS_AILMENT_PANEL,
  StatusAilmentPanelComponent,
} from '@axe/features/status-ailment/status-ailment-panel/status-ailment-panel.component';
import { TranslocoModule } from '@jsverse/transloco';

/** Only one of these, so pressing the button that opened it puts it away. */
export const INVENTORY_FILTER_PANEL = 'inventory-filter';

/**
 * What the inventory is narrowed to and what it shows of each piece.
 *
 * The list was carrying all of this above itself, which cost four rows of a panel that is read
 * for its rows. It stands beside the list instead, and the list keeps a line saying what is in
 * force here.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'inventory-filter-panel',
  templateUrl: './inventory-filter-panel.component.html',
  host: { class: 'block h-full' },
  imports: [FormsModule, TranslocoModule],
})
export class InventoryFilterPanelComponent {
  private readonly filter = inject(InventoryFilterService);
  private readonly rolePermission = inject(RolePermissionService);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly panelService = inject(PanelService);
  private readonly t = inject(TRANSLATE_FN);

  readonly searchQuery = this.filter.searchQuery;
  readonly hasQuery = this.filter.hasQuery;
  readonly hiddenFilter = this.filter.hiddenFilter;
  readonly hiddenDisplay = this.filter.hiddenDisplay;

  private readonly hiddenFilterLabelKeys: Record<InventoryHiddenFilter, string> = {
    all: 'feature.inventory.panel.hiddenFilterAll',
    only: 'feature.inventory.panel.hiddenFilterOnly',
    exclude: 'feature.inventory.panel.hiddenFilterExclude',
  };

  readonly hiddenFilterOptions = INVENTORY_HIDDEN_FILTERS.map((value) => ({
    value,
    labelKey: this.hiddenFilterLabelKeys[value],
  }));

  readonly canSeeHidden = computed<boolean>(() => {
    if (PeerCursor.myCursor) this.objectChange.versionOf(PeerCursor.myCursor.identifier)();
    return this.rolePermission.canSeeHidden;
  });

  readonly canEdit = computed<boolean>(() => {
    if (PeerCursor.myCursor) this.objectChange.versionOf(PeerCursor.myCursor.identifier)();
    return this.rolePermission.canEditTabletop;
  });

  get sortTag(): string {
    return this.filter.sortTag;
  }
  set sortTag(value: string) {
    this.filter.sortTag = value;
  }

  get sortOrder(): string {
    return this.filter.sortOrder;
  }
  set sortOrder(value: string) {
    this.filter.sortOrder = value as typeof this.filter.sortOrder;
  }

  get sortTag2nd(): string {
    return this.filter.sortTag2nd;
  }
  set sortTag2nd(value: string) {
    this.filter.sortTag2nd = value;
  }

  get sortOrder2nd(): string {
    return this.filter.sortOrder2nd;
  }
  set sortOrder2nd(value: string) {
    this.filter.sortOrder2nd = value as typeof this.filter.sortOrder2nd;
  }

  get dataTag(): string {
    return this.filter.dataTag;
  }
  set dataTag(value: string) {
    this.filter.dataTag = value;
  }

  clearSearch(): void {
    this.filter.clearSearch();
  }

  toggleHiddenDisplay(): void {
    this.filter.toggleHiddenDisplay();
  }

  /** The states that can be named among the display items, which is where their columns come from. */
  openStatusAilments(): void {
    if (this.panelService.closeSingle(STATUS_AILMENT_PANEL)) return;
    this.panelService.open(StatusAilmentPanelComponent, {
      title: this.t('feature.statusAilment.title'),
      width: 380,
      height: 460,
      single: STATUS_AILMENT_PANEL,
    });
  }
}
