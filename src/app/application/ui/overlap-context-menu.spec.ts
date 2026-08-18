import { TranslateFn } from '@axe/application/i18n/translate.token';
import { buildOverlapContextMenu } from '@axe/application/ui/overlap-context-menu';
import { TabletopOverlapService } from '@axe/application/ui/tabletop-overlap.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';
import { Terrain } from '@axe/domain/tabletop/terrain';

describe('buildOverlapContextMenu', () => {
  const t: TranslateFn = (key: string) => key;

  function overlapService(found: TabletopObject[]): TabletopOverlapService {
    return { findAt: () => found } as unknown as TabletopOverlapService;
  }

  function makeCharacter(name: string): GameCharacter {
    const character = GameCharacter.create(name, 1, '');
    character.location.name = 'table';
    return character;
  }

  afterEach(() => {
    for (const object of ObjectStore.instance.getObjects()) ObjectStore.instance.delete(object, false);
    ObjectStore.instance.clearDeleteHistory();
  });

  it('offers nothing where the piece stands on its own', () => {
    const character = makeCharacter('ひとり');

    expect(buildOverlapContextMenu(overlapService([character]), character, 10, 10, t)).toEqual([]);
  });

  it('lists what is under the pointer, and offers to reorder the stack', () => {
    const character = makeCharacter('うえ');
    const other = makeCharacter('した');

    const menu = buildOverlapContextMenu(overlapService([character, other]), character, 10, 10, t);

    expect(menu.map((entry) => entry.name)).toEqual([
      'feature.tabletop.contextMenu.overlapBelow',
      'feature.tabletop.contextMenu.moveToTopmost',
      'feature.tabletop.contextMenu.moveToBottommost',
    ]);
  });

  it('sends the piece over and under the one it overlaps', () => {
    const character = makeCharacter('うえ');
    const other = makeCharacter('した');
    character.zindex = 0;
    other.zindex = 5;

    const menu = buildOverlapContextMenu(overlapService([character, other]), character, 10, 10, t);
    menu.find((entry) => entry.name.endsWith('moveToTopmost'))?.action?.();
    expect(character.zindex).toBe(6);

    menu.find((entry) => entry.name.endsWith('moveToBottommost'))?.action?.();
    expect(character.zindex).toBe(4);
  });

  it('leaves the reordering off a piece that has no place in a stack', () => {
    // Terrain is laid out by its own footprint, so there is no order to give it.
    const terrain = Terrain.create('壁', 1, 1, 1, '', '');
    terrain.location.name = 'table';
    const character = makeCharacter('コマ');

    const menu = buildOverlapContextMenu(overlapService([terrain, character]), terrain, 10, 10, t);

    expect(menu.map((entry) => entry.name)).toEqual(['feature.tabletop.contextMenu.overlapBelow']);
  });
});
