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
  it('卓上のオブジェクトを table と判定する', () => {
    const row = buildObjectRow(makeObject({}), 'character', noPeer);
    expect(row.locationKind).toBe('table');
    expect(row.surface).toBe('floor');
    expect(row.name).toBe('Goblin');
  });

  it('墓場・共通を判定する', () => {
    expect(buildObjectRow(makeObject({ location: { name: 'graveyard' } }), 'card', noPeer).locationKind).toBe(
      'graveyard'
    );
    expect(buildObjectRow(makeObject({ location: { name: 'common' } }), 'card', noPeer).locationKind).toBe('common');
  });

  it('peer 名が解決できれば personal とし、名前を locationDetail に入れる', () => {
    const row = buildObjectRow(makeObject({ location: { name: 'peer-xyz' } }), 'character', () => 'Alice');
    expect(row.locationKind).toBe('personal');
    expect(row.locationDetail).toBe('Alice');
  });

  it('未知の location.name は other とする', () => {
    expect(buildObjectRow(makeObject({ location: { name: 'stack-1' } }), 'card', noPeer).locationKind).toBe('other');
  });

  it('disclosureMode を持つ型のみ disclosable=true で正規化する', () => {
    const owned = buildObjectRow(makeObject({ disclosureMode: 'gm', disclosureUserIds: [] }), 'character', noPeer);
    expect(owned.disclosable).toBe(true);
    expect(owned.disclosureMode).toBe('gm');

    const terrain = buildObjectRow(makeObject({ isLocked: true }), 'terrain', noPeer);
    expect(terrain.disclosable).toBe(false);
    expect(terrain.disclosureMode).toBe('');
  });

  it('terrain は isLocked を、他は isLock をロック状態として読む', () => {
    expect(buildObjectRow(makeObject({ isLocked: true }), 'terrain', noPeer).isLock).toBe(true);
    expect(buildObjectRow(makeObject({ isLock: true }), 'card', noPeer).isLock).toBe(true);
  });

  it('hideInventory を隠し状態として読む', () => {
    expect(buildObjectRow(makeObject({ hideInventory: true }), 'character', noPeer).isHidden).toBe(true);
    expect(buildObjectRow(makeObject({}), 'character', noPeer).isHidden).toBe(false);
  });

  it('imageUrl を種別ごとの画像から設定する', () => {
    const row = buildObjectRow(makeObject({ imageFile: { url: 'token.png' } }), 'character', noPeer);
    expect(row.imageUrl).toBe('token.png');
  });
});

describe('resolveObjectImageUrl', () => {
  it('character はコマ画像 (imageFile) を使う', () => {
    expect(resolveObjectImageUrl(makeObject({ imageFile: { url: 'token.png' } }), 'character')).toBe('token.png');
  });

  it('card は中身 (frontImage) を使い、裏面 (imageFile) は使わない', () => {
    const card = makeObject({ frontImage: { url: 'front.png' }, imageFile: { url: 'back.png' } });
    expect(resolveObjectImageUrl(card, 'card')).toBe('front.png');
  });

  it('terrain は壁ありなら wallImage、なければ floorImage を使う', () => {
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

  it('対象外の種別や画像未設定は空文字を返す', () => {
    expect(resolveObjectImageUrl(makeObject({ imageFile: { url: 'x.png' } }), 'text-note')).toBe('');
    expect(resolveObjectImageUrl(makeObject({}), 'character')).toBe('');
  });
});

describe('resolveRangeThumbnail', () => {
  it('type=CUSTOM かつ cellPattern があれば形状サムネイルを返す', () => {
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

  it('組み込み型(CORN 等)や cellPattern 無しは null', () => {
    expect(resolveRangeThumbnail(makeObject({ type: 'CORN' }))).toBeNull();
    expect(resolveRangeThumbnail(makeObject({ type: 'CUSTOM', cellPattern: '' }))).toBeNull();
  });
});

describe('matchesObjectRowQuery', () => {
  const row = buildObjectRow(makeObject({ name: 'Goblin', ownerName: 'Alice', hasOwner: true }), 'character', noPeer);

  it('空クエリは常に一致する', () => {
    expect(matchesObjectRowQuery(row, '')).toBe(true);
  });

  it('名前・オーナー名の部分一致（大文字小文字無視）で一致する', () => {
    expect(matchesObjectRowQuery(row, 'gob')).toBe(true);
    expect(matchesObjectRowQuery(row, 'ALICE')).toBe(true);
    expect(matchesObjectRowQuery(row, 'dragon')).toBe(false);
  });
});
