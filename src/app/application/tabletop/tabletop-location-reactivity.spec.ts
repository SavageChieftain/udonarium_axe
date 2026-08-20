import { TestBed } from '@angular/core/testing';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { TabletopService } from '@axe/application/tabletop/tabletop.service';
import { GameCharacter } from '@axe/domain/character/game-character';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';
import { waitFor } from '@axe/testing/wait-for';

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
    const collection = () => objectChange.collectionOf('character')();

    // make a character in the shared area
    const vBeforeAdd = collection();
    const character = new GameCharacter();
    character.location.name = 'common';
    character.initialize();

    await waitFor(() => collection() > vBeforeAdd, { description: 'the addition to bump the collection' });
    const vAfterAdd = collection();

    // confirm it is not on the table yet
    expect(service.characters).not.toContain(character);

    // move it onto the table, which marks it changed
    character.setLocation('table');
    await waitFor(() => service.characters.includes(character), { description: 'the piece to reach the table' });

    // the character collection must have bumped
    expect(collection()).toBeGreaterThan(vAfterAdd);
  });

  it('drops a piece from the table when it moves to the shared area', async () => {
    const service = TestBed.inject(TabletopService);
    const objectChange = TestBed.inject(ObjectChangeService);
    const collection = () => objectChange.collectionOf('character')();

    // make a character on the table
    const character = new GameCharacter();
    character.location.name = 'table';
    character.initialize();

    await waitFor(() => service.characters.includes(character), { description: 'the piece to reach the table' });
    const vBeforeRemove = collection();

    // move it to the shared area, which marks it changed
    character.setLocation('common');
    await waitFor(() => !service.characters.includes(character), { description: 'the piece to leave the table' });

    // the collection has bumped
    expect(collection()).toBeGreaterThan(vBeforeRemove);
  });
});
