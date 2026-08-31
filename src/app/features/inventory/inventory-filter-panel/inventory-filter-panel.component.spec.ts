import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GameObjectInventoryService } from '@axe/application/inventory/game-object-inventory.service';
import { RolePermissionService } from '@axe/application/permission/role-permission.service';
import { SortOrder } from '@axe/domain/data/data-summary-setting';
import { InventoryFilterService } from '@axe/features/inventory/inventory-filter.service';
import { InventoryFilterPanelComponent } from '@axe/features/inventory/inventory-filter-panel/inventory-filter-panel.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('InventoryFilterPanelComponent', () => {
  let fixture: ComponentFixture<InventoryFilterPanelComponent>;
  let component: InventoryFilterPanelComponent;
  let filter: InventoryFilterService;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [InventoryFilterPanelComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
    filter = TestBed.inject(InventoryFilterService);
    filter.clearSearch();
    filter.hiddenFilter.set('all');
    filter.hiddenDisplay.set('dim');
    fixture = TestBed.createComponent(InventoryFilterPanelComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture?.destroy();
    filter.clearSearch();
    filter.hiddenFilter.set('all');
    filter.hiddenDisplay.set('dim');
  });

  it('puts what is typed in the box where the list can read it', () => {
    fixture.detectChanges();
    const box = fixture.nativeElement.querySelector('input[name="inventory-search"]') as HTMLInputElement;

    box.value = 'ゴブリン';
    box.dispatchEvent(new Event('input'));

    expect(filter.searchQuery()).toBe('ゴブリン');
  });

  it('clears the search again', () => {
    filter.searchQuery.set('ゴブリン');

    component.clearSearch();

    expect(filter.searchQuery()).toBe('');
  });

  it('writes the order and the display items where the room reads them', () => {
    component.sortTag = '行動値';
    component.sortOrder = SortOrder.DESC;
    component.dataTag = 'HP MP 毒';

    const inventory = TestBed.inject(GameObjectInventoryService);
    expect(inventory.sortTag).toBe('行動値');
    expect(inventory.sortOrder).toBe(SortOrder.DESC);
    expect(inventory.dataTags).toEqual(['HP', 'MP', '毒']);
  });

  it('offers the hidden filter only to somebody who may see hidden pieces', () => {
    vi.spyOn(TestBed.inject(RolePermissionService), 'canSeeHidden', 'get').mockReturnValue(false);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('select[name="inventory-hidden-filter"]')).toBeNull();
  });

  it('offers the order and the display items only to somebody who may edit the table', () => {
    vi.spyOn(TestBed.inject(RolePermissionService), 'canEditTabletop', 'get').mockReturnValue(false);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('input[name="data-tag"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('input[name="inventory-search"]')).toBeTruthy();
  });
});
