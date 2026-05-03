import { TestBed } from '@angular/core/testing';
import { GameCharacter } from '@axe/domain/character/game-character';
import { ObjectChangeService } from '@axe/shared/sync/object-change.service';
import { TabletopService } from '@axe/shared/tabletop/tabletop.service';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

/**
 * インベントリからテーブルへのコマ移動時の反応性テスト。
 * setLocation('table') を呼んだとき、collectionOf('character') シグナルが
 * インクリメントされ、characters リストに反映されることを確認する。
 */
describe('TabletopService - location change reactivity', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...TEST_PROVIDERS, TabletopService],
    });
  });

  it('setLocation("table") で collectionOf("character") シグナルがインクリメントされる', async () => {
    const service = TestBed.inject(TabletopService);
    const objectChange = TestBed.inject(ObjectChangeService);

    // 'common' のキャラクターを作成
    const character = new GameCharacter();
    character.location.name = 'common';
    character.initialize();

    // objectAdded$ による初期インクリメントを待つ
    await new Promise((r) => setTimeout(r, 10));
    const vAfterAdd = objectChange.collectionOf('character')();

    // テーブルに表示されていないことを確認
    expect(service.characters).not.toContain(character);

    // テーブルに移動（setLocation 内部で markForChanged が呼ばれる）
    character.setLocation('table');
    await new Promise((r) => setTimeout(r, 10));

    const vAfterMove = objectChange.collectionOf('character')();

    // collectionOf('character') がインクリメントされている必要がある
    expect(vAfterMove).toBeGreaterThan(vAfterAdd);

    // characters リストにキャラクターが含まれている必要がある
    expect(service.characters).toContain(character);
  });

  it('setLocation("common") でテーブルから消える', async () => {
    const service = TestBed.inject(TabletopService);
    const objectChange = TestBed.inject(ObjectChangeService);

    // テーブル上のキャラクターを作成
    const character = new GameCharacter();
    character.location.name = 'table';
    character.initialize();

    // objectAdded$ による初期インクリメントを待つ
    await new Promise((r) => setTimeout(r, 10));

    // テーブルに表示されていることを確認
    expect(service.characters).toContain(character);

    const vBeforeRemove = objectChange.collectionOf('character')();

    // 共有に移動（setLocation 内部で markForChanged が呼ばれる）
    character.setLocation('common');
    await new Promise((r) => setTimeout(r, 10));

    const vAfterRemove = objectChange.collectionOf('character')();

    // collectionOf がインクリメントされている
    expect(vAfterRemove).toBeGreaterThan(vBeforeRemove);

    // characters リストから除外されている
    expect(service.characters).not.toContain(character);
  });
});
