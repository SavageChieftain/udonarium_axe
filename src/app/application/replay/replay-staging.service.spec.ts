import { TestBed } from '@angular/core/testing';
import { ReplayStagingService } from '@axe/application/replay/replay-staging.service';
import { setNetworkIsolated } from '@axe/core/network/network-isolation';
import { localDispatch } from '@axe/core/network/network-messaging';
import type { ObjectContext } from '@axe/core/sync/game-object';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { ReplayEventKind } from '@axe/domain/replay/replay-event';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

function context(identifier: string, aliasName: string, attributes: Record<string, unknown>): ObjectContext {
  return { identifier, aliasName, majorVersion: 1, minorVersion: 0.5, syncData: { value: '', attributes } };
}

function sendUpdate(identifier: string, attributes: Record<string, unknown>): void {
  localDispatch('UPDATE_GAME_OBJECT', context(identifier, 'character', attributes), 'peer-a');
}

describe('ReplayStagingService', () => {
  let service: ReplayStagingService;
  let objectStore: ObjectStore;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...TEST_PROVIDERS] });
    objectStore = TestBed.inject(ObjectStore);
    service = TestBed.inject(ReplayStagingService);

    const character = new GameCharacter('c1');
    character.location.x = 0;
    objectStore.add(character, false);
    setNetworkIsolated(true);
  });

  afterEach(() => {
    setNetworkIsolated(false);
    service.discard();
    for (const object of objectStore.getObjects()) objectStore.remove(object);
    objectStore.clearDeleteHistory();
  });

  it('収録していないうちは何も拾わないこと', () => {
    sendUpdate('c1', { location: { name: 'table', x: 50, y: 0 } });
    expect(service.captured()).toHaveLength(0);
  });

  it('卓の操作を差し込む行として拾うこと', () => {
    service.begin(2, 'alice');
    sendUpdate('c1', { location: { name: 'table', x: 50, y: 0 } });

    const [event] = service.captured();
    expect(event.kind).toBe(ReplayEventKind.ObjectMove);
    expect(event.actorId).toBe('alice');
    expect(event.patch?.identifier).toBe('c1');
  });

  it('続けざまの操作を 1 件に畳むこと', () => {
    service.begin(0, 'alice');
    for (let x = 10; x <= 50; x += 10) sendUpdate('c1', { location: { name: 'table', x, y: 0 } });

    expect(service.captured()).toHaveLength(1);
    expect(service.captured()[0].detail['to']).toMatchObject({ x: 50 });
  });

  it('合図も鳴らし直せる形で拾うこと', () => {
    service.begin(0, 'alice');
    localDispatch('SOUND_EFFECT', 'se-dice', 'peer-a');

    const [event] = service.captured();
    expect(event.kind).toBe(ReplayEventKind.MediaSoundEffect);
    expect(event.signal).toEqual({ name: 'SOUND_EFFECT', data: 'se-dice' });
  });

  it('雑音は拾わないこと', () => {
    service.begin(0, 'alice');
    localDispatch('CURSOR_MOVE', [1, 2, 3], 'peer-a');
    expect(service.captured()).toHaveLength(0);
  });

  it('隔離していないうちは拾わないこと', () => {
    setNetworkIsolated(false);
    service.begin(0, 'alice');
    sendUpdate('c1', { location: { name: 'table', x: 50, y: 0 } });
    expect(service.captured()).toHaveLength(0);
  });

  it('誰の操作として残すか付け替えられること', () => {
    service.begin(0, 'alice');
    sendUpdate('c1', { location: { name: 'table', x: 50, y: 0 } });
    service.setActorId('bob');

    expect(service.captured()[0].actorId).toBe('bob');
  });

  it('受け取ると収録を畳んで中身を返すこと', () => {
    service.begin(3, 'alice');
    sendUpdate('c1', { location: { name: 'table', x: 50, y: 0 } });

    expect(service.insertIndex()).toBe(3);
    const taken = service.take();
    expect(taken).toHaveLength(1);
    expect(service.isStaging()).toBe(false);
    expect(service.captured()).toHaveLength(0);
  });

  it('破棄すると中身を捨てること', () => {
    service.begin(0, 'alice');
    sendUpdate('c1', { location: { name: 'table', x: 50, y: 0 } });
    service.discard();

    expect(service.isStaging()).toBe(false);
    expect(service.captured()).toHaveLength(0);
  });

  it('収録を始めた時点の盤面を起点にすること', () => {
    const character = objectStore.get<GameCharacter>('c1')!;
    character.location.x = 200;
    service.begin(0, 'alice');
    localDispatch('UPDATE_GAME_OBJECT', character.toContext(), 'peer-a');

    expect(service.captured()).toHaveLength(0);
  });

  it('始めたあとの変化だけを拾うこと', () => {
    const character = objectStore.get<GameCharacter>('c1')!;
    service.begin(0, 'alice');
    localDispatch('UPDATE_GAME_OBJECT', character.toContext(), 'peer-a');
    expect(service.captured()).toHaveLength(0);

    character.location.x = 120;
    localDispatch('UPDATE_GAME_OBJECT', character.toContext(), 'peer-a');
    expect(service.captured()).toHaveLength(1);
    expect(service.captured()[0].detail['to']).toMatchObject({ x: 120 });
  });
});
