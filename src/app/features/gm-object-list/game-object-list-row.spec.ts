import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';
import {
  buildObjectRow,
  matchesObjectRowQuery,
  resolveObjectImageUrl,
  resolveRangeThumbnail,
} from '@axe/features/gm-object-list/game-object-list-row';

const makeObject = (props: Record<string, unknown>): TabletopObject =>
  ({
    identifier: 'id-1',
    name: 'Goblin',
    location: { name: 'table', x: 0, y: 0 },
    ...props,
  }) as unknown as TabletopObject;

const noPeer = () => null;

describe('buildObjectRow', () => {
  it('counts an object on the board as on the table', () => {
    const row = buildObjectRow(makeObject({}), 'character', noPeer);
    expect(row.locationKind).toBe('table');
    expect(row.surface).toBe('floor');
    expect(row.name).toBe('Goblin');
  });

  it('counts the graveyard and the shared places', () => {
    expect(buildObjectRow(makeObject({ location: { name: 'graveyard' } }), 'card', noPeer).locationKind).toBe(
      'graveyard'
    );
    expect(buildObjectRow(makeObject({ location: { name: 'common' } }), 'card', noPeer).locationKind).toBe('common');
  });

  it('counts it as somebodys own once the peer resolves, and notes the name', () => {
    const row = buildObjectRow(makeObject({ location: { name: 'peer-xyz' } }), 'character', () => 'Alice');
    expect(row.locationKind).toBe('personal');
    expect(row.locationDetail).toBe('Alice');
  });

  it('counts a place it does not know as somewhere else', () => {
    expect(buildObjectRow(makeObject({ location: { name: 'stack-1' } }), 'card', noPeer).locationKind).toBe('other');
  });

  it('marks only the types that carry a disclosure setting as disclosable', () => {
    const owned = buildObjectRow(makeObject({ disclosureMode: 'gm', disclosureUserIds: [] }), 'character', noPeer);
    expect(owned.disclosable).toBe(true);
    expect(owned.disclosureMode).toBe('gm');

    const terrain = buildObjectRow(makeObject({ isLocked: true }), 'terrain', noPeer);
    expect(terrain.disclosable).toBe(false);
    expect(terrain.disclosureMode).toBe('');
  });

  it('reads the lock of terrain off its own field and everything else off theirs', () => {
    expect(buildObjectRow(makeObject({ isLocked: true }), 'terrain', noPeer).isLock).toBe(true);
    expect(buildObjectRow(makeObject({ isLock: true }), 'card', noPeer).isLock).toBe(true);
  });

  it('reads hiding from the list as hidden', () => {
    expect(buildObjectRow(makeObject({ hideInventory: true }), 'character', noPeer).isHidden).toBe(true);
    expect(buildObjectRow(makeObject({}), 'character', noPeer).isHidden).toBe(false);
  });

  it('takes the picture from whatever suits the kind', () => {
    const row = buildObjectRow(makeObject({ imageFile: { url: 'token.png' } }), 'character', noPeer);
    expect(row.imageUrl).toBe('token.png');
  });
});

describe('resolveObjectImageUrl', () => {
  it('takes a characters piece picture', () => {
    expect(resolveObjectImageUrl(makeObject({ imageFile: { url: 'token.png' } }), 'character')).toBe('token.png');
  });

  it('takes the face of a card rather than its back', () => {
    const card = makeObject({ frontImage: { url: 'front.png' }, imageFile: { url: 'back.png' } });
    expect(resolveObjectImageUrl(card, 'card')).toBe('front.png');
  });

  it('takes the wall of terrain that has one and the floor otherwise', () => {
    expect(
      resolveObjectImageUrl(
        makeObject({ hasWall: true, wallImage: { url: 'w.png' }, floorImage: { url: 'f.png' } }),
        'terrain'
      )
    ).toBe('w.png');
    expect(
      resolveObjectImageUrl(makeObject({ hasWall: false, wallImage: null, floorImage: { url: 'f.png' } }), 'terrain')
    ).toBe('f.png');
  });

  it('returns nothing for another kind or no picture at all', () => {
    expect(resolveObjectImageUrl(makeObject({ imageFile: { url: 'x.png' } }), 'text-note')).toBe('');
    expect(resolveObjectImageUrl(makeObject({}), 'character')).toBe('');
  });
});

describe('resolveRangeThumbnail', () => {
  it('returns a thumbnail for a custom shape that has a pattern', () => {
    const range = makeObject({
      type: 'CUSTOM',
      cellPattern: '0,0;1,0;0,1',
      customGridType: 'square',
      gridColor: '#FF0000',
      rangeColor: '#000000',
    });
    const thumb = resolveRangeThumbnail(range);
    expect(thumb).not.toBeNull();
    expect(thumb!.cells.length).toBe(3);
    expect(thumb!.gridColor).toBe('#FF0000');
  });

  it('returns nothing for a built-in shape or one without', () => {
    expect(resolveRangeThumbnail(makeObject({ type: 'CORN' }))).toBeNull();
    expect(resolveRangeThumbnail(makeObject({ type: 'CUSTOM', cellPattern: '' }))).toBeNull();
  });
});

describe('matchesObjectRowQuery', () => {
  const row = buildObjectRow(makeObject({ name: 'Goblin', ownerName: 'Alice', hasOwner: true }), 'character', noPeer);

  it('matches everything for an empty search', () => {
    expect(matchesObjectRowQuery(row, '')).toBe(true);
  });

  it('matches part of a name or an owner, whatever the case', () => {
    expect(matchesObjectRowQuery(row, 'gob')).toBe(true);
    expect(matchesObjectRowQuery(row, 'ALICE')).toBe(true);
    expect(matchesObjectRowQuery(row, 'dragon')).toBe(false);
  });
});
