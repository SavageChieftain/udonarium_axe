import { TestBed } from '@angular/core/testing';
import { MovableLike, MultiMovableService } from '@axe/application/ui/multi-movable.service';
import { SelectionSignalService } from '@axe/application/ui/selection-signal.service';
import { makeFakeTabletopObject } from '@axe/testing/factories/tabletop-object.factory';

function makeMovable(opts: { id: string; x?: number; y?: number; isLock?: boolean }): MovableLike {
  const obj = makeFakeTabletopObject({ identifier: opts.id, isLock: opts.isLock ?? false });
  return {
    identifier: opts.id,
    tabletopObject: obj,
    posX: opts.x ?? 0,
    posY: opts.y ?? 0,
  };
}

describe('MultiMovableService', () => {
  let service: MultiMovableService;
  let selection: SelectionSignalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MultiMovableService);
    selection = TestBed.inject(SelectionSignalService);
  });

  it('leader が選択集合に含まれない場合は beginDrag が false を返す', () => {
    const leader = makeMovable({ id: 'leader' });
    service.register(leader);
    expect(service.beginDrag(leader)).toBe(false);
  });

  it('選択中の follower にも leader と同じ delta を適用する', () => {
    const leader = makeMovable({ id: 'a', x: 100, y: 100 });
    const follower = makeMovable({ id: 'b', x: 200, y: 300 });
    service.register(leader);
    service.register(follower);
    selection.replaceSelection(['a', 'b']);

    expect(service.beginDrag(leader)).toBe(true);

    leader.posX = 150;
    leader.posY = 120;
    service.applyLeaderDelta(leader);

    expect(follower.posX).toBe(250);
    expect(follower.posY).toBe(320);
  });

  it('ロック中の follower はスキップする', () => {
    const leader = makeMovable({ id: 'a', x: 0, y: 0 });
    const locked = makeMovable({ id: 'b', x: 100, y: 100, isLock: true });
    const free = makeMovable({ id: 'c', x: 200, y: 200 });
    service.register(leader);
    service.register(locked);
    service.register(free);
    selection.replaceSelection(['a', 'b', 'c']);

    service.beginDrag(leader);
    leader.posX = 30;
    leader.posY = 40;
    service.applyLeaderDelta(leader);

    expect(locked.posX).toBe(100);
    expect(locked.posY).toBe(100);
    expect(free.posX).toBe(230);
    expect(free.posY).toBe(240);
  });

  it('endDrag 後は applyLeaderDelta が follower を動かさない', () => {
    const leader = makeMovable({ id: 'a' });
    const follower = makeMovable({ id: 'b' });
    service.register(leader);
    service.register(follower);
    selection.replaceSelection(['a', 'b']);

    service.beginDrag(leader);
    service.endDrag(leader);

    leader.posX = 999;
    service.applyLeaderDelta(leader);
    expect(follower.posX).toBe(0);
  });

  it('followerTabletopObjectsFor は drag 中の leader に対して follower の tabletopObject を返す', () => {
    const leader = makeMovable({ id: 'leader' });
    const f1 = makeMovable({ id: 'f1' });
    const f2 = makeMovable({ id: 'f2' });
    service.register(leader);
    service.register(f1);
    service.register(f2);
    selection.replaceSelection(['leader', 'f1', 'f2']);

    service.beginDrag(leader);
    const followers = service.followerTabletopObjectsFor('leader');
    expect(followers.map((o) => o.identifier)).toEqual(['f1', 'f2']);
  });

  it('followerTabletopObjectsFor は別 leader / drag 終了後は空配列を返す', () => {
    const leader = makeMovable({ id: 'leader' });
    const f1 = makeMovable({ id: 'f1' });
    service.register(leader);
    service.register(f1);
    selection.replaceSelection(['leader', 'f1']);
    service.beginDrag(leader);

    expect(service.followerTabletopObjectsFor('other')).toEqual([]);
    service.endDrag(leader);
    expect(service.followerTabletopObjectsFor('leader')).toEqual([]);
  });

  it('unregister された follower は追従しない', () => {
    const leader = makeMovable({ id: 'a' });
    const follower = makeMovable({ id: 'b', x: 10, y: 10 });
    service.register(leader);
    service.register(follower);
    selection.replaceSelection(['a', 'b']);
    service.beginDrag(leader);

    service.unregister(follower);
    leader.posX = 100;
    service.applyLeaderDelta(leader);
    expect(follower.posX).toBe(10);
  });
});
