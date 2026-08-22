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
      vi.unstubAllGlobals();
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

    it('gathers the rows into the folders they name', () => {
      const goblin = putOnTable('ゴブリン');
      goblin.folderName = '第1話/洞窟';
      putOnTable('村長');

      expect(component.showTree()).toBe(true);
      expect(component.folderTree().roots.map((node) => node.path)).toEqual(['第1話']);
      expect(component.folderTree().roots[0].totalCount).toBe(1);
      expect(component.folderTree().loose.map((row) => row.object.name)).toEqual(['村長']);
    });

    it('leaves the list flat while nothing is in a folder', () => {
      putOnTable('ゴブリン');
      putOnTable('村長');

      expect(component.hasFolders()).toBe(false);
      expect(component.showTree()).toBe(false);
    });

    it('leaves the list flat once the folders are turned off', () => {
      const goblin = putOnTable('ゴブリン');
      goblin.folderName = '第1話';

      component.toggleGroupByFolder();

      expect(component.hasFolders()).toBe(true);
      expect(component.isGroupByFolder()).toBe(false);
      expect(component.showTree()).toBe(false);
    });

    it('folds a folder away and opens it again', () => {
      const goblin = putOnTable('ゴブリン');
      goblin.folderName = '第1話';

      component.toggleFolder('第1話');
      expect(component.isFolderCollapsed('第1話')).toBe(true);

      component.toggleFolder('第1話');
      expect(component.isFolderCollapsed('第1話')).toBe(false);
    });

    it('opens every folder while a search is on, without forgetting what was folded', () => {
      const goblin = putOnTable('ゴブリン');
      goblin.folderName = '第1話';
      component.toggleFolder('第1話');

      component.searchQuery.set('ゴブリン');
      expect(component.isFolderCollapsed('第1話')).toBe(false);

      component.clearSearch();
      expect(component.isFolderCollapsed('第1話')).toBe(true);
    });

    it('normalizes a rough folder before putting a character in it', () => {
      const goblin = putOnTable('ゴブリン');

      component.setFolder(goblin, ' 第1話 // 洞窟 ');

      expect(goblin.folderName).toBe('第1話/洞窟');
    });

    it('carries a renamed folder down through everything inside it', () => {
      const deep = putOnTable('ゴブリン');
      deep.folderName = '第1話/洞窟';
      const shallow = putOnTable('村長');
      shallow.folderName = '第1話';
      vi.stubGlobal(
        'prompt',
        vi.fn(() => '序章')
      );

      component.renameFolder('第1話');

      expect(shallow.folderName).toBe('序章');
      expect(deep.folderName).toBe('序章/洞窟');
    });

    it('leaves a folder alone whose name merely starts the same way', () => {
      const lookalike = putOnTable('ゴブリン');
      lookalike.folderName = '第1話大全';
      vi.stubGlobal(
        'prompt',
        vi.fn(() => '序章')
      );

      component.renameFolder('第1話');

      expect(lookalike.folderName).toBe('第1話大全');
    });

    it('takes everything out of a folder it is asked to empty', () => {
      const goblin = putOnTable('ゴブリン');
      goblin.folderName = '第1話/洞窟';
      vi.stubGlobal(
        'confirm',
        vi.fn(() => true)
      );

      component.clearFolder('第1話');

      expect(goblin.folderName).toBe('');
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
