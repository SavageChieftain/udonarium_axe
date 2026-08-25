import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GameObjectInventoryService } from '@axe/application/inventory/game-object-inventory.service';
import { Network } from '@axe/core/index';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { DataSummarySetting } from '@axe/domain/data/data-summary-setting';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { PeerRole } from '@axe/domain/peer/peer-role';
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

    function putInShared(name: string): GameCharacter {
      const character = GameCharacter.create(name, 1, '');
      character.setLocation('common');
      return character;
    }

    afterEach(() => {
      const store = ObjectStore.instance;
      store.getObjects().forEach((object) => store.delete(object, false));
      store.clearDeleteHistory();
      // Personal folders live on the device, so they outlive the store cleanup too.
      localStorage.clear();
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

    it('leaves the table flat, since that is the board rather than the stock', () => {
      const goblin = putOnTable('ゴブリン');
      goblin.folderName = '第1話';

      expect(component.selectTab()).toBe('table');
      expect(component.foldersApply()).toBe(false);
      expect(component.hasFolders()).toBe(true);
      expect(component.showTree()).toBe(false);
    });

    it('leaves the graveyard flat too, since it is what has already left the table', () => {
      component.selectTab.set('graveyard');

      expect(component.foldersApply()).toBe(false);
    });

    it('files what is shared apart from what is personal', () => {
      const shared = putInShared('ゴブリン');
      shared.folderName = '第1話';
      component.selectTab.set('common');
      component.createFolder();

      component.selectTab.set('graveyard');
      expect(component.declaredFolderPaths()).toEqual([]);

      component.selectTab.set('common');
      expect(component.declaredFolderPaths()).toEqual(['フォルダ1']);
      expect(component.knownFolderPaths()).toEqual(['フォルダ1', '第1話']);
    });

    it('gathers the rows into the folders they name', () => {
      const goblin = putInShared('ゴブリン');
      goblin.folderName = '第1話/洞窟';
      putInShared('村長');
      component.selectTab.set('common');

      expect(component.showTree()).toBe(true);
      expect(component.folderTree().roots.map((node) => node.path)).toEqual(['第1話']);
      expect(component.folderTree().roots[0].totalCount).toBe(1);
      expect(component.folderTree().loose.map((row) => row.object.name)).toEqual(['村長']);
    });

    it('leaves the list flat while nothing is in a folder', () => {
      putInShared('ゴブリン');
      putInShared('村長');
      component.selectTab.set('common');

      expect(component.hasFolders()).toBe(false);
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
      const goblin = putInShared('ゴブリン');
      component.selectTab.set('common');

      component.setFolder(goblin, ' 第1話 // 洞窟 ');

      expect(goblin.folderName).toBe('第1話/洞窟');
    });

    it('carries a renamed folder down through everything inside it', () => {
      const deep = putInShared('ゴブリン');
      deep.folderName = '第1話/洞窟';
      const shallow = putInShared('村長');
      shallow.folderName = '第1話';
      component.selectTab.set('common');

      component.renameFolder('第1話', '序章');

      expect(shallow.folderName).toBe('序章');
      expect(deep.folderName).toBe('序章/洞窟');
    });

    it('leaves a folder alone whose name merely starts the same way', () => {
      const lookalike = putInShared('ゴブリン');
      lookalike.folderName = '第1話大全';
      component.selectTab.set('common');

      component.renameFolder('第1話', '序章');

      expect(lookalike.folderName).toBe('第1話大全');
    });

    it('makes a folder with a name of its own and opens it for renaming', () => {
      const goblin = putInShared('ゴブリン');
      component.selectTab.set('common');

      component.createFolderFor(goblin);

      expect(goblin.folderName).toBe('フォルダ1');
      expect(component.isEditingFolder('フォルダ1')).toBe(true);
    });

    it('does not hand out a folder name that is already taken', () => {
      const taken = putInShared('村長');
      taken.folderName = 'フォルダ1';
      const goblin = putInShared('ゴブリン');
      component.selectTab.set('common');

      component.createFolderFor(goblin);

      expect(goblin.folderName).toBe('フォルダ2');
    });

    it('renames on commit and leaves the name alone when the edit is dropped', () => {
      const goblin = putInShared('ゴブリン');
      goblin.folderName = '第1話';
      component.selectTab.set('common');

      component.startFolderRename('第1話');
      component.cancelFolderRename();
      component.commitFolderRename('第1話', '序章');
      expect(goblin.folderName).toBe('第1話');

      component.startFolderRename('第1話');
      component.commitFolderRename('第1話', '序章');
      expect(goblin.folderName).toBe('序章');
    });

    it('makes a folder with nothing in it yet', () => {
      component.selectTab.set('common');
      component.createFolder();

      expect(component.declaredFolderPaths()).toEqual(['フォルダ1']);
      expect(component.hasFolders()).toBe(true);
      expect(component.folderTree().roots.map((node) => node.path)).toEqual(['フォルダ1']);
      expect(component.folderTree().roots[0].totalCount).toBe(0);
    });

    it('makes a folder inside the one it was asked from', () => {
      component.selectTab.set('common');
      component.createFolder();

      component.createFolder('フォルダ1');

      expect(component.declaredFolderPaths()).toEqual(['フォルダ1', 'フォルダ1/フォルダ2']);
      expect(component.folderTree().roots[0].children.map((node) => node.name)).toEqual(['フォルダ2']);
    });

    it('keeps an empty folder standing after the last character leaves it', () => {
      const goblin = putInShared('ゴブリン');
      component.selectTab.set('common');
      component.createFolderFor(goblin);

      component.setFolder(goblin, '');

      expect(component.folderTree().roots.map((node) => node.path)).toEqual(['フォルダ1']);
      expect(component.folderTree().loose.map((row) => row.object.name)).toEqual(['ゴブリン']);
    });

    it('deletes an empty folder without asking', () => {
      component.selectTab.set('common');
      component.createFolder();

      component.deleteFolder('フォルダ1');

      expect(component.declaredFolderPaths()).toEqual([]);
      expect(component.hasFolders()).toBe(false);
    });

    it('takes what is inside back to unfiled when a folder is deleted', () => {
      const goblin = putInShared('ゴブリン');
      goblin.folderName = '第1話/洞窟';
      component.selectTab.set('common');
      vi.stubGlobal(
        'confirm',
        vi.fn(() => true)
      );

      component.deleteFolder('第1話');

      expect(goblin.folderName).toBe('');
    });

    it('leaves a folder alone when the deletion is called off', () => {
      const goblin = putInShared('ゴブリン');
      goblin.folderName = '第1話';
      component.selectTab.set('common');
      vi.stubGlobal(
        'confirm',
        vi.fn(() => false)
      );

      component.deleteFolder('第1話');

      expect(goblin.folderName).toBe('第1話');
    });

    it('files what sits in a location nobody claimed, which the shared tab also lists', () => {
      const orphan = GameCharacter.create('置き去り', 1, '');
      orphan.setLocation('some-peer-who-left');
      orphan.folderName = '第1話';
      component.selectTab.set('common');

      component.renameFolder('第1話', '序章');

      expect(orphan.folderName).toBe('序章');
    });

    it('refuses a rename that would push what is inside past the depth limit', () => {
      const deep = putInShared('ゴブリン');
      deep.folderName = '第1話/洞窟/最奥/宝物庫';
      component.selectTab.set('common');

      expect(component.renameFolder('第1話', '序章/導入')).toBe(false);
      expect(deep.folderName).toBe('第1話/洞窟/最奥/宝物庫');
    });

    it('keeps the editor open on a name it could not take', () => {
      const goblin = putInShared('ゴブリン');
      goblin.folderName = '第1話';
      component.selectTab.set('common');
      component.startFolderRename('第1話');

      component.commitFolderRename('第1話', '   ');

      expect(component.isEditingFolder('第1話')).toBe(true);
    });

    it('offers no folder inside one already at the depth limit', () => {
      const deep = putInShared('ゴブリン');
      deep.folderName = '第1話/洞窟/最奥/宝物庫';
      component.selectTab.set('common');

      expect(component.canNestInside('第1話/洞窟/最奥/宝物庫')).toBe(false);
      component.createFolder('第1話/洞窟/最奥/宝物庫');

      expect(component.declaredFolderPaths()).toEqual([]);
      expect(deep.folderName).toBe('第1話/洞窟/最奥/宝物庫');
    });

    it('ignores a fold while a search is holding everything open', () => {
      const goblin = putInShared('ゴブリン');
      goblin.folderName = '第1話';
      component.selectTab.set('common');
      component.searchQuery.set('ゴブリン');

      component.toggleFolder('第1話');
      component.clearSearch();

      expect(component.isFolderCollapsed('第1話')).toBe(false);
    });

    it('keeps personal folders off the room and out of the shared tab', () => {
      component.selectTab.set(component.inventoryTypes()[2]);
      component.createFolder();

      expect(component.declaredFolderPaths()).toEqual(['フォルダ1']);
      expect(TestBed.inject(GameObjectInventoryService).folderPaths).toEqual([]);

      component.selectTab.set('common');
      expect(component.declaredFolderPaths()).toEqual([]);
    });

    it('renames a character who has stepped out onto the table along with the folder', () => {
      const away = putInShared('ゴブリン');
      away.folderName = '第1話';
      away.setLocation('table');
      component.selectTab.set('common');

      component.renameFolder('第1話', '序章');

      expect(away.folderName).toBe('序章');
    });

    it('drops a name it could not take when the field is left rather than holding it', () => {
      const goblin = putInShared('ゴブリン');
      goblin.folderName = '第1話';
      component.selectTab.set('common');
      component.startFolderRename('第1話');

      component.commitFolderRename('第1話', '   ', true);

      expect(component.isEditingFolder('第1話')).toBe(false);
      expect(goblin.folderName).toBe('第1話');
    });

    it('forgets a drag whose release never arrives', () => {
      const goblin = putInShared('ゴブリン');
      component.selectTab.set('common');
      vi.spyOn(document, 'elementFromPoint').mockReturnValue(folderHeading('第1話'));
      component.onObjectPointerDown(pointerAt(0, 0), goblin);
      component.onObjectPointerMove(pointerAt(40, 40));

      component.onObjectDragCancel();
      component.onObjectPointerUp(pointerAt(40, 40));

      expect(goblin.folderName).toBe('');
    });

    it('searches the shown side of a resource as well as its maximum', () => {
      const goblin = putInShared('ゴブリン');
      component.selectTab.set('common');
      const hp = goblin.detailDataElement?.getFirstElementByName('HP');
      expect(hp).toBeTruthy();
      hp!.currentValue = 7;

      component.searchQuery.set('7');

      expect(component.filteredRows().map((row) => row.object.name)).toEqual(['ゴブリン']);
    });

    it('leaves the other scope alone when a folder of the same name is renamed', () => {
      const shared = putInShared('ゴブリン');
      shared.folderName = '第1話';
      const mine = GameCharacter.create('相棒', 1, '');
      mine.setLocation(Network.peerId);
      mine.folderName = '第1話';

      component.selectTab.set(Network.peerId);
      component.renameFolder('第1話', '序章');

      expect(mine.folderName).toBe('序章');
      expect(shared.folderName).toBe('第1話');
    });

    it('leaves the other scope alone when a folder of the same name is deleted', () => {
      const shared = putInShared('ゴブリン');
      shared.folderName = '第1話';
      const mine = GameCharacter.create('相棒', 1, '');
      mine.setLocation(Network.peerId);
      mine.folderName = '第1話';
      const originalConfirm = window.confirm;
      window.confirm = (() => true) as never;

      try {
        component.selectTab.set(Network.peerId);
        component.deleteFolder('第1話');
      } finally {
        window.confirm = originalConfirm;
      }

      expect(mine.folderName).toBe('');
      expect(shared.folderName).toBe('第1話');
    });

    it('holds still on collapse-all while a search is open', () => {
      component.selectTab.set('common');
      component.createFolder();
      component.createFolder();
      component.searchQuery.set('フォルダ1');

      component.collapseAllFolders();

      expect(component.collapsedFolders().size).toBe(0);
    });

    it('merges rather than doubles up when a folder is renamed onto another', () => {
      component.selectTab.set('common');
      component.createFolder();
      component.createFolder();

      component.renameFolder('フォルダ2', 'フォルダ1');

      expect(component.declaredFolderPaths()).toEqual(['フォルダ1']);
    });

    it('carries a rename through the folders it has been told about', () => {
      component.selectTab.set('common');
      component.createFolder();
      component.createFolder('フォルダ1');

      component.renameFolder('フォルダ1', '第1話');

      expect(component.declaredFolderPaths()).toEqual(['第1話', '第1話/フォルダ2']);
    });

    function folderHeading(path: string): HTMLElement {
      const heading = document.createElement('div');
      heading.setAttribute('data-folder-dropzone', '');
      heading.setAttribute('data-folder-path', path);
      // Only a heading this panel drew counts as a target, so it has to live inside the host.
      fixture.nativeElement.append(heading);
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
      const goblin = putInShared('ゴブリン');
      component.selectTab.set('common');

      dragOnto(goblin, folderHeading('第1話/洞窟'));

      expect(goblin.folderName).toBe('第1話/洞窟');
    });

    it('takes a character dragged onto the unfiled heading out of its folder', () => {
      const goblin = putInShared('ゴブリン');
      goblin.folderName = '第1話';
      component.selectTab.set('common');

      dragOnto(goblin, folderHeading(''));

      expect(goblin.folderName).toBe('');
    });

    it('leaves a character dropped nowhere where it was', () => {
      const goblin = putInShared('ゴブリン');
      goblin.folderName = '第1話';
      component.selectTab.set('common');

      dragOnto(goblin, document.createElement('div'));

      expect(goblin.folderName).toBe('第1話');
    });

    it('carries the whole ticked selection along', () => {
      const goblin = putInShared('ゴブリン');
      const village = putInShared('村長');
      component.selectTab.set('common');
      component.isMultiMove.set(true);
      component.multiMoveTargets.set(new Set([goblin.identifier, village.identifier]));

      dragOnto(goblin, folderHeading('第1話'));

      expect(goblin.folderName).toBe('第1話');
      expect(village.folderName).toBe('第1話');
    });

    it('carries only what was grabbed when it is not part of the selection', () => {
      const goblin = putInShared('ゴブリン');
      const village = putInShared('村長');
      component.selectTab.set('common');
      component.isMultiMove.set(true);
      component.multiMoveTargets.set(new Set([village.identifier]));

      dragOnto(goblin, folderHeading('第1話'));

      expect(goblin.folderName).toBe('第1話');
      expect(village.folderName).toBe('');
    });

    it('refuses to file a character dragged on a tab that does not use folders', () => {
      const goblin = putOnTable('ゴブリン');

      dragOnto(goblin, folderHeading('第1話'));

      expect(goblin.folderName).toBe('');
    });

    describe('the pieces the inventory hides', () => {
      const originalCursor = PeerCursor.myCursor;

      function beGameMaster(): void {
        PeerCursor.myCursor = { role: PeerRole.GameMaster, identifier: 'gm-cursor' } as PeerCursor;
      }

      function bePlayer(): void {
        PeerCursor.myCursor = { role: PeerRole.Player, identifier: 'pl-cursor' } as PeerCursor;
      }

      function putHiddenOnTable(name: string): GameCharacter {
        const character = putOnTable(name);
        character.hideInventory = true;
        return character;
      }

      afterEach(() => {
        PeerCursor.myCursor = originalCursor;
      });

      it('keeps every piece until the master filters', () => {
        beGameMaster();
        putOnTable('村長');
        putHiddenOnTable('伏せた敵');

        expect(component.filteredRows()).toHaveLength(2);
        expect(component.isHiddenFiltered()).toBe(false);
      });

      it('narrows the list to what is hidden', () => {
        beGameMaster();
        putOnTable('村長');
        putHiddenOnTable('伏せた敵');
        component.hiddenFilter.set('only');

        expect(component.filteredRows().map((row) => row.object.name)).toEqual(['伏せた敵']);
        expect(component.isHiddenFiltered()).toBe(true);
      });

      it('drops what is hidden from the list', () => {
        beGameMaster();
        putOnTable('村長');
        putHiddenOnTable('伏せた敵');
        component.hiddenFilter.set('exclude');

        expect(component.filteredRows().map((row) => row.object.name)).toEqual(['村長']);
      });

      it('narrows on the search as well as on what is hidden', () => {
        beGameMaster();
        putHiddenOnTable('伏せた敵');
        putHiddenOnTable('伏せた罠');
        component.hiddenFilter.set('only');
        component.searchQuery.set('罠');

        expect(component.filteredRows().map((row) => row.object.name)).toEqual(['伏せた罠']);
      });

      it('leaves a player the whole list, whatever the filter is set to', () => {
        bePlayer();
        putOnTable('村長');
        component.hiddenFilter.set('only');

        expect(component.activeHiddenFilter()).toBe('all');
        expect(component.filteredRows().map((row) => row.object.name)).toEqual(['村長']);
      });

      it('darkens a hidden piece and lifts it again on request', () => {
        beGameMaster();
        const hidden = putHiddenOnTable('伏せた敵');
        const shown = putOnTable('村長');

        expect(component.isHiddenRowDimmed(hidden)).toBe(true);
        expect(component.isHiddenRowDimmed(shown)).toBe(false);

        component.toggleHiddenDisplay();

        expect(component.hiddenDisplay()).toBe('full');
        expect(component.isHiddenRowDimmed(hidden)).toBe(false);
      });
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
