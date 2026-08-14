import { TestBed } from '@angular/core/testing';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { TabletopService } from '@axe/application/tabletop/tabletop.service';
import { GameCharacter } from '@axe/domain/character/game-character';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

/**
 * Reactivity when a piece moves from an inventory onto the table.
 * Setting the location to the table must bump the character collection signal
 * so the list of characters follows.
 */
describe('TabletopService - location change reactivity', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...TEST_PROVIDERS, TabletopService],
    });
  });

  it('bumps the character collection when a piece moves onto the table', async () => {
    const service = TestBed.inject(TabletopService);
    const objectChange = TestBed.inject(ObjectChangeService);

    // make a character in the shared area
    const character = new GameCharacter();
    character.location.name = 'common';
    character.initialize();

    // wait for the bump the addition itself causes
    await new Promise((r) => setTimeout(r, 10));
    const vAfterAdd = objectChange.collectionOf('character')();

    // confirm it is not on the table yet
    expect(service.characters).not.toContain(character);

    // move it onto the table, which marks it changed
    character.setLocation('table');
    await new Promise((r) => setTimeout(r, 10));

    const vAfterMove = objectChange.collectionOf('character')();

    // the character collection must have bumped
    expect(vAfterMove).toBeGreaterThan(vAfterAdd);

    // and the list must now hold the character
    expect(service.characters).toContain(character);
  });

  it('drops a piece from the table when it moves to the shared area', async () => {
    const service = TestBed.inject(TabletopService);
    const objectChange = TestBed.inject(ObjectChangeService);

    // make a character on the table
    const character = new GameCharacter();
    character.location.name = 'table';
    character.initialize();

    // wait for the bump the addition itself causes
    await new Promise((r) => setTimeout(r, 10));

    // confirm it is on the table
    expect(service.characters).toContain(character);

    const vBeforeRemove = objectChange.collectionOf('character')();

    // move it to the shared area, which marks it changed
    character.setLocation('common');
    await new Promise((r) => setTimeout(r, 10));

    const vAfterRemove = objectChange.collectionOf('character')();

    // the collection has bumped
    expect(vAfterRemove).toBeGreaterThan(vBeforeRemove);

    // and the list no longer holds it
    expect(service.characters).not.toContain(character);
  });
});
