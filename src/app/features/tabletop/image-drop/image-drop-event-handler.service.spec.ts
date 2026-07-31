import { TestBed } from '@angular/core/testing';
import { RolePermissionService } from '@axe/application/permission/role-permission.service';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { TabletopActionService } from '@axe/application/tabletop/tabletop-action.service';
import { type ImageDroppedEvent } from '@axe/core/event/domain-events';
import { EventChannel } from '@axe/core/event/event-channel';
import { CoordinateService } from '@axe/core/input/coordinate.service';
import {
  ImageDropEventHandlerService,
  isTabletopDropTarget,
} from '@axe/features/tabletop/image-drop/image-drop-event-handler.service';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('isTabletopDropTarget', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('テーブル層の中の要素なら真', () => {
    document.body.innerHTML = '<div id="app-table-layer"><div id="piece"></div></div>';
    expect(isTabletopDropTarget(document.querySelector('#piece'))).toBe(true);
  });

  it('テーブル層そのものでも真', () => {
    document.body.innerHTML = '<div id="app-table-layer"></div>';
    expect(isTabletopDropTarget(document.querySelector('#app-table-layer'))).toBe(true);
  });

  it('テーブル層の外なら偽', () => {
    document.body.innerHTML = '<div id="panel"></div><div id="app-table-layer"></div>';
    expect(isTabletopDropTarget(document.querySelector('#panel'))).toBe(false);
  });

  it('要素が無ければ偽', () => {
    expect(isTabletopDropTarget(null)).toBe(false);
  });
});

describe('ImageDropEventHandlerService', () => {
  let imageDropped$: EventChannel<ImageDroppedEvent>;
  let createGameCharacterWith: ReturnType<typeof vi.fn>;
  let canEditTabletop: boolean;
  let dropTarget: Element | null;

  function setup(): void {
    TestBed.configureTestingModule({
      providers: [
        ...TEST_PROVIDERS,
        { provide: ObjectChangeService, useValue: { imageDropped$ } },
        { provide: TabletopActionService, useValue: { createGameCharacterWith } },
        { provide: CoordinateService, useValue: { calcTabletopLocalCoordinate: () => ({ x: 100, y: 200, z: 0 }) } },
        {
          provide: RolePermissionService,
          useValue: {
            get canEditTabletop() {
              return canEditTabletop;
            },
          },
        },
        ImageDropEventHandlerService,
      ],
    });
    TestBed.inject(ImageDropEventHandlerService);
  }

  function drop(fileName = 'ゴブリン.png'): void {
    imageDropped$.emit({ identifier: 'image-1', fileName, dropPoint: { x: 10, y: 20 } });
  }

  beforeEach(() => {
    imageDropped$ = new EventChannel<ImageDroppedEvent>();
    createGameCharacterWith = vi.fn();
    canEditTabletop = true;
    document.body.innerHTML = '<div id="app-table-layer"></div>';
    dropTarget = document.querySelector('#app-table-layer');
    vi.spyOn(document, 'elementFromPoint').mockImplementation(() => dropTarget);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('盤面に落とすとファイル名を名前にしたキャラクターを作る', () => {
    setup();
    drop();

    expect(createGameCharacterWith).toHaveBeenCalledWith({ x: 100, y: 200, z: 0 }, 'ゴブリン', 'image-1');
  });

  it('盤面の外に落としたら何も作らない', () => {
    document.body.innerHTML = '<div id="panel"></div>';
    dropTarget = document.querySelector('#panel');
    setup();
    drop();

    expect(createGameCharacterWith).not.toHaveBeenCalled();
  });

  it('編集権限がなければ何も作らない', () => {
    canEditTabletop = false;
    setup();
    drop();

    expect(createGameCharacterWith).not.toHaveBeenCalled();
  });

  it('落とした先が取れないときは何も作らない', () => {
    dropTarget = null;
    setup();
    drop();

    expect(createGameCharacterWith).not.toHaveBeenCalled();
  });
});
