import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { DataSummarySetting } from '@axe/domain/data/data-summary-setting';
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
      // The summary settings are a synced singleton, so its folders outlive the store cleanup.
      (DataSummarySetting as unknown as Record<string, unknown>)['_instance'] = undefined;
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
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

      component.renameFolder('第1話', '序章');

      expect(shallow.folderName).toBe('序章');
      expect(deep.folderName).toBe('序章/洞窟');
    });

    it('leaves a folder alone whose name merely starts the same way', () => {
      const lookalike = putOnTable('ゴブリン');
      lookalike.folderName = '第1話大全';

      component.renameFolder('第1話', '序章');

      expect(lookalike.folderName).toBe('第1話大全');
    });

    it('makes a folder with a name of its own and opens it for renaming', () => {
      const goblin = putOnTable('ゴブリン');

      component.createFolderFor(goblin);

      expect(goblin.folderName).toBe('フォルダ1');
      expect(component.isEditingFolder('フォルダ1')).toBe(true);
    });

    it('does not hand out a folder name that is already taken', () => {
      const taken = putOnTable('村長');
      taken.folderName = 'フォルダ1';
      const goblin = putOnTable('ゴブリン');

      component.createFolderFor(goblin);

      expect(goblin.folderName).toBe('フォルダ2');
    });

    it('turns the folders back on when one is made while they are off', () => {
      component.toggleGroupByFolder();
      const goblin = putOnTable('ゴブリン');

      component.createFolderFor(goblin);

      expect(component.isGroupByFolder()).toBe(true);
    });

    it('renames on commit and leaves the name alone when the edit is dropped', () => {
      const goblin = putOnTable('ゴブリン');
      goblin.folderName = '第1話';

      component.startFolderRename('第1話');
      component.cancelFolderRename();
      component.commitFolderRename('第1話', '序章');
      expect(goblin.folderName).toBe('第1話');

      component.startFolderRename('第1話');
      component.commitFolderRename('第1話', '序章');
      expect(goblin.folderName).toBe('序章');
    });

    it('makes a folder with nothing in it yet', () => {
      component.createFolder();

      expect(component.declaredFolderPaths()).toEqual(['フォルダ1']);
      expect(component.hasFolders()).toBe(true);
      expect(component.folderTree().roots.map((node) => node.path)).toEqual(['フォルダ1']);
      expect(component.folderTree().roots[0].totalCount).toBe(0);
    });

    it('makes a folder inside the one it was asked from', () => {
      component.createFolder();

      component.createFolder('フォルダ1');

      expect(component.declaredFolderPaths()).toEqual(['フォルダ1', 'フォルダ1/フォルダ2']);
      expect(component.folderTree().roots[0].children.map((node) => node.name)).toEqual(['フォルダ2']);
    });

    it('keeps an empty folder standing after the last character leaves it', () => {
      const goblin = putOnTable('ゴブリン');
      component.createFolderFor(goblin);

      component.setFolder(goblin, '');

      expect(component.folderTree().roots.map((node) => node.path)).toEqual(['フォルダ1']);
      expect(component.folderTree().loose.map((row) => row.object.name)).toEqual(['ゴブリン']);
    });

    it('deletes an empty folder without asking', () => {
      component.createFolder();

      component.deleteFolder('フォルダ1');

      expect(component.declaredFolderPaths()).toEqual([]);
      expect(component.hasFolders()).toBe(false);
    });

    it('takes what is inside back to unfiled when a folder is deleted', () => {
      const goblin = putOnTable('ゴブリン');
      goblin.folderName = '第1話/洞窟';
      vi.stubGlobal(
        'confirm',
        vi.fn(() => true)
      );

      component.deleteFolder('第1話');

      expect(goblin.folderName).toBe('');
    });

    it('leaves a folder alone when the deletion is called off', () => {
      const goblin = putOnTable('ゴブリン');
      goblin.folderName = '第1話';
      vi.stubGlobal(
        'confirm',
        vi.fn(() => false)
      );

      component.deleteFolder('第1話');

      expect(goblin.folderName).toBe('第1話');
    });

    it('merges rather than doubles up when a folder is renamed onto another', () => {
      component.createFolder();
      component.createFolder();

      component.renameFolder('フォルダ2', 'フォルダ1');

      expect(component.declaredFolderPaths()).toEqual(['フォルダ1']);
    });

    it('carries a rename through the folders it has been told about', () => {
      component.createFolder();
      component.createFolder('フォルダ1');

      component.renameFolder('フォルダ1', '第1話');

      expect(component.declaredFolderPaths()).toEqual(['第1話', '第1話/フォルダ2']);
    });

    function folderHeading(path: string): HTMLElement {
      const heading = document.createElement('div');
      heading.setAttribute('data-folder-dropzone', '');
      heading.setAttribute('data-folder-path', path);
      return heading;
    }

    function pointerAt(x: number, y: number): PointerEvent {
      return {
        button: 0,
        clientX: x,
        clientY: y,
        pointerId: 1,
        target: document.createElement('div'),
        currentTarget: { setPointerCapture: vi.fn(), releasePointerCapture: vi.fn() },
      } as unknown as PointerEvent;
    }

    function dragOnto(character: GameCharacter, dropTarget: HTMLElement | null): void {
      vi.spyOn(document, 'elementFromPoint').mockReturnValue(dropTarget);
      component.onObjectPointerDown(pointerAt(0, 0), character);
      component.onObjectPointerMove(pointerAt(40, 40));
      component.onObjectPointerUp(pointerAt(40, 40));
    }

    it('moves a character dragged onto a folder into it', () => {
      const goblin = putOnTable('ゴブリン');

      dragOnto(goblin, folderHeading('第1話/洞窟'));

      expect(goblin.folderName).toBe('第1話/洞窟');
    });

    it('takes a character dragged onto the unfiled heading out of its folder', () => {
      const goblin = putOnTable('ゴブリン');
      goblin.folderName = '第1話';

      dragOnto(goblin, folderHeading(''));

      expect(goblin.folderName).toBe('');
    });

    it('leaves a character dropped nowhere where it was', () => {
      const goblin = putOnTable('ゴブリン');
      goblin.folderName = '第1話';

      dragOnto(goblin, document.createElement('div'));

      expect(goblin.folderName).toBe('第1話');
    });

    it('carries the whole ticked selection along', () => {
      const goblin = putOnTable('ゴブリン');
      const village = putOnTable('村長');
      component.isMultiMove.set(true);
      component.multiMoveTargets.set(new Set([goblin.identifier, village.identifier]));

      dragOnto(goblin, folderHeading('第1話'));

      expect(goblin.folderName).toBe('第1話');
      expect(village.folderName).toBe('第1話');
    });

    it('carries only what was grabbed when it is not part of the selection', () => {
      const goblin = putOnTable('ゴブリン');
      const village = putOnTable('村長');
      component.isMultiMove.set(true);
      component.multiMoveTargets.set(new Set([village.identifier]));

      dragOnto(goblin, folderHeading('第1話'));

      expect(goblin.folderName).toBe('第1話');
      expect(village.folderName).toBe('');
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
