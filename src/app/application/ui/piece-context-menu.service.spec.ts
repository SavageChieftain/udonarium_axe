import { TestBed } from '@angular/core/testing';
import { ContextMenuService } from '@axe/application/ui/context-menu.service';
import { PieceContextMenuService } from '@axe/application/ui/piece-context-menu.service';
import { SelectionSignalService } from '@axe/application/ui/selection-signal.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('PieceContextMenuService', () => {
  let service: PieceContextMenuService;
  let contextMenu: ContextMenuService;
  let selection: SelectionSignalService;

  const position = { x: 10, y: 20, z: 0 };

  function character(name: string): GameCharacter {
    return GameCharacter.create(name, 1, '');
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...TEST_PROVIDERS] });
    service = TestBed.inject(PieceContextMenuService);
    contextMenu = TestBed.inject(ContextMenuService);
    selection = TestBed.inject(SelectionSignalService);
  });

  afterEach(() => {
    selection.clearSelection();
    for (const object of ObjectStore.instance.getObjects()) ObjectStore.instance.remove(object);
    ObjectStore.instance.clearDeleteHistory();
  });

  it('1 つしか選んでいなければ何も出さないこと', () => {
    const open = vi.spyOn(contextMenu, 'open').mockReturnValue(undefined as never);
    const alone = character('斥候');
    selection.addSelection(alone.identifier, alone.aliasName);

    expect(service.openForSelection(alone, 50, position)).toBe(false);
    expect(open).not.toHaveBeenCalled();
  });

  it('まとめて選んでいるなら一括の操作を出すこと', () => {
    const open = vi.spyOn(contextMenu, 'open').mockReturnValue(undefined as never);
    const first = character('斥候');
    const second = character('斥候の相棒');
    selection.addSelection(first.identifier, first.aliasName);
    selection.addSelection(second.identifier, second.aliasName);

    expect(service.openForSelection(first, 50, position)).toBe(true);
    expect(open).toHaveBeenCalledOnce();
  });

  it('選ばれていない物を指したときは一括にしないこと', () => {
    // 選択の外を右クリックしたなら、指したその物の操作を見たいはず。
    const open = vi.spyOn(contextMenu, 'open').mockReturnValue(undefined as never);
    const first = character('斥候');
    const second = character('斥候の相棒');
    const outsider = character('通りすがり');
    selection.addSelection(first.identifier, first.aliasName);
    selection.addSelection(second.identifier, second.aliasName);

    expect(service.openForSelection(outsider, 50, position)).toBe(false);
    expect(open).not.toHaveBeenCalled();
  });
});
