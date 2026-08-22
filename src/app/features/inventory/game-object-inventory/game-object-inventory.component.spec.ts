import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { GameObjectInventoryComponent } from '@axe/features/inventory/game-object-inventory/game-object-inventory.component';
import { expectPanelDragRecovery, PanelDragTestHostComponent } from '@axe/testing/panel-drag-recovery';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('GameObjectInventoryComponent', () => {
  let component: GameObjectInventoryComponent;
  let fixture: ComponentFixture<GameObjectInventoryComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [GameObjectInventoryComponent, PanelDragTestHostComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GameObjectInventoryComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('registers its effect in the constructor, so nothing is set up outside an injection context', () => {
    expect(() => fixture.detectChanges()).not.toThrow();
  });

  it('lets the panel take the pointer again once the drag ends', async () => {
    await expectPanelDragRecovery(GameObjectInventoryComponent);
  });

  describe('searching the list', () => {
    function putOnTable(name: string): GameCharacter {
      const character = GameCharacter.create(name, 1, '');
      character.setLocation('table');
      return character;
    }

    afterEach(() => {
      const store = ObjectStore.instance;
      store.getObjects().forEach((object) => store.delete(object, false));
      store.clearDeleteHistory();
    });

    it('shows everything while the search is empty', () => {
      putOnTable('ゴブリン');
      putOnTable('村長');

      expect(component.hasQuery()).toBe(false);
      expect(
        component
          .filteredRows()
          .map((row) => row.object.name)
          .sort()
      ).toEqual(['ゴブリン', '村長']);
    });

    it('keeps only what the search matches', () => {
      putOnTable('ゴブリン');
      putOnTable('村長');

      component.searchQuery.set('村長');

      expect(component.filteredRows().map((row) => row.object.name)).toEqual(['村長']);
    });

    it('wants every word of the search', () => {
      putOnTable('ゴブリン戦士');
      putOnTable('ゴブリン魔術師');

      component.searchQuery.set('ゴブリン 戦士');

      expect(component.filteredRows().map((row) => row.object.name)).toEqual(['ゴブリン戦士']);
    });

    it('ticks only the rows the search left when everything is selected', () => {
      putOnTable('ゴブリン');
      putOnTable('村長');
      component.searchQuery.set('村長');
      component.isMultiMove.set(true);

      component.allTabBoxCheck();

      expect(component.multiMoveTargets().size).toBe(1);
      expect(component.filteredRows()[0].identifier).toBe([...component.multiMoveTargets()][0]);
    });
  });
});
