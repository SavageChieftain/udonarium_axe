import { inject, TestBed } from '@angular/core/testing';
import { TabletopService } from '@axe/application/tabletop/tabletop.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameTable } from '@axe/domain/tabletop/game-table';
import { TableSelecter } from '@axe/domain/tabletop/table-selecter';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('TabletopService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...TEST_PROVIDERS, TabletopService],
    });
  });

  it('should be created', inject([TabletopService], (service: TabletopService) => {
    expect(service).toBeTruthy();
  }));

  describe('currentTableVersion', () => {
    let table: GameTable;

    beforeEach(() => {
      table = new GameTable();
      table.initialize();
      TableSelecter.instance.viewTableIdentifier = table.identifier;
    });

    afterEach(() => {
      ObjectStore.instance.remove(table);
    });

    /**
     * 返すのは毎回同じ GameTable なので、既定の同値判定では版が上がっても下流へ伝わらない。
     * 一度読んだあとに変えた値が画面へ出ないという形で表に出る。
     */
    it('テーブルの値を変えたら派生した値も追いつくこと', async () => {
      const service = TestBed.inject(TabletopService);
      expect(service.gridSize()).toBe(table.gridSize);
      expect(service.mode2d()).toBe(false);

      table.gridSize = 77;
      table.mode2d = true;
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(service.gridSize()).toBe(77);
      expect(service.mode2d()).toBe(true);
    });
  });
});
